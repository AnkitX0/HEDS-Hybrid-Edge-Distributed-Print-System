export type ColorMode = "BW" | "COLOR";
export type Orientation = "PORTRAIT" | "LANDSCAPE" | "AUTO";
export type Scaling = "FIT" | "ACTUAL" | "FILL";
export type Margins = "DEFAULT" | "MINIMAL";
export type DocumentStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR" | "REMOVING";

export interface BatchDocumentItem {
  id: string; // Unique client tracking ID
  file?: File;
  document_id?: string; // Authoritative backend document UUID
  name: string;
  size: number;
  mime_type?: string;
  page_count: number;
  status: DocumentStatus;
  error?: string;

  // Individual Print Configuration
  copies: number;
  color_mode: ColorMode;
  duplex: boolean;
  paper_size: string;
  page_range_mode: "all" | "custom";
  page_range: string;
  orientation: Orientation;
  scaling: Scaling;
  margins?: Margins;

  // Authoritative item pricing from backend
  calculated_price_cents: number;
  sheets_count?: number;
  rate_per_page_cents?: number;
}

export interface BatchPricingBreakdown {
  total_documents: number;
  total_pages: number;
  total_active_pages: number;
  total_sheets: number;
  raw_total_cents: number;
  duplex_discount_cents: number;
  subtotal_cents: number;
  minimum_order_cents: number;
  final_amount_cents: number;
  currency: string;
  formatted_total: string;
  items: Array<{
    sequence: number;
    document_id: string;
    document_name: string;
    document_page_count: number;
    active_pages: number;
    copies: number;
    color_mode: string;
    duplex: boolean;
    paper_size: string;
    page_range: string;
    sheets_count: number;
    final_amount_cents: number;
    formatted_item_price: string;
  }>;
}

export interface ShopPricing {
  bw_per_page_cents: number;
  color_per_page_cents: number;
  duplex_discount_cents: number;
  minimum_order_cents: number;
  paper_size: string;
}

export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_queue_paused: boolean;
  queue_length: number;
  estimated_wait_minutes: number;
  pricing: ShopPricing;
}
