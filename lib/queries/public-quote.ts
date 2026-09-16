import { createClient } from "@/lib/supabase/client";
import type { PublicQuote } from "@/types";

export async function getPublicQuote(jobId: string): Promise<PublicQuote | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_quote", { p_job_id: jobId });

  if (error) {
    console.error("Unable to load public quote:", error);
    return null;
  }

  return (data as PublicQuote | null) ?? null;
}
