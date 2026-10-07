"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  Layers,
  AlertCircle,
  CreditCard,
  Check,
  X,
  RotateCw,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

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

export default function StudentShopPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteBreakdown, setQuoteBreakdown] = useState<any>(null);

  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRangeMode, setPageRangeMode] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch shop metadata and queue state
  const {
    data: shop,
    isLoading,
    error,
    refetch,
  } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      return apiClient.get<ShopInfo>(`/api/v1/shops/${shopSlug}`);
    },
    refetchInterval: 5000,
  });

  const requestPricingQuote = async (
    docId: string,
    docPages: number,
    optCopies = copies,
    optColor = colorMode,
    optDuplex = duplex,
    optPaper = paperSize,
    optRange = pageRangeMode === "custom" && customPageRange.trim() ? customPageRange.trim() : "all"
  ) => {
    setIsCalculatingQuote(true);
    try {
      const q = await apiClient.post<any>(`/api/v1/shops/${shopSlug}/pricing/quote`, {
        document_id: docId,
        document_page_count: docPages,
        copies: optCopies,
        color_mode: optColor,
        duplex: optDuplex,
        paper_size: optPaper,
        page_range: optRange,
      });
      setQuoteBreakdown(q);
    } catch (e: any) {
      console.error("Quote calculation error:", e);
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  const uploadAndInspectFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["pdf", "png", "jpg", "jpeg"];

    if (!ext || !validExtensions.includes(ext)) {
      setErrorMessage("Only PDF, PNG, and JPG files are supported.");
      return;
    }

    const maxSizeMb = 50;
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`File exceeds the maximum ${maxSizeMb} MB limit.`);
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setIsAnalyzing(true);
    setDocumentId(null);
    setPageCount(null);
    setQuoteBreakdown(null);

    try {
      const uploadData = new FormData();
      uploadData.append("file", selectedFile);

      const res = await apiClient.upload<any>(
        `/api/v1/shops/${shopSlug}/documents/upload`,
        uploadData
      );

      setDocumentId(res.document_id);
      setPageCount(res.page_count);
      setFileName(res.filename);
      setFileSize(res.file_size_bytes);
      setIsAnalyzing(false);

      // Trigger authoritative quote immediately
      await requestPricingQuote(res.document_id, res.page_count);
    } catch (err: any) {
      setIsAnalyzing(false);
      setFile(null);
      setDocumentId(null);
      setPageCount(null);
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Unable to read this PDF. Please upload a valid, unprotected PDF.");
      } else {
        setErrorMessage("Unable to read this document. Please ensure it is a valid PDF.");
      }
    }
  };

  const loadSampleDocument = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      const res = await fetch("/sample-print.pdf");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample-assignment.pdf", {
        type: "application/pdf",
      });
      await uploadAndInspectFile(sampleFile);
    } catch (e) {
      setIsAnalyzing(false);
      setErrorMessage("Failed to load sample document.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadAndInspectFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadAndInspectFile(e.dataTransfer.files[0]);
    }
  };

  // Helper to re-quote when options change
  const handleOptionChange = (
    newCopies = copies,
    newColor = colorMode,
    newDuplex = duplex,
    newPaper = paperSize,
    newRange = pageRangeMode === "custom" && customPageRange.trim() ? customPageRange.trim() : "all"
  ) => {
    if (documentId && pageCount) {
      requestPricingQuote(documentId, pageCount, newCopies, newColor, newDuplex, newPaper, newRange);
    }
  };

  const handleSubmitOrder = async () => {
    if (!documentId) {
      setErrorMessage("Please select or upload a document first.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("document_id", documentId);
      formData.append("copies", copies.toString());
      formData.append("color_mode", colorMode);
      formData.append("duplex", duplex.toString());
      formData.append("paper_size", paperSize);
      formData.append(
        "page_range",
        pageRangeMode === "custom" && customPageRange.trim()
          ? customPageRange.trim()
          : "all"
      );

      const orderData = await apiClient.upload<any>(
        `/api/v1/shops/${shopSlug}/orders`,
        formData
      );

      // Initiate payment intent
      const payRes = await apiClient.post<any>(
        `/api/v1/orders/${orderData.guest_access_token}/payment`,
        { simulate_status: "success" }
      );

      // If Razorpay gateway is active and modal is available
      if (
        payRes.gateway === "RAZORPAY" &&
        payRes.status === "PENDING" &&
        typeof window !== "undefined" &&
        (window as any).Razorpay
      ) {
        const rzp = new (window as any).Razorpay({
          key: payRes.key_id,
          amount: payRes.amount_cents,
          currency: payRes.currency || "INR",
          order_id: payRes.gateway_order_id,
          name: shop?.name || "Campus Xerox",
          description: `Print Order #${orderData.order_number}`,
          handler: async (response: any) => {
            try {
              await apiClient.post(
                `/api/v1/orders/${orderData.guest_access_token}/payment/verify`,
                {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );
              router.push(`/orders/${orderData.guest_access_token}`);
            } catch (vErr: any) {
              setErrorMessage("Payment verification failed. Please try again.");
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setErrorMessage("Payment was cancelled. Click below to retry.");
            },
          },
        });
        rzp.open();
        return;
      }

      // Route directly to real-time order tracking (Mock gateway or instant completion)
      router.push(`/orders/${orderData.guest_access_token}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === "NETWORK_ERROR" || err.status === 503) {
          setErrorMessage(
            "Cannot connect to print server. Please retry in a few moments."
          );
        } else {
          setErrorMessage(err.message || "Failed to process order.");
        }
      } else {
        setErrorMessage(err.message || "Failed to submit print order.");
      }
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Connecting to Xerox shop...</p>
      </div>
    );
  }

  if (error || !shop) {
    const apiErr = error instanceof ApiError ? error : null;
    const isNotFound = apiErr?.status === 404 || apiErr?.code === "NOT_FOUND";
    const isConnError =
      apiErr?.code === "NETWORK_ERROR" ||
      apiErr?.code === "BACKEND_UNAVAILABLE" ||
      apiErr?.status === 503;

    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-4 shadow-sm my-6">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            isNotFound ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
          }`}
        >
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {isNotFound
              ? "Shop Not Found"
              : isConnError
              ? "Cannot Connect to Print Cluster"
              : "Shop Unavailable"}
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {isNotFound
              ? `We could not find a registered print shop matching "${shopSlug}". Please re-scan the QR code at the shop counter.`
              : isConnError
              ? "Unable to reach the HEDS backend service. If running with Docker, please verify the backend container is healthy."
              : "This shop is temporarily unable to accept new print jobs. Please check with the operator."}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const bwRate = ((shop.pricing?.bw_per_page_cents || 100) / 100).toFixed(2);
  const colorRate = ((shop.pricing?.color_per_page_cents || 1000) / 100).toFixed(2);

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Shop Identity Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {shop.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fast Contactless Campus Printing
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              shop.is_queue_paused
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.is_queue_paused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            {shop.is_queue_paused ? "Queue Paused" : "Counter Open"}
          </span>
        </div>

        {/* Live Shop Stats Pill */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              B&W
            </span>
            <span className="font-bold text-slate-800 text-xs">₹{bwRate}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Color
            </span>
            <span className="font-bold text-indigo-600 text-xs">₹{colorRate}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Wait
            </span>
            <span className="font-bold text-slate-800 text-xs">
              ~{shop.estimated_wait_minutes || 2}m
            </span>
          </div>
        </div>
      </div>

      {/* 2. Upload Experience Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            1. Document
          </span>
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            No Account Needed
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />

        {isAnalyzing ? (
          <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-indigo-900">
              Analyzing document...
            </p>
            <p className="text-[11px] text-indigo-600">
              Verifying PDF format and counting actual pages authoritatively
            </p>
          </div>
        ) : !file || !documentId ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center space-y-2 transition-all duration-200 ${
              isDragging
                ? "border-indigo-600 bg-indigo-50/50 scale-[0.99]"
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tap to upload your file
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF, JPG or PNG (up to 50MB)
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleDocument();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Use Sample PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between gap-3 animate-float">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {fileName}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  <span className="font-bold text-indigo-700">{pageCount} {pageCount === 1 ? "page" : "pages"} detected</span> &bull;{" "}
                  {(fileSize / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setDocumentId(null);
                setPageCount(null);
                setQuoteBreakdown(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 rounded-md hover:bg-red-50 transition-colors"
            >
              Change
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Print Configuration Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600" />
          2. Print Settings
        </span>

        {/* Color Mode Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Color Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setColorMode("BW");
                handleOptionChange(copies, "BW", duplex, paperSize);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorMode === "BW"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Black & White</span>
              <span className="text-[10px] opacity-80">₹{bwRate}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setColorMode("COLOR");
                handleOptionChange(copies, "COLOR", duplex, paperSize);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorMode === "COLOR"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Full Color</span>
              <span className="text-[10px] opacity-80">₹{colorRate}</span>
            </button>
          </div>
        </div>

        {/* Duplex / Sides Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">Printing Sides</label>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Eco Savings
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDuplex(false);
                handleOptionChange(copies, colorMode, false, paperSize);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                !duplex
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Single-Sided
            </button>
            <button
              type="button"
              onClick={() => {
                setDuplex(true);
                handleOptionChange(copies, colorMode, true, paperSize);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                duplex
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Both Sides (Duplex)
            </button>
          </div>
        </div>

        {/* Copies Stepper & Paper Size Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Copies Stepper */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Copies</label>
            <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  const newC = Math.max(1, copies - 1);
                  setCopies(newC);
                  handleOptionChange(newC, colorMode, duplex, paperSize);
                }}
                className="w-10 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm active:bg-slate-200"
              >
                &minus;
              </button>
              <span className="flex-1 text-center font-bold text-xs text-slate-900">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => {
                  const newC = copies + 1;
                  setCopies(newC);
                  handleOptionChange(newC, colorMode, duplex, paperSize);
                }}
                className="w-10 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm active:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Paper Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Paper Size</label>
            <select
              value={paperSize}
              onChange={(e) => {
                setPaperSize(e.target.value);
                handleOptionChange(copies, colorMode, duplex, e.target.value);
              }}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
        </div>

        {/* Page Range Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-slate-700">Page Selection</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPageRangeMode("all");
                handleOptionChange(copies, colorMode, duplex, paperSize, "all");
              }}
              className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                pageRangeMode === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              All Pages
            </button>
            <button
              type="button"
              onClick={() => setPageRangeMode("custom")}
              className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                pageRangeMode === "custom"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              Custom Range
            </button>
          </div>
          {pageRangeMode === "custom" && (
            <input
              type="text"
              placeholder="e.g. 1-3, 5"
              value={customPageRange}
              onChange={(e) => {
                setCustomPageRange(e.target.value);
                handleOptionChange(copies, colorMode, duplex, paperSize, e.target.value);
              }}
              className="w-full h-9 px-3 mt-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          )}
        </div>
      </div>

      {/* 4. Live Authoritative Price & Checkout Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
              Authoritative Total
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black tracking-tight font-mono">
                {isCalculatingQuote ? (
                  <span className="text-base text-slate-400 font-normal">Calculating...</span>
                ) : quoteBreakdown ? (
                  quoteBreakdown.formatted_total
                ) : (
                  "—"
                )}
              </span>
              {quoteBreakdown && !isCalculatingQuote && (
                <span className="text-xs text-slate-400">INR</span>
              )}
            </div>
          </div>
          {quoteBreakdown && (
            <button
              type="button"
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-medium"
            >
              <span>Breakdown</span>
              {showPriceBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {showPriceBreakdown && quoteBreakdown && (
          <div className="pt-2 border-t border-slate-800 text-xs space-y-1 font-mono text-slate-300">
            <div className="flex justify-between">
              <span>Authoritative Pages:</span>
              <span>
                {quoteBreakdown.active_pages} {quoteBreakdown.active_pages === 1 ? "page" : "pages"} (of {quoteBreakdown.document_page_count})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Copies:</span>
              <span>
                {quoteBreakdown.copies} {quoteBreakdown.copies === 1 ? "copy" : "copies"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rate per page:</span>
              <span>₹{(quoteBreakdown.rate_per_page_cents / 100).toFixed(2)}</span>
            </div>
            {quoteBreakdown.duplex_discount_cents > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Duplex Discount:</span>
                <span>-₹{(quoteBreakdown.duplex_discount_cents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white">
              <span>Total Billable:</span>
              <span>{quoteBreakdown.formatted_total}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmitOrder}
          disabled={submitting || !documentId || shop.is_queue_paused || isAnalyzing}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            submitting || !documentId || shop.is_queue_paused || isAnalyzing
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-indigo-500 hover:bg-indigo-400 text-white active:scale-[0.99]"
          }`}
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Placing in Queue...</span>
            </>
          ) : shop.is_queue_paused ? (
            <span>Queue Temporarily Paused</span>
          ) : isAnalyzing ? (
            <span>Analyzing Document...</span>
          ) : !documentId ? (
            <span>Upload Document to Continue</span>
          ) : isCalculatingQuote ? (
            <span>Calculating Price...</span>
          ) : (
            <>
              <span>Pay {quoteBreakdown?.formatted_total || `₹${((quoteBreakdown?.final_amount_cents || 0) / 100).toFixed(2)}`} & Print</span>
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </div>
  );
}
