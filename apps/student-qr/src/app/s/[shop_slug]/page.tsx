"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  Layers,
  AlertCircle,
  CreditCard,
  Trash2,
  CheckCircle2,
  HelpCircle,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api/client";

interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_queue_paused: boolean;
  queue_length: number;
  estimated_wait_minutes: number;
  pricing: {
    bw_per_page_cents: number;
    color_per_page_cents: number;
    duplex_discount_cents: number;
    minimum_order_cents: number;
    paper_size: string;
  };
}

interface UploadResponse {
  document_id: string;
  filename: string;
  file_size_bytes: number;
  page_count: number;
}

interface QuoteResponse {
  document_page_count: number;
  active_pages: number;
  copies: number;
  color_mode: string;
  duplex: boolean;
  final_amount_cents: number;
  formatted_total: string;
  currency: string;
}

export default function ShopStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print Configuration State & Multi-File State
  interface DocItem {
    id: string;
    filename: string;
    page_count: number;
    file_size_bytes: number;
    mime_type?: string;
    error?: string;
  }

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [totalPageCount, setTotalPageCount] = useState<number>(0);

  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRangeMode, setPageRangeMode] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  // Loading & Flow State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState<boolean>(false);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  // Authoritative Pricing Quote
  const [authoritativeQuote, setAuthoritativeQuote] = useState<QuoteResponse | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState<boolean>(false);

  // Fetch Shop Metadata
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      return apiClient.get<ShopInfo>(`/api/v1/shops/${shopSlug}`);
    },
    refetchInterval: 10000,
  });

  // Calculate authoritative quote whenever config or document changes
  useEffect(() => {
    if (!documentId || !shop) return;

    let isMounted = true;
    const fetchQuote = async () => {
      setIsCalculatingPrice(true);
      try {
        const payload = {
          document_id: documentId,
          copies: copies,
          color_mode: colorMode,
          duplex: duplex,
          paper_size: paperSize,
          page_range: pageRangeMode === "custom" && customPageRange.trim() ? customPageRange.trim() : "all",
        };
        const quote = await apiClient.post<QuoteResponse>(
          `/api/v1/shops/${shopSlug}/pricing/quote`,
          payload
        );
        if (isMounted) {
          setAuthoritativeQuote(quote);
          setErrorMessage(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || "Could not calculate authoritative price.");
        }
      } finally {
        if (isMounted) setIsCalculatingPrice(false);
      }
    };

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [shopSlug, documentId, copies, colorMode, duplex, paperSize, pageRangeMode, customPageRange, shop]);

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const uploadFilesToServer = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) {
      setDocuments([]);
      setDocumentId(null);
      setTotalPageCount(0);
      setAuthoritativeQuote(null);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      filesToUpload.forEach((f) => {
        formData.append("files", f);
      });

      const res = await apiClient.upload<any>(
        `/api/v1/shops/${shopSlug}/documents/upload-multiple`,
        formData
      );

      setDocumentId(res.document_id);
      setTotalPageCount(res.total_pages);
      const docItems: DocItem[] = (res.documents || []).map((d: any, idx: number) => ({
        id: `${d.filename}-${idx}`,
        filename: d.filename,
        page_count: d.page_count,
        file_size_bytes: d.file_size_bytes,
        mime_type: d.mime_type,
      }));
      setDocuments(docItems);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to process uploaded documents. Please check file formats.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesSelect = async (newFiles: FileList | File[]) => {
    const allowedExts = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"];
    const fileArray = Array.from(newFiles);

    // Limit check: max 10 files
    const combined = [...selectedFiles, ...fileArray];
    if (combined.length > 10) {
      setErrorMessage("Maximum 10 files allowed. Please select fewer documents.");
      return;
    }

    // Filter invalid extensions
    const validFiles: File[] = [];
    let hasInvalid = false;
    let totalSize = 0;

    for (const f of combined) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!ext || !allowedExts.includes(ext)) {
        hasInvalid = true;
        continue;
      }
      if (f.size > 50 * 1024 * 1024) {
        setErrorMessage(`File '${f.name}' exceeds the 50MB individual file limit.`);
        return;
      }
      totalSize += f.size;
      validFiles.push(f);
    }

    if (totalSize > 100 * 1024 * 1024) {
      setErrorMessage("Combined files exceed the 100MB total limit.");
      return;
    }

    if (hasInvalid) {
      setErrorMessage("Some files had unsupported extensions and were skipped. Allowed: PDF, Word, Images.");
    } else {
      setErrorMessage(null);
    }

    setSelectedFiles(validFiles);
    await uploadFilesToServer(validFiles);
  };

  const handleRemoveDocument = async (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      setDocuments([]);
      setDocumentId(null);
      setTotalPageCount(0);
      setAuthoritativeQuote(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      await uploadFilesToServer(updatedFiles);
    }
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
    setDocuments([]);
    setDocumentId(null);
    setTotalPageCount(0);
    setAuthoritativeQuote(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePayAndSubmit = async () => {
    if (!documentId || !shop || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setPaymentFailed(false);

    try {
      // Step 1: Create Order with authoritative settings
      const formData = new FormData();
      formData.append("document_id", documentId);
      formData.append("copies", String(copies));
      formData.append("color_mode", colorMode);
      formData.append("duplex", String(duplex));
      formData.append("paper_size", paperSize);
      formData.append(
        "page_range",
        pageRangeMode === "custom" && customPageRange.trim() ? customPageRange.trim() : "all"
      );

      const orderRes = await apiClient.upload<any>(
        `/api/v1/shops/${shopSlug}/orders`,
        formData
      );

      const guestToken = orderRes.guest_access_token;
      if (!guestToken) {
        throw new Error("Missing guest order token from server.");
      }

      // Step 2: Execute Sandbox Payment Intent
      const paymentRes = await apiClient.post<any>(
        `/api/v1/orders/${guestToken}/payment`,
        { simulate_status: "success" }
      );

      if (paymentRes.status === "SUCCESS") {
        // Step 3: Route immediately to Token page
        router.push(`/orders/${guestToken}`);
      } else {
        setPaymentFailed(true);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setPaymentFailed(true);
      setErrorMessage(
        err.message || "Payment wasn't completed. Your document has not entered the print queue."
      );
      setIsSubmitting(false);
    }
  };


  if (isShopLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-3">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono">Loading campus print storefront...</p>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <Card className="text-center p-6 space-y-3 border-rose-200 bg-rose-50/50">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Print Shop Not Found</h2>
        <p className="text-xs text-slate-600">
          We couldn&apos;t load the requested print shop. Please verify the QR code URL.
        </p>
      </Card>
    );
  }

  const bwRateFormatted = `₹${((shop.pricing?.bw_per_page_cents || 100) / 100).toFixed(2)}`;
  const colorRateFormatted = `₹${((shop.pricing?.color_per_page_cents || 1000) / 100).toFixed(2)}`;
  const totalDisplay = authoritativeQuote?.formatted_total || "₹0.00";

  return (
    <div className="space-y-4">
      {/* SCREEN 1: SHOP LANDING HERO */}
      <Card padding="md" className="border-slate-200 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
              HEDS &bull; Mobile Print
            </span>
            <h1 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
              {shop.name}
            </h1>
          </div>
          <Badge variant={shop.is_active && !shop.is_queue_paused ? "success" : "warning"}>
            {shop.is_active && !shop.is_queue_paused ? "OPEN" : "PAUSED"}
          </Badge>
        </div>

        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Print without waiting. Upload your document from your phone and collect at the counter with your token.
        </p>

        {/* Pricing & Queue Stats Strip */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs font-mono">
          <div className="bg-slate-50 p-2 rounded border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase">Rates</span>
            <span className="font-semibold text-slate-900">{bwRateFormatted}</span>
            <span className="text-[10px] text-slate-500"> / B&W page</span>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase">Express Wait</span>
            <span className="font-semibold text-slate-900">
              ~{shop.estimated_wait_minutes || 1} min
            </span>
            <span className="text-[10px] text-slate-500">
              {" "}({shop.queue_length || 0} in queue)
            </span>
          </div>
        </div>

        {/* Action Button */}
        {documents.length === 0 && (
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={scrollToUpload} className="flex-1" size="md">
              Start Printing
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowHowItWorks(true)}
              className="px-3"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        )}
      </Card>

      {/* SCREEN 2: UPLOAD DOCUMENTS */}
      <div ref={uploadSectionRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Step 1: Upload Documents
          </h2>
          {documents.length > 0 && (
            <button
              onClick={handleClearAllFiles}
              className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>

        {/* Large Touch Dropzone */}
        {documents.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) handleFilesSelect(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-lg p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFilesSelect(e.target.files);
              }}
            />
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {isUploading ? "Reading & counting pages..." : "+ Add documents"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Supported: PDF &bull; Word &bull; Images (Max 10 files)</p>
          </div>
        ) : (
          /* Multi-File Selected Documents List */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Selected Documents ({documents.length}/10)</span>
              {documents.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  + Add more
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFilesSelect(e.target.files);
              }}
            />

            <div className="space-y-2">
              {documents.map((doc, idx) => {
                const perPageRate = (colorMode === "COLOR" ? (shop.pricing?.color_per_page_cents || 1000) : (shop.pricing?.bw_per_page_cents || 100)) / 100;
                const estDocPrice = `₹${(doc.page_count * perPageRate).toFixed(2)}`;

                return (
                  <div
                    key={doc.id || idx}
                    className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{doc.filename}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          <span className="font-semibold text-blue-700">{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}</span>
                          {" &bull; "}
                          <span>{estDocPrice}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(idx)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {/* TOTAL STRIP */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">TOTAL</span>
                <span className="font-bold text-slate-900">{totalPageCount} {totalPageCount === 1 ? "page" : "pages"}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">AMOUNT</span>
                <span className="text-base font-extrabold text-blue-700">{totalDisplay}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCREEN 3: PRINT SETTINGS & PRICE (Visible once documents are uploaded) */}
      {documents.length > 0 && (
        <div className="space-y-4 pt-1">

          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Step 2: Print Settings
            </h2>

            {/* Color Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">Color Mode</label>
              <SegmentedControl
                value={colorMode}
                onChange={setColorMode}
                options={[
                  { value: "BW", label: "Black & White", sublabel: bwRateFormatted },
                  { value: "COLOR", label: "Color Print", sublabel: colorRateFormatted },
                ]}
              />
            </div>

            {/* Duplex / Sides Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">Sides</label>
              <SegmentedControl
                value={duplex}
                onChange={setDuplex}
                options={[
                  { value: false, label: "Single-sided", sublabel: "Standard" },
                  { value: true, label: "Double-sided", sublabel: "Both sides" },
                ]}
              />
            </div>

            {/* Copies Counter */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-xs font-medium text-slate-900 block">Copies</span>
                <span className="text-[10px] text-slate-500">Number of sets</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  disabled={copies <= 1}
                  className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm w-4 text-center">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.min(50, c + 1))}
                  className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Page Range Selection */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-900">Page Range</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {pageRangeMode === "all" ? `All ${totalPageCount} pages` : "Custom"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPageRangeMode("all")}
                  className={`py-2 px-3 text-xs rounded font-medium border text-center transition-colors ${
                    pageRangeMode === "all"
                      ? "bg-white border-blue-600 text-blue-600 font-semibold shadow-xs"
                      : "bg-transparent border-slate-200 text-slate-600"
                  }`}
                >
                  All pages ({totalPageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPageRangeMode("custom")}
                  className={`py-2 px-3 text-xs rounded font-medium border text-center transition-colors ${
                    pageRangeMode === "custom"
                      ? "bg-white border-blue-600 text-blue-600 font-semibold shadow-xs"
                      : "bg-transparent border-slate-200 text-slate-600"
                  }`}
                >
                  Custom range
                </button>
              </div>
              {pageRangeMode === "custom" && (
                <input
                  type="text"
                  value={customPageRange}
                  onChange={(e) => setCustomPageRange(e.target.value)}
                  placeholder="e.g. 1-5, 8, 11-14"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              )}
            </div>
          </div>

          {/* SCREEN 3: PRINT SUMMARY & AUTHORITATIVE PRICE */}
          <Card padding="md" className="border-slate-300 bg-slate-50/70 space-y-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Print Summary
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Active Pages</span>
                <span className="font-mono font-medium text-slate-900">
                  {authoritativeQuote ? authoritativeQuote.active_pages : totalPageCount} pages
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Documents</span>
                <span className="font-mono font-medium text-slate-900">
                  {documents.length} {documents.length === 1 ? "file" : "files"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Copies & Mode</span>
                <span className="font-mono font-medium text-slate-900">
                  {copies} &times; {colorMode === "COLOR" ? "Color" : "B&W"} ({duplex ? "Double" : "Single"})
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Authoritative Rate</span>
                <span className="font-mono font-medium text-slate-900">
                  {colorMode === "COLOR" ? colorRateFormatted : bwRateFormatted} / page
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900">Total Price</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {isCalculatingPrice ? "..." : totalDisplay}
              </span>
            </div>
          </Card>

          {/* PAYMENT FAILURE ERROR BANNER */}
          {paymentFailed && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
              <p className="font-bold text-rose-900">Payment wasn&apos;t completed</p>
              <p className="text-rose-700">
                Your document has not entered the print queue. Please try again.
              </p>
            </div>
          )}

          {/* ERROR MESSAGE BANNER */}
          {errorMessage && !paymentFailed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PRIMARY PAYMENT SUBMISSION BUTTON */}
          <Button
            onClick={handlePayAndSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isCalculatingPrice}
            className="w-full text-base font-semibold"
            size="lg"
          >
            {isSubmitting
              ? "Processing..."
              : paymentFailed
              ? `Try Again & Pay ${totalDisplay}`
              : `Pay ${totalDisplay}`}
          </Button>

          <p className="text-[11px] text-center text-slate-400 font-mono">
            Secure sandbox payment &bull; Instant token pickup
          </p>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      <Modal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        title="How Mobile Printing Works"
      >
        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold text-slate-900">Upload PDF</p>
              <p>Choose your document from your phone. Our server reads the exact page count instantly.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold text-slate-900">Select Print Options</p>
              <p>Choose B&W or Color, Single or Double-sided. View the exact ₹1/page price breakdown.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold text-slate-900">Pay & Get Token</p>
              <p>Complete sandbox payment. Your document is sent to the printer and you receive a print token.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <p className="font-semibold text-slate-900">Collect at Counter</p>
              <p>Show your token number at the shop counter when status displays READY.</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
