import { createClient } from "@/lib/supabase/client";
import type { Job, JobStatus, JobWithCustomer } from "@/types";

const jobWithCustomerSelect = "*, customer:customers(id, name, phone)";

export type JobInput = {
  customer_id: string;
  title: string;
  description?: string | null;
  status?: JobStatus;
  progress_percent?: number;
  quote_vat_inclusive?: boolean;
  quote_subtotal?: number;
  quote_vat_total?: number;
  quote_total?: number;
};

export type JobFilters = {
  status?: JobStatus;
};

export async function getJobs(filters: JobFilters = {}): Promise<JobWithCustomer[]> {
  const supabase = createClient();
  let query = supabase.from("jobs").select(jobWithCustomerSelect).order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load jobs: ${error.message}`);
  }

  return (data ?? []) as JobWithCustomer[];
}

export async function getJob(id: string): Promise<JobWithCustomer> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jobs").select(jobWithCustomerSelect).eq("id", id).single();

  if (error) {
    throw new Error(`Unable to load job: ${error.message}`);
  }

  return data as JobWithCustomer;
}

export async function createJob(input: JobInput): Promise<Job> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create job: ${error.message}`);
  }

  return data as Job;
}

export async function updateJob(id: string, input: Partial<JobInput>): Promise<Job> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jobs").update(input).eq("id", id).select().single();

  if (error) {
    throw new Error(`Unable to update job: ${error.message}`);
  }

  return data as Job;
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  return updateJob(id, { status });
}

export async function updateJobProgress(id: string, percent: number): Promise<Job> {
  return updateJob(id, { progress_percent: percent });
}

export async function lockQuote(jobId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("jobs").update({ quote_locked: true }).eq("id", jobId);

  if (error) {
    throw new Error(`Unable to lock quote: ${error.message}`);
  }
}

export async function unlockQuote(jobId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ quote_locked: false })
    .eq("id", jobId)
    .neq("status", "paid");

  if (error) {
    throw new Error(`Unable to unlock quote: ${error.message}`);
  }
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    throw new Error(`Unable to delete job: ${error.message}`);
  }
}
