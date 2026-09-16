"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomerForm } from "@/components/Stage3";
import { getCustomer } from "@/lib/queries/customers";
import type { Customer } from "@/types";
export default function EditCustomerPage() { const { id } = useParams<{ id: string }>(); const [customer, setCustomer] = useState<Customer>(); useEffect(() => { if (id) getCustomer(id).then(setCustomer); }, [id]); return <div className="space-y-5"><h1 className="text-3xl font-bold text-white">Edit customer</h1>{customer && <CustomerForm customer={customer} />}</div>; }
