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
