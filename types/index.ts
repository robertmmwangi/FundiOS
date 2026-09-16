export type JobStatus =
  | "enquiry"
  | "quoted"
  | "invoiced"
  | "deposit_paid"
  | "in_progress"
  | "completed"
  | "paid";

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  customer_id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  progress_percent: number;
  quote_revision: number;
  quote_last_sent_at: string | null;
  quote_vat_inclusive: boolean;
  quote_locked: boolean;
  quote_subtotal: number | null;
  quote_vat_total: number | null;
  quote_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithCustomer extends Job {
  customer: Pick<Customer, "id" | "name" | "phone">;
}

export type JobEventType =
  | "job_created"
  | "quote_item_added"
  | "quote_item_updated"
  | "quote_item_removed"
  | "quote_sent"
  | "quote_revised"
  | "invoice_issued"
  | "invoice_cancelled"
  | "payment_received"
  | "payment_updated"
  | "payment_deleted"
  | "receipt_issued"
  | "receipt_cancelled"
  | "refund_issued"
  | "status_changed"
  | "progress_updated"
  | "material_added"
  | "material_updated"
  | "material_removed"
  | "note_added";

export interface JobEvent {
  id: string;
  job_id: string;
  user_id: string;
  event_type: JobEventType;
  description: string;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  job_id: string;
  user_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  vat_applicable: boolean;
  vat_rate: number;
  price_includes_vat: boolean;
}

export interface QuoteRevision {
  id: string;
  job_id: string;
  user_id: string;
  revision: number;
  snapshot: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    sort_order: number;
  }>;
  total: number;
  reason: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
  vat_applicable: boolean;
  vat_rate: number;
  price_includes_vat: boolean;
}

export interface Invoice {
  id: string;
  job_id: string;
  user_id: string;
  invoice_number: string;
  revision: number;
  issued_at: string;
  due_at: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  vat_inclusive: boolean;
  notes: string | null;
  snapshot: InvoiceItem[];
  is_revised: boolean;
  revised_from_id: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithContext extends Invoice {
  job: { id: string; title: string } | null;
  customer: { id: string; name: string } | null;
}

export interface PublicQuote {
  job: {
    id: string;
    title: string;
    description: string | null;
    status: JobStatus;
    created_at: string;
    quote_revision: number;
    quote_last_sent_at: string | null;
    quote_vat_inclusive: boolean;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    sort_order: number;
    vat_applicable: boolean;
    vat_rate: number;
    price_includes_vat: boolean;
  }>;
  business: {
    business_name: string | null;
    trade_type: string | null;
    logo_url: string | null;
    phone: string | null;
    vat_registered: boolean;
    vat_number: string | null;
  };
  customer: {
    name: string;
  };
  invoice: {
    id: string;
    invoice_number: string;
    revision: number;
    issued_at: string;
    subtotal: number;
    vat_total: number;
    total: number;
    vat_inclusive: boolean;
    notes: string | null;
  } | null;
}

// Active methods - shown in UI today
export type PaymentMethod =
  | "cash"
  | "mpesa"
  | "bank"
  | "cheque"
  | "other";

// Reserved methods - accepted by DB, hidden in UI until later stages
// When you go global, remove them from this list and add to PaymentMethod
export type ReservedPaymentMethod =
  | "card"
  | "paypal"
  | "stripe"
  | "wise";

export interface Payment {
  id: string;
  job_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod | ReservedPaymentMethod;
  mpesa_receipt: string | null;
  reference: string | null;
  note: string | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
  is_refund: boolean;
  refund_reason: string | null;
  receipt_number: string | null;
  invoice_id: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
}

export interface Receipt extends Payment {}

export interface PaymentWithContext extends Payment {
  customer: { id: string; name: string } | null;
  job: { id: string; title: string } | null;
}

// Human-readable labels for the UI
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod | ReservedPaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
  card: "Card",
  paypal: "PayPal",
  stripe: "Stripe",
  wise: "Wise",
};

// Which methods to show in the payment form today
export const ACTIVE_PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "mpesa",
  "bank",
  "cheque",
  "other",
];
