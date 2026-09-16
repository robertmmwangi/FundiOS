import { createClient } from "@/lib/supabase/client";
import type { QuoteItem, QuoteRevision } from "@/types";

export class QuoteBelowPaidError extends Error {
  newTotal: number;
  paidAmount: number;
  shortfall: number;

  constructor(newTotal: number, paidAmount: number, shortfall: number) {
    super("Quote total is below amount already paid");
    this.name = "QuoteBelowPaidError";
    this.newTotal = newTotal;
    this.paidAmount = paidAmount;
    this.shortfall = shortfall;
  }
}

function parseAmount(value: string) {
  return Number(value.replace(/,/g, "").trim());
}

function throwQuoteItemError(error: unknown, fallback: string): never {
  if (error instanceof QuoteBelowPaidError) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("QUOTE_BELOW_PAID")) {
    const match = message.match(
      /New total\s*\(KSh\s*([\d,]+(?:\.\d+)?)\).*amount already paid\s*\(KSh\s*([\d,]+(?:\.\d+)?)/i,
    );
    const newTotal = match ? parseAmount(match[1]) : 0;
    const paidAmount = match ? parseAmount(match[2]) : 0;
    throw new QuoteBelowPaidError(newTotal, paidAmount, Math.max(paidAmount - newTotal, 0));
  }
  throw new Error(`${fallback}: ${message}`);
}

export async function getQuoteRevisions(jobId: string): Promise<QuoteRevision[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_revisions")
    .select("*")
    .eq("job_id", jobId)
    .order("revision", { ascending: false });

  if (error) {
    throw new Error(`Unable to load quote revisions: ${error.message}`);
  }

  return (data ?? []) as QuoteRevision[];
}

export async function saveQuoteRevision(jobId: string, reason?: string): Promise<QuoteRevision> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const [items, latestRevision] = await Promise.all([
    getQuoteItems(jobId),
    supabase
      .from("quote_revisions")
      .select("revision")
      .eq("job_id", jobId)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (latestRevision.error) {
    throw new Error(`Unable to determine quote revision: ${latestRevision.error.message}`);
  }

  const snapshot = items.map(({ description, quantity, unit_price, sort_order }) => ({
    description,
    quantity: Number(quantity),
    unit_price: Number(unit_price),
    sort_order,
  }));
  const total = snapshot.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const revision = Number(latestRevision.data?.revision ?? 0) + 1;

  const { data, error } = await supabase
    .from("quote_revisions")
    .insert({
      job_id: jobId,
      user_id: user.id,
      revision,
      snapshot,
      total,
      reason: reason?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to save quote revision: ${error.message}`);
  }

  return data as QuoteRevision;
}

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
  vat_applicable?: boolean;
  vat_rate?: number;
  price_includes_vat?: boolean;
}): Promise<QuoteItem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  try {
    const { data, error } = await supabase
      .from("quote_items")
      .insert({
        job_id: input.job_id,
        user_id: user.id,
        description: input.description,
        quantity: input.quantity ?? 1,
        unit_price: input.unit_price ?? 0,
        sort_order: input.sort_order ?? 0,
        vat_applicable: input.vat_applicable ?? false,
        vat_rate: input.vat_rate ?? 16,
        price_includes_vat: input.price_includes_vat ?? false,
      })
      .select()
      .single();

    if (error) {
      throwQuoteItemError(error, "Unable to create quote item");
    }

    return data as QuoteItem;
  } catch (error) {
    throwQuoteItemError(error, "Unable to create quote item");
  }
}

export async function updateQuoteItem(
  id: string,
  input: Partial<Pick<QuoteItem, "description" | "quantity" | "unit_price" | "sort_order" | "vat_applicable" | "vat_rate" | "price_includes_vat">>,
): Promise<QuoteItem> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from("quote_items").update(input).eq("id", id).select().single();

    if (error) {
      throwQuoteItemError(error, "Unable to update quote item");
    }

    return data as QuoteItem;
  } catch (error) {
    throwQuoteItemError(error, "Unable to update quote item");
  }
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("quote_items").delete().eq("id", id);

    if (error) {
      throwQuoteItemError(error, "Unable to delete quote item");
    }
  } catch (error) {
    throwQuoteItemError(error, "Unable to delete quote item");
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
    throwQuoteItemError(failed.error, "Unable to reorder quote items");
  }
}
