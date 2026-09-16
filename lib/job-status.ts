import type { JobStatus } from "@/types";

export function getProgressForStatus(status: JobStatus): number | null {
  switch (status) {
    case "enquiry":
      return 0;
    case "quoted":
      return 10;
    case "deposit_paid":
      return 25;
    case "in_progress":
      return null;
    case "completed":
    case "invoiced":
    case "paid":
      return 100;
  }
}
