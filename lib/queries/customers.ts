import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/types";

export type CustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
};

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load customers: ${error.message}`);
  }

  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();

  if (error) {
    throw new Error(`Unable to load customer: ${error.message}`);
  }

  return data as Customer;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create customer: ${error.message}`);
  }

  return data as Customer;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").update(input).eq("id", id).select().single();

  if (error) {
    throw new Error(`Unable to update customer: ${error.message}`);
  }

  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    throw new Error(`Unable to delete customer: ${error.message}`);
  }
}
