import type { JobStatus } from "@/types";

const labels: Record<JobStatus, string> = { enquiry: "Enquiry", quoted: "Quoted", deposit_paid: "Deposit Paid", in_progress: "In Progress", completed: "Completed", invoiced: "Invoiced", paid: "Paid" };
export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300">{labels[status]}</span>;
}
