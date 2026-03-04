import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

interface FunnelStep {
  label: string;
  current: number;
  previous: number;
}

async function getMonthMetrics(orgId: string, monthStart: Date, monthEnd: Date) {
  const orgMatchFilter = {
    OR: [
      { demandBrief: { createdByOrgId: orgId } },
      { inventory: { ownerOrgId: orgId } },
      { sharedOrgId: orgId },
    ],
  };

  const [
    signals,
    demandBriefs,
    matches,
    introsCreated,
    introsSent,
    meetingsBooked,
    opportunities,
    dealsWon,
  ] = await Promise.all([
    db.signal.count({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
    }),
    db.demandBrief.count({
      where: {
        createdByOrgId: orgId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    db.match.count({
      where: {
        ...orgMatchFilter,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    db.introduction.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        match: orgMatchFilter,
      },
    }),
    db.introduction.count({
      where: {
        introSentAt: { gte: monthStart, lt: monthEnd },
        match: orgMatchFilter,
      },
    }),
    db.introduction.count({
      where: {
        status: "MEETING_BOOKED",
        updatedAt: { gte: monthStart, lt: monthEnd },
        match: orgMatchFilter,
      },
    }),
    db.opportunity.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        match: orgMatchFilter,
      },
    }),
    db.opportunity.count({
      where: {
        stage: "CLOSED_WON",
        updatedAt: { gte: monthStart, lt: monthEnd },
        match: orgMatchFilter,
      },
    }),
  ]);

  return {
    signals,
    demandBriefs,
    matches,
    introsCreated,
    introsSent,
    meetingsBooked,
    opportunities,
    dealsWon,
  };
}

export async function GET() {
  try {
    const { org } = await getOrgScoped();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [current, previous] = await Promise.all([
      getMonthMetrics(org.id, thisMonthStart, nextMonthStart),
      getMonthMetrics(org.id, lastMonthStart, thisMonthStart),
    ]);

    const steps: FunnelStep[] = [
      { label: "Signals Created", current: current.signals, previous: previous.signals },
      { label: "Demand Briefs", current: current.demandBriefs, previous: previous.demandBriefs },
      { label: "Matches Generated", current: current.matches, previous: previous.matches },
      { label: "Intros Created", current: current.introsCreated, previous: previous.introsCreated },
      { label: "Intros Sent", current: current.introsSent, previous: previous.introsSent },
      { label: "Meetings Booked", current: current.meetingsBooked, previous: previous.meetingsBooked },
      { label: "Opportunities", current: current.opportunities, previous: previous.opportunities },
      { label: "Deals Closed (Won)", current: current.dealsWon, previous: previous.dealsWon },
    ];

    return NextResponse.json({ steps });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
