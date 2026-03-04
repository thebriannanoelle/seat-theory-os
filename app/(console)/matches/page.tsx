import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchActions } from "./match-actions";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PROPOSED: "bg-blue-100 text-blue-800",
  INTRO_SENT: "bg-purple-100 text-purple-800",
  MEETING_BOOKED: "bg-green-100 text-green-800",
  NEGOTIATING: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
};

export default async function MatchesPage() {
  let matches: Awaited<ReturnType<typeof db.match.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    matches = await db.match.findMany({
      where: {
        OR: [
          { demandBrief: { createdByOrgId: org.id } },
          { inventory: { ownerOrgId: org.id } },
          { sharedOrgId: org.id },
        ],
      },
      include: {
        demandBrief: { select: { title: true } },
        inventory: { select: { propertyName: true } },
        _count: { select: { introductions: true } },
      },
      orderBy: { matchScore: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Matches" description="Demand-supply matches ranked by score" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Demand Brief</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Intros</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No matches yet. Generate matches from a Demand Brief.
              </TableCell>
            </TableRow>
          ) : (
            matches.map((match) => {
              const m = match as unknown as {
                demandBrief: { title: string };
                inventory: { propertyName: string };
                _count: { introductions: number };
              };
              return (
                <TableRow key={match.id}>
                  <TableCell className="font-medium">{m.demandBrief.title}</TableCell>
                  <TableCell>{m.inventory.propertyName}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-bold">{match.matchScore}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[match.status] ?? ""}`}>
                      {match.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={match.visibility === "SHARED" ? "default" : "secondary"}>
                      {match.visibility}
                    </Badge>
                  </TableCell>
                  <TableCell>{m._count.introductions}</TableCell>
                  <TableCell>
                    <MatchActions matchId={match.id} status={match.status} visibility={match.visibility} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
