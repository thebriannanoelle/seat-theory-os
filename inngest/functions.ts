import { inngest } from "./client";
import { db } from "@/lib/db";
import { generateMatches } from "@/lib/match-engine";

/**
 * Background job: generate matches for a demand brief.
 * Triggered when a new demand brief is created or updated.
 */
export const generateMatchesJob = inngest.createFunction(
  { id: "generate-matches", name: "Generate Matches for Demand Brief" },
  { event: "demand-brief/created" },
  async ({ event }) => {
    const { demandBriefId } = event.data;

    const brief = await db.demandBrief.findUnique({
      where: { id: demandBriefId },
    });
    if (!brief) return { error: "Brief not found" };

    const inventories = await db.inventory.findMany();
    const results = generateMatches(brief, inventories);

    let created = 0;
    for (const result of results) {
      const existing = await db.match.findFirst({
        where: { demandBriefId, inventoryId: result.inventoryId },
      });
      if (existing) continue;

      await db.match.create({
        data: {
          demandBriefId,
          inventoryId: result.inventoryId,
          matchScore: result.matchScore,
          reasonCodes: result.reasonCodes,
          status: "DRAFT",
          visibility: "INTERNAL",
        },
      });
      created++;
    }

    return { generated: created };
  }
);

/**
 * Monthly job: create delivery cycles for active subscriptions.
 */
export const createMonthlyCycles = inngest.createFunction(
  { id: "create-monthly-cycles", name: "Create Monthly Delivery Cycles" },
  { cron: "0 0 1 * *" }, // 1st of each month
  async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find all active delivery cycles from last month and create new ones
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastCycles = await db.deliveryCycle.findMany({
      where: { month: lastMonth, status: "ACTIVE" },
    });

    // Complete last month's cycles
    await db.deliveryCycle.updateMany({
      where: { month: lastMonth, status: "ACTIVE" },
      data: { status: "COMPLETED" },
    });

    // Create new cycles
    let created = 0;
    for (const cycle of lastCycles) {
      await db.deliveryCycle.upsert({
        where: { orgId_month: { orgId: cycle.orgId, month: monthStart } },
        create: {
          orgId: cycle.orgId,
          month: monthStart,
          introQuota: cycle.introQuota,
          deliveredCount: 0,
          status: "ACTIVE",
          stripeSubId: cycle.stripeSubId,
        },
        update: {},
      });
      created++;
    }

    return { created };
  }
);

/**
 * Background job: send follow-up task reminders.
 */
export const taskReminder = inngest.createFunction(
  { id: "task-reminder", name: "Task Due Date Reminder" },
  { cron: "0 9 * * *" }, // Daily at 9 AM
  async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );
    const endOfTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate() + 1
    );

    const dueTasks = await db.task.findMany({
      where: {
        dueDate: { gte: startOfTomorrow, lt: endOfTomorrow },
        status: { not: "DONE" },
      },
    });

    // In production, this would send email/notification
    return { tasksFound: dueTasks.length };
  }
);
