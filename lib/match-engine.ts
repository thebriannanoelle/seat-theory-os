import { DemandBrief, Inventory } from "@prisma/client";

interface MatchResult {
  inventoryId: string;
  matchScore: number;
  reasonCodes: string[];
}

/**
 * Hard filter: check if there's category overlap between
 * demand constraints and inventory available categories.
 */
function passesCategoryFilter(
  brief: DemandBrief,
  inventory: Inventory
): boolean {
  if (brief.categoryConstraints.length === 0) return true;
  return brief.categoryConstraints.some((cat) =>
    inventory.categoryAvailable.includes(cat)
  );
}

/**
 * Hard filter: check if budget ranges overlap.
 */
function passesBudgetFilter(
  brief: DemandBrief,
  inventory: Inventory
): boolean {
  if (!brief.budgetMin && !brief.budgetMax) return true;
  if (!inventory.dealSizeMin && !inventory.dealSizeMax) return true;

  const demandMin = brief.budgetMin ?? 0;
  const demandMax = brief.budgetMax ?? Infinity;
  const supplyMin = inventory.dealSizeMin ?? 0;
  const supplyMax = inventory.dealSizeMax ?? Infinity;

  return demandMin <= supplyMax && supplyMin <= demandMax;
}

/**
 * Score audience overlap (0-25 points).
 */
function scoreAudienceOverlap(
  brief: DemandBrief,
  inventory: Inventory
): { score: number; reason: string | null } {
  if (brief.audienceTags.length === 0 || inventory.audienceTags.length === 0) {
    return { score: 12, reason: null };
  }

  const overlap = brief.audienceTags.filter((tag) =>
    inventory.audienceTags.includes(tag)
  );
  const ratio = overlap.length / brief.audienceTags.length;
  const score = Math.round(ratio * 25);

  return {
    score,
    reason: overlap.length > 0 ? `audience_overlap:${overlap.join(",")}` : null,
  };
}

/**
 * Score timeline overlap (0-25 points).
 */
function scoreTimelineOverlap(
  brief: DemandBrief,
  inventory: Inventory
): { score: number; reason: string | null } {
  if (!brief.timelineStart || !brief.timelineEnd) {
    return { score: 15, reason: null };
  }

  if (!inventory.contractExpiration) {
    return { score: 15, reason: null };
  }

  const briefEnd = brief.timelineEnd.getTime();
  const contractExp = inventory.contractExpiration.getTime();

  if (contractExp >= briefEnd) {
    return { score: 25, reason: "timeline_full_overlap" };
  }

  const briefStart = brief.timelineStart.getTime();
  const briefDuration = briefEnd - briefStart;
  if (briefDuration <= 0) return { score: 0, reason: null };

  const overlap = Math.max(0, contractExp - briefStart);
  const ratio = Math.min(1, overlap / briefDuration);
  const score = Math.round(ratio * 25);

  return {
    score,
    reason: score > 10 ? "timeline_partial_overlap" : null,
  };
}

/**
 * Score asset match (0-25 points).
 */
function scoreAssetMatch(
  brief: DemandBrief,
  inventory: Inventory
): { score: number; reason: string | null } {
  if (!brief.activationRequirements || inventory.assetsAvailable.length === 0) {
    return { score: 12, reason: null };
  }

  const reqLower = brief.activationRequirements.toLowerCase();
  const matched = inventory.assetsAvailable.filter((asset) =>
    reqLower.includes(asset.toLowerCase())
  );

  const ratio =
    inventory.assetsAvailable.length > 0
      ? matched.length / inventory.assetsAvailable.length
      : 0;
  const score = Math.round(ratio * 25);

  return {
    score,
    reason: matched.length > 0 ? `asset_match:${matched.join(",")}` : null,
  };
}

/**
 * Score budget fit (0-25 points).
 */
function scoreBudgetFit(
  brief: DemandBrief,
  inventory: Inventory
): { score: number; reason: string | null } {
  const demandMin = brief.budgetMin ?? 0;
  const demandMax = brief.budgetMax ?? Infinity;
  const supplyMin = inventory.dealSizeMin ?? 0;
  const supplyMax = inventory.dealSizeMax ?? Infinity;

  if (demandMax === Infinity && supplyMax === Infinity) {
    return { score: 15, reason: null };
  }

  const overlapMin = Math.max(demandMin, supplyMin);
  const overlapMax = Math.min(
    demandMax === Infinity ? supplyMax : demandMax,
    supplyMax === Infinity ? demandMax : supplyMax
  );

  if (overlapMin > overlapMax) {
    return { score: 0, reason: null };
  }

  const demandRange = (demandMax === Infinity ? demandMin * 3 : demandMax) - demandMin;
  if (demandRange <= 0) {
    return { score: 25, reason: "budget_exact_match" };
  }

  const overlapRange = overlapMax - overlapMin;
  const ratio = Math.min(1, overlapRange / demandRange);
  const score = Math.round(ratio * 25);

  return {
    score,
    reason: score >= 20 ? "budget_strong_fit" : score >= 10 ? "budget_partial_fit" : null,
  };
}

/**
 * Main matching function: given a DemandBrief and a list of Inventory items,
 * returns scored matches that pass hard filters.
 */
export function generateMatches(
  brief: DemandBrief,
  inventories: Inventory[]
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const inv of inventories) {
    // Hard filters
    if (!passesCategoryFilter(brief, inv)) continue;
    if (!passesBudgetFilter(brief, inv)) continue;

    // Weighted scoring
    const audience = scoreAudienceOverlap(brief, inv);
    const timeline = scoreTimelineOverlap(brief, inv);
    const asset = scoreAssetMatch(brief, inv);
    const budget = scoreBudgetFit(brief, inv);

    const matchScore = audience.score + timeline.score + asset.score + budget.score;

    const reasonCodes: string[] = [];
    if (audience.reason) reasonCodes.push(audience.reason);
    if (timeline.reason) reasonCodes.push(timeline.reason);
    if (asset.reason) reasonCodes.push(asset.reason);
    if (budget.reason) reasonCodes.push(budget.reason);

    if (matchScore > 0) {
      results.push({
        inventoryId: inv.id,
        matchScore,
        reasonCodes,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
