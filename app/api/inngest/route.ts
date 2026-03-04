import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  generateMatchesJob,
  createMonthlyCycles,
  taskReminder,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateMatchesJob, createMonthlyCycles, taskReminder],
});
