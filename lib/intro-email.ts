import type { DemandBrief, Inventory, Match } from "@prisma/client";

interface IntroEmail {
  subject: string;
  body: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function humanizeReasonForEmail(code: string): string {
  if (code.startsWith("audience_overlap:")) {
    const tags = code.replace("audience_overlap:", "").split(",");
    return `Both sides share strong audience overlap in ${tags.join(", ")}`;
  }
  if (code === "timeline_full_overlap") return "The timing works perfectly within the available contract window";
  if (code === "timeline_partial_overlap") return "There's meaningful timeline overlap to build a campaign around";
  if (code === "budget_exact_match") return "The budget and deal size are well aligned";
  if (code === "budget_strong_fit") return "There's a strong fit between the budget range and deal size";
  if (code === "budget_partial_fit") return "The budget parameters have workable overlap";
  if (code.startsWith("asset_match:")) {
    const assets = code.replace("asset_match:", "").split(",");
    return `Key assets align with activation needs: ${assets.join(", ")}`;
  }
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function generateIntroEmail(
  match: Match,
  demandBrief: DemandBrief,
  inventory: Inventory,
  brandName: string,
  introductionId: string
): IntroEmail {
  const propertyName = inventory.propertyName;

  const subject = `Introduction: ${brandName} x ${propertyName} — Partnership Opportunity`;

  const lines: string[] = [];

  lines.push("Hi there,");
  lines.push("");
  lines.push(
    `I wanted to connect you on a sponsorship opportunity I think is a strong fit for both sides. I've been working with ${brandName} on their partnership strategy, and ${propertyName} stands out as a compelling match.`
  );
  lines.push("");

  // Goals / context
  if (demandBrief.goals) {
    lines.push(`**What ${brandName} is looking for:** ${demandBrief.goals}`);
    lines.push("");
  }

  // Why this match
  lines.push("**Why I think this works:**");
  lines.push("");
  const reasons = match.reasonCodes;
  if (reasons.length > 0) {
    for (const code of reasons.slice(0, 3)) {
      lines.push(`- ${humanizeReasonForEmail(code)}`);
    }
  } else {
    lines.push("- The category and audience profiles are well aligned");
    lines.push("- Budget parameters are compatible");
    lines.push("- Timeline and availability line up");
  }
  lines.push("");

  // Budget / deal context
  const budgetContext: string[] = [];
  if (demandBrief.budgetMin != null || demandBrief.budgetMax != null) {
    const min = demandBrief.budgetMin != null ? formatCurrency(demandBrief.budgetMin) : "flexible";
    const max = demandBrief.budgetMax != null ? formatCurrency(demandBrief.budgetMax) : "flexible";
    budgetContext.push(`Brand budget range: ${min} – ${max}`);
  }
  if (inventory.dealSizeMin != null || inventory.dealSizeMax != null) {
    const min = inventory.dealSizeMin != null ? formatCurrency(inventory.dealSizeMin) : "flexible";
    const max = inventory.dealSizeMax != null ? formatCurrency(inventory.dealSizeMax) : "flexible";
    budgetContext.push(`Property deal size: ${min} – ${max}`);
  }
  if (budgetContext.length > 0) {
    lines.push(`**Deal parameters:** ${budgetContext.join(" | ")}`);
    lines.push("");
  }

  // Timing
  if (demandBrief.timelineStart || demandBrief.timelineEnd) {
    const start = demandBrief.timelineStart ? formatDate(demandBrief.timelineStart) : "TBD";
    const end = demandBrief.timelineEnd ? formatDate(demandBrief.timelineEnd) : "TBD";
    lines.push(`**Timing:** ${start} – ${end}`);
    lines.push("");
  }

  // Assets
  if (inventory.assetsAvailable.length > 0) {
    lines.push(`**Available assets:** ${inventory.assetsAvailable.join(", ")}`);
    lines.push("");
  }

  // Links
  lines.push("I've put together a one-page Intro Pack with the full partnership concept:");
  lines.push(`[View Intro Pack](/introductions/${introductionId})`);
  lines.push("");

  // Next step
  lines.push("**Suggested next step:** Let's get a 30-minute discovery call on the calendar to explore this together.");
  lines.push("");
  lines.push("[Book a time on Calendly]({{CALENDLY_LINK}})");
  lines.push("");

  lines.push("Happy to answer any questions in the meantime. Looking forward to making this connection.");
  lines.push("");
  lines.push("Best,");
  lines.push("{{SENDER_NAME}}");
  lines.push("Seat Theory");

  return { subject, body: lines.join("\n") };
}
