"use client";

import { useState } from "react";

import { CustomerFormSheet } from "@/components/customers/CustomerFormSheet";
import { CustomerList } from "@/components/Stage3";

export default function CustomersPage() {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1");

  return (
    <>
      <CustomerList />
      <CustomerFormSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
