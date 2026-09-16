export type JobStatus =
  | "enquiry"
  | "quoted"
  | "deposit_paid"
  | "in_progress"
  | "completed"
  | "invoiced"
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
  created_at: string;
  updated_at: string;
}

export interface JobWithCustomer extends Job {
  customer: Pick<Customer, "id" | "name" | "phone">;
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
}

export interface PublicQuote {
  job: {
    id: string;
    title: string;
    description: string | null;
    status: JobStatus;
    created_at: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    sort_order: number;
  }>;
  business: {
    business_name: string | null;
    trade_type: string | null;
    logo_url: string | null;
    phone: string | null;
  };
  customer: {
    name: string;
  };
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
}

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
