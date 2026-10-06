import os
import shutil
import io
import uuid
from typing import BinaryIO
from pathlib import Path
from minio import Minio
from minio.error import S3Error

from app.core.config import settings
from app.core.logging import logger


class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        if self.backend == "local":
            self.local_dir = Path(settings.STORAGE_LOCAL_DIR)
            self.local_dir.mkdir(parents=True, exist_ok=True)
        elif self.backend in ("minio", "s3"):
            self.minio_client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
            # Ensure bucket exists
            try:
                if not self.minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
                    self.minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
            except Exception as e:
                logger.warning(f"Failed to check/create MinIO bucket: {e}. Falling back to local storage.")
                self.backend = "local"
                self.local_dir = Path(settings.STORAGE_LOCAL_DIR)
                self.local_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file_obj: BinaryIO, filename: str, content_type: str) -> str:
        """
        Save file to private storage and return storage key/path.
        File is NOT publicly accessible.
        """
        ext = os.path.splitext(filename)[1].lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"

        if self.backend == "local":
            target_path = self.local_dir / unique_name
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file_obj, buffer)
            return str(target_path.resolve())
        else:
            file_obj.seek(0, os.SEEK_END)
            size = file_obj.tell()
            file_obj.seek(0)
            self.minio_client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=unique_name,
                data=file_obj,
                length=size,
                content_type=content_type,
            )
            return unique_name

    def get_file_stream(self, storage_path: str) -> BinaryIO:
        """Retrieve file binary stream for agent download or inspection"""
        if self.backend == "local" or os.path.exists(storage_path):
            return open(storage_path, "rb")
        else:
            response = self.minio_client.get_object(settings.MINIO_BUCKET_NAME, storage_path)
            return io.BytesIO(response.read())

    def delete_file(self, storage_path: str) -> bool:
        """Enforce document retention cleanup"""
        try:
            if self.backend == "local" or os.path.exists(storage_path):
                if os.path.exists(storage_path):
                    os.remove(storage_path)
                return True
            else:
                self.minio_client.remove_object(settings.MINIO_BUCKET_NAME, storage_path)
                return True
        except Exception as e:
            logger.error(f"Error deleting file {storage_path}: {e}")
            return False


storage_service = StorageService()
