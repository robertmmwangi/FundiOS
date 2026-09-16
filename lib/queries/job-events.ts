import { createClient } from "@/lib/supabase/client";
import type { JobEvent, JobEventType } from "@/types";

export async function getJobTimeline(jobId: string): Promise<JobEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_job_timeline", { p_job_id: jobId });

  if (error) {
    throw new Error(`Unable to load job activity: ${error.message}`);
  }

  return (data ?? []) as JobEvent[];
}

export async function logJobEvent(input: {
  jobId: string;
  eventType: JobEventType;
  description: string;
  amount?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<JobEvent | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("job_events")
    .insert({
      job_id: input.jobId,
      event_type: input.eventType,
      description: input.description,
      amount: input.amount ?? null,
      metadata: input.metadata ?? {},
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to log job activity: ${error.message}`);
  }

  return data as JobEvent | null;
}
