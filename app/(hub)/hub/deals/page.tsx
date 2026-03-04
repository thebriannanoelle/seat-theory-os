import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  PROPOSED: "New Match",
  INTRO_SENT: "Introduction Sent",
  MEETING_BOOKED: "Meeting Booked",
  NEGOTIATING: "In Negotiation",
  CLOSED: "Closed",
  LOST: "Lost",
};

export default async function DealsPage() {
  let matches: Awaited<ReturnType<typeof db.match.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    // Client hub only shows SHARED records
    matches = await db.match.findMany({
      where: {
        sharedOrgId: org.id,
        visibility: "SHARED",
      },
      include: {
        demandBrief: { select: { title: true, goals: true } },
        inventory: { select: { propertyName: true, assetsAvailable: true } },
      },
      orderBy: { matchScore: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Deal Room" description="Your curated sponsorship matches" />

      {matches.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No matches shared with you yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => {
            const m = match as unknown as {
              demandBrief: { title: string; goals: string | null };
              inventory: { propertyName: string; assetsAvailable: string[] };
            };
            return (
              <Link key={match.id} href={`/hub/deals/${match.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{m.inventory.propertyName}</CardTitle>
                      <Badge>{statusLabels[match.status] ?? match.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{m.demandBrief.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Match Score</span>
                      <span className="font-mono text-sm font-bold">{match.matchScore}/100</span>
                    </div>
                    {m.inventory.assetsAvailable.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.inventory.assetsAvailable.slice(0, 3).map((asset) => (
                          <Badge key={asset} variant="secondary" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
