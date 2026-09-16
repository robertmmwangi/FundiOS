import type { JobStatus } from "@/types";

export const statusLabels: Record<JobStatus, string> = {
  enquiry: "Enquiry",
  quoted: "Quoted",
  invoiced: "Invoiced",
  deposit_paid: "Deposit paid",
  in_progress: "In progress",
  completed: "Completed",
  paid: "Paid",
};

export const statuses: JobStatus[] = [
  "enquiry",
  "quoted",
  "invoiced",
  "deposit_paid",
  "in_progress",
  "completed",
  "paid",
];

export function getProgressForStatus(status: JobStatus): number | null {
  switch (status) {
    case "enquiry":
      return 0;
    case "quoted":
      return 10;
    case "invoiced":
      return 20;
    case "deposit_paid":
      return 30;
    case "in_progress":
      return null;
    case "completed":
    case "paid":
      return 100;
  }
}

export type StageState = "complete" | "current" | "ready" | "locked";

export function getStageState(
  stage: JobStatus,
  currentStatus: JobStatus,
  context: {
    hasValidQuote: boolean;
    hasPayment: boolean;
    progressPercent: number;
    totalPaid: number;
    quoteTotal: number;
  },
): StageState {
  const currentIndex = statuses.indexOf(currentStatus);
  const stageIndex = statuses.indexOf(stage);

  if (stageIndex < currentIndex) return "complete";
  if (stageIndex === currentIndex) return "current";

  switch (stage) {
    case "quoted":
      return context.hasValidQuote ? "ready" : "locked";
    case "invoiced":
      return currentIndex >= statuses.indexOf("quoted") ? "ready" : "locked";
    case "deposit_paid":
      return currentStatus === "invoiced" ? "ready" : "locked";
    case "in_progress":
      return currentStatus === "deposit_paid" ? "ready" : "locked";
    case "completed":
      return currentStatus === "in_progress" && context.progressPercent >= 100 ? "ready" : "locked";
    case "paid":
      return context.quoteTotal > 0 && context.totalPaid >= context.quoteTotal ? "ready" : "locked";
    default:
      return "locked";
  }
}

export function getStageMessage(stage: JobStatus, state: StageState): string {
  if (state === "ready") return "Use the action buttons below to advance";
  const messages: Partial<Record<JobStatus, string>> = {
    quoted: "Add at least one line item before sending a quote",
    invoiced: "Send the quote first",
    deposit_paid: "Issue an invoice first",
    in_progress: "Record the deposit first",
    completed: "Set progress to 100% and mark complete",
    paid: "Record the final payment to close the job",
  };
  return messages[stage] ?? "Use the action buttons below to advance";
}
