import { createClient } from "@/lib/supabase/client";
import type { QuoteItem } from "@/types";

export async function getQuoteItems(jobId: string): Promise<QuoteItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_items")
    .select("*")
    .eq("job_id", jobId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load quote items: ${error.message}`);
  }

  return (data ?? []) as QuoteItem[];
}

export async function createQuoteItem(input: {
  job_id: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  sort_order?: number;
}): Promise<QuoteItem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("quote_items")
    .insert({
      job_id: input.job_id,
      user_id: user.id,
      description: input.description,
      quantity: input.quantity ?? 1,
      unit_price: input.unit_price ?? 0,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create quote item: ${error.message}`);
  }

  return data as QuoteItem;
}

export async function updateQuoteItem(
  id: string,
  input: Partial<Pick<QuoteItem, "description" | "quantity" | "unit_price" | "sort_order">>,
): Promise<QuoteItem> {
  const supabase = createClient();
  const { data, error } = await supabase.from("quote_items").update(input).eq("id", id).select().single();

  if (error) {
    throw new Error(`Unable to update quote item: ${error.message}`);
  }

  return data as QuoteItem;
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quote_items").delete().eq("id", id);

  if (error) {
    throw new Error(`Unable to delete quote item: ${error.message}`);
  }
}

export async function reorderQuoteItems(jobId: string, orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("quote_items").update({ sort_order: index }).eq("id", id).eq("job_id", jobId),
    ),
  );
  const failed = results.find(({ error }) => error);

  if (failed?.error) {
    throw new Error(`Unable to reorder quote items: ${failed.error.message}`);
  }
}
