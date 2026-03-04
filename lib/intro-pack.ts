import type { DemandBrief, Inventory, Match } from "@prisma/client";

interface IntroPack {
  title: string;
  markdown: string;
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

function humanizeReasonCode(code: string): string {
  if (code.startsWith("audience_overlap:")) {
    const tags = code.replace("audience_overlap:", "").split(",");
    return `Shared audience alignment across ${tags.join(", ")}`;
  }
  if (code === "timeline_full_overlap") return "Full timeline coverage within contract window";
  if (code === "timeline_partial_overlap") return "Partial timeline overlap with contract window";
  if (code === "budget_exact_match") return "Budget aligns precisely with deal size";
  if (code === "budget_strong_fit") return "Strong budget-to-deal-size alignment";
  if (code === "budget_partial_fit") return "Partial budget overlap with deal size range";
  if (code.startsWith("asset_match:")) {
    const assets = code.replace("asset_match:", "").split(",");
    return `Asset match on ${assets.join(", ")}`;
  }
  return code
    .replace(/_/g, " ")
    .replace(/:/g, ": ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function generateIntroPack(
  match: Match,
  demandBrief: DemandBrief,
  inventory: Inventory,
  brandName: string
): IntroPack {
  const propertyName = inventory.propertyName;
  const conceptName = demandBrief.title;
  const title = `${brandName} x ${propertyName} — ${conceptName}`;

  const lines: string[] = [];

  // Header
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Match Score:** ${match.matchScore} / 100`);
  lines.push("");

  // Concept Summary
  lines.push("## Partnership Concept");
  lines.push("");
  if (demandBrief.goals) {
    lines.push(`- **Objective:** ${demandBrief.goals}`);
  }
  if (demandBrief.geography) {
    lines.push(`- **Target Market:** ${demandBrief.geography}`);
  }
  if (demandBrief.audienceTags.length > 0) {
    lines.push(`- **Target Audience:** ${demandBrief.audienceTags.join(", ")}`);
  }
  if (demandBrief.activationRequirements) {
    lines.push(`- **Activation:** ${demandBrief.activationRequirements}`);
  }
  lines.push("");

  // Why This Fits
  lines.push("## Why This Fits");
  lines.push("");
  const reasons = match.reasonCodes;
  if (reasons.length > 0) {
    for (const code of reasons.slice(0, 3)) {
      lines.push(`- ${humanizeReasonCode(code)}`);
    }
  } else {
    lines.push("- Meets category and budget requirements");
    lines.push("- Compatible audience profile");
    lines.push("- Aligned timeline and availability");
  }
  lines.push("");

  // Proposed Assets
  lines.push("## Proposed Assets");
  lines.push("");
  if (inventory.assetsAvailable.length > 0) {
    for (const asset of inventory.assetsAvailable) {
      lines.push(`- ${asset}`);
    }
  } else {
    lines.push("- *Assets to be discussed*");
  }
  lines.push("");

  // Budget Range
  lines.push("## Budget Range");
  lines.push("");
  const budgetParts: string[] = [];
  if (inventory.dealSizeMin != null || inventory.dealSizeMax != null) {
    const min = inventory.dealSizeMin != null ? formatCurrency(inventory.dealSizeMin) : "TBD";
    const max = inventory.dealSizeMax != null ? formatCurrency(inventory.dealSizeMax) : "TBD";
    budgetParts.push(`- **Property Deal Size:** ${min} – ${max}`);
  }
  if (demandBrief.budgetMin != null || demandBrief.budgetMax != null) {
    const min = demandBrief.budgetMin != null ? formatCurrency(demandBrief.budgetMin) : "TBD";
    const max = demandBrief.budgetMax != null ? formatCurrency(demandBrief.budgetMax) : "TBD";
    budgetParts.push(`- **Brand Budget:** ${min} – ${max}`);
  }
  if (budgetParts.length > 0) {
    lines.push(...budgetParts);
  } else {
    lines.push("- *Budget to be discussed*");
  }
  lines.push("");

  // Timing Window
  lines.push("## Timing Window");
  lines.push("");
  if (demandBrief.timelineStart || demandBrief.timelineEnd) {
    const start = demandBrief.timelineStart
      ? formatDate(demandBrief.timelineStart)
      : "TBD";
    const end = demandBrief.timelineEnd
      ? formatDate(demandBrief.timelineEnd)
      : "TBD";
    lines.push(`- **Campaign Window:** ${start} – ${end}`);
  }
  if (inventory.contractExpiration) {
    lines.push(`- **Property Availability Through:** ${formatDate(inventory.contractExpiration)}`);
  }
  if (!demandBrief.timelineStart && !demandBrief.timelineEnd && !inventory.contractExpiration) {
    lines.push("- *Timeline to be discussed*");
  }
  lines.push("");

  // Next Steps
  lines.push("## Next Steps");
  lines.push("");
  lines.push("- [ ] Review partnership concept and proposed assets");
  lines.push("- [ ] Approve introduction to proceed");
  lines.push("- [ ] Schedule discovery call between brand and property");
  lines.push("- [ ] Exchange additional materials (decks, rate cards)");
  lines.push("- [ ] Align on deal terms and timeline");
  lines.push("- [ ] Finalize partnership agreement");
  lines.push("");

  return { title, markdown: lines.join("\n") };
}
