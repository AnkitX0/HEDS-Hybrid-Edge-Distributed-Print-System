import os
import io
import time
import uuid
import httpx
import pypdf

BASE_URL = "http://localhost:8000"
SHOP_SLUG = "campus-xerox"

def run_e2e_test():
    print("=" * 60)
    print("HEDS LIVE E2E FULL SYSTEM VERIFICATION")
    print("=" * 60)

    # 1. Check shop lookup from QR storefront
    print("\n[Step 1] Querying Shop Storefront for slug:", SHOP_SLUG)
    r = httpx.get(f"{BASE_URL}/api/v1/shops/{SHOP_SLUG}")
    assert r.status_code == 200, f"Shop lookup failed: {r.text}"
    shop_data = r.json()
    shop_id = shop_data["id"]
    print(f"-> Shop resolved: {shop_data['name']} (ID: {shop_id})")

    # 2. Upload multiple files (PDF + PNG)
    print("\n[Step 2] Multi-file document upload...")
    # Generate in-memory PDF (2 pages)
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=595.28, height=841.89)
    writer.add_blank_page(width=595.28, height=841.89)
    pdf_bytes = io.BytesIO()
    writer.write(pdf_bytes)
    pdf_bytes.seek(0)

    # Valid in-memory PNG using Pillow
    from PIL import Image
    img = Image.new("RGB", (200, 200), color="white")
    png_bytes = io.BytesIO()
    img.save(png_bytes, format="PNG")
    png_bytes.seek(0)

    files = [
        ("files", ("syllabus.pdf", pdf_bytes.getvalue(), "application/pdf")),
        ("files", ("diagram.png", png_bytes.getvalue(), "image/png")),
    ]
    r = httpx.post(f"{BASE_URL}/api/v1/shops/{SHOP_SLUG}/documents/upload-multiple", files=files)
    assert r.status_code == 200, f"Upload failed: {r.text}"
    upload_res = r.json()
    doc_id = upload_res["document_id"]
    total_pages = upload_res["total_pages"]
    print(f"-> Upload success! Combined Document ID: {doc_id}, Server authoritative page count: {total_pages}")
    assert total_pages == 3, f"Expected 3 pages (2 from PDF + 1 from PNG), got {total_pages}"

    # 3. Create Order with Print Specifications
    print("\n[Step 3] Submitting Order with print configuration...")
    order_payload = {
        "document_id": doc_id,
        "copies": 1,
        "color_mode": "BW",
        "duplex": "true",
        "paper_size": "A4",
        "page_range": "all",
    }
    r = httpx.post(f"{BASE_URL}/api/v1/shops/{SHOP_SLUG}/orders", data=order_payload)
    assert r.status_code in (200, 201), f"Order creation failed: {r.text}"
    order_data = r.json()
    order_id = order_data["id"]
    order_num = order_data["order_number"]
    guest_token = order_data["guest_access_token"]
    total_amount = order_data["total_amount_cents"]
    print(f"-> Order created! Order: {order_num} (ID: {order_id})")
    print(f"-> Authoritative server price: ₹{total_amount / 100:.2f} ({total_amount} cents)")
    print(f"-> Guest tracking token: {guest_token}")

    # 4. Mock Payment Processing
    print("\n[Step 4] Processing payment...")
    pay_payload = {
        "simulate_status": "success",
    }
    r = httpx.post(f"{BASE_URL}/api/v1/orders/{guest_token}/payment", json=pay_payload)
    assert r.status_code == 200, f"Payment failed: {r.text}"
    pay_res = r.json()
    print(f"-> Payment processed: status={pay_res['status']}, gateway={pay_res['gateway']}")

    # 5. Live Tracking Check
    print("\n[Step 5] Checking live tracking using guest token...")
    r = httpx.get(f"{BASE_URL}/api/v1/orders/{guest_token}")
    assert r.status_code == 200, f"Tracking failed: {r.text}"
    tracking_data = r.json()
    print(f"-> Order status: {tracking_data['status']}")

    # 6. Wait for Edge Agent to Poll, Claim, Print, and Complete Job
    print("\n[Step 6] Waiting for outbound Edge Agent to claim, print, and mark ready...")
    ready = False
    for i in range(15):
        time.sleep(2)
        r = httpx.get(f"{BASE_URL}/api/v1/orders/{guest_token}")
        state = r.json()["status"]
        print(f"   [Polling {i+1}] Current order state: {state}")
        if state in ("READY_FOR_PICKUP", "PICKUP_READY"):
            ready = True
            break

    assert ready, f"Order did not transition to READY_FOR_PICKUP in time! Final state: {state}"
    print(f"-> Order is now READY_FOR_PICKUP! Pickup Token / Order: {order_num}")

    # 7. Check Receipt JSON & PDF download
    print("\n[Step 7] Checking Receipt JSON and Receipt PDF generation...")
    r = httpx.get(f"{BASE_URL}/api/v1/orders/{guest_token}/receipt")
    assert r.status_code == 200, f"Receipt JSON failed: {r.text}"
    receipt = r.json()
    print(f"-> Receipt JSON verified: Order {receipt['order_number']}, Total ₹{receipt['total_amount_cents'] / 100:.2f}")

    r = httpx.get(f"{BASE_URL}/api/v1/orders/{guest_token}/receipt.pdf")
    assert r.status_code == 200, f"Receipt PDF failed: {r.text}"
    assert r.headers.get("content-type") == "application/pdf"
    assert len(r.content) > 500, "Receipt PDF content too small"
    print(f"-> Receipt PDF successfully downloaded! ({len(r.content)} bytes, Valid PDF header: {r.content[:4]})")

    # 8. Operator Dashboard Login & Pickup
    print("\n[Step 8] Operator Login to Shop Dashboard...")
    login_payload = {
        "email": "operator@campus-xerox.local",
        "password": "operator123",
    }
    r = httpx.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload)
    assert r.status_code == 200, f"Operator login failed: {r.text}"
    token = r.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("-> Operator authenticated successfully.")

    # 9. Find Order in Ready Pickups
    print("\n[Step 9] Inspecting Ready Pickups list...")
    r = httpx.get(f"{BASE_URL}/api/v1/pickups", headers=auth_headers)
    assert r.status_code == 200, f"Get pickups failed: {r.text}"
    pickups = r.json()
    matched = [p for p in pickups if p["order_id"] == order_id or p.get("order_number") == order_num]
    assert len(matched) > 0, f"Order {order_num} not found in active pickups list!"
    pickup_id = matched[0]["id"]
    print(f"-> Pickup record found (ID: {pickup_id}) for Token/Order: {order_num}")

    # 10. Mark Collected (Token-Only Pickup)
    print("\n[Step 10] Operator marking order as COLLECTED (Token-only)...")
    confirm_payload = {
        "pickup_id": pickup_id,
        "token": order_num,
    }
    r = httpx.post(f"{BASE_URL}/api/v1/pickups/confirm", json=confirm_payload, headers=auth_headers)
    assert r.status_code == 200, f"Pickup confirm failed: {r.text}"
    confirm_res = r.json()
    print(f"-> Pickup result: {confirm_res}")

    # 11. Verify Order is COMPLETED
    print("\n[Step 11] Verifying final Order status is COMPLETED...")
    r = httpx.get(f"{BASE_URL}/api/v1/orders/{guest_token}")
    final_order = r.json()
    assert final_order["status"] == "COMPLETED", f"Expected COMPLETED, got {final_order['status']}"
    print("-> Order verified in COMPLETED state!")

    # 12. Test Duplicate Collection Protection (Idempotency)
    print("\n[Step 12] Testing Duplicate Collection Protection...")
    r = httpx.post(f"{BASE_URL}/api/v1/pickups/confirm", json=confirm_payload, headers=auth_headers)
    assert r.status_code == 200, f"Duplicate collection request error: {r.text}"
    dup_res = r.json()
    assert dup_res.get("status") in ("ALREADY_COMPLETED", "COMPLETED"), f"Unexpected duplicate response: {dup_res}"
    print(f"-> Duplicate collection protected idempotently! Response: {dup_res}")

    # 13. Verify Audit Logs
    print("\n[Step 13] Verifying Audit Logs for Pickup Collection...")
    r = httpx.get(f"{BASE_URL}/api/v1/shop/audit-logs", headers=auth_headers)
    assert r.status_code == 200, f"Audit logs failed: {r.text}"
    logs = r.json()
    pickup_audit = [l for l in logs if l.get("action") in ("ORDER_TRANSITION_COMPLETED", "ORDER_PICKUP_CONFIRMED") and l.get("resource_id") == str(order_id)]
    assert len(pickup_audit) > 0, "Audit event for order completion not found!"
    print(f"-> Verified Audit Log: {pickup_audit[0]['action']} recorded at {pickup_audit[0]['created_at']}")

    print("\n" + "=" * 60)
    print("ALL 13 LIVE E2E LIFECYCLE STEPS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_test()
