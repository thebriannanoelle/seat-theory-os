import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ApproveIntroButton } from "./approve-intro-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;
  let match;

  try {
    const { org } = await getOrgScoped();
    match = await db.match.findFirst({
      where: {
        id,
        sharedOrgId: org.id,
        visibility: "SHARED",
      },
      include: {
        demandBrief: true,
        inventory: true,
        introductions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  } catch {
    notFound();
  }

  if (!match) notFound();

  const brief = match.demandBrief;
  const inv = match.inventory;
  const latestIntro = match.introductions[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title={inv.propertyName}>
        <Badge variant={match.status === "MEETING_BOOKED" ? "default" : "secondary"}>
          {match.status}
        </Badge>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Partnership Concept</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Brand Demand</h4>
              <p className="text-sm">{brief.title}</p>
              {brief.goals && (
                <p className="mt-1 text-sm text-muted-foreground">{brief.goals}</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Property</h4>
              <p className="text-sm">{inv.propertyName}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Match Score</h4>
              <p className="text-2xl font-bold">{match.matchScore}/100</p>
            </div>
            {match.reasonCodes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Match Factors</h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {match.reasonCodes.map((code) => (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets Included</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inv.assetsAvailable.length > 0 ? (
              <ul className="space-y-1">
                {inv.assetsAvailable.map((asset) => (
                  <li key={asset} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {asset}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific assets listed.</p>
            )}

            {(inv.dealSizeMin || inv.dealSizeMax) && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Deal Size Range</h4>
                <p className="text-sm">
                  {inv.dealSizeMin ? formatCurrency(inv.dealSizeMin) : "—"} –{" "}
                  {inv.dealSizeMax ? formatCurrency(inv.dealSizeMax) : "—"}
                </p>
              </div>
            )}

            {inv.audienceTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Audience</h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {inv.audienceTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {match.status === "PROPOSED" && (
            <>
              <p className="text-sm text-muted-foreground">
                This partnership has been curated by your Seat Theory broker.
                Approve the introduction to move forward.
              </p>
              <ApproveIntroButton matchId={match.id} />
            </>
          )}

          {match.status === "INTRO_SENT" && (
            <p className="text-sm text-muted-foreground">
              An introduction has been sent. Your broker will coordinate the next
              meeting.
            </p>
          )}

          {match.status === "MEETING_BOOKED" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                A meeting has been booked. Check your calendar for details.
              </p>
              {latestIntro?.calendlyEventId && (
                <p className="text-sm">
                  Calendly Event: {latestIntro.calendlyEventId}
                </p>
              )}
            </div>
          )}

          {match.status === "NEGOTIATING" && (
            <p className="text-sm text-muted-foreground">
              This deal is currently in negotiation. Your broker will share updates.
            </p>
          )}

          {match.status === "CLOSED" && (
            <p className="text-sm font-medium text-emerald-600">
              This partnership has been closed successfully!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
