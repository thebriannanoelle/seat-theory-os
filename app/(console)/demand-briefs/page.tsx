import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DemandBriefForm } from "./demand-brief-form";
import { GenerateMatchesButton } from "./generate-matches-button";

export default async function DemandBriefsPage() {
  let briefs: Awaited<ReturnType<typeof db.demandBrief.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    briefs = await db.demandBrief.findMany({
      where: { createdByOrgId: org.id },
      include: { _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Demand Briefs" description="Brand sponsorship demand requirements">
        <DemandBriefForm />
      </PageHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Geography</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Matches</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {briefs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No demand briefs yet.
              </TableCell>
            </TableRow>
          ) : (
            briefs.map((brief) => (
              <TableRow key={brief.id}>
                <TableCell className="font-medium">{brief.title}</TableCell>
                <TableCell>
                  {brief.budgetMin || brief.budgetMax
                    ? `${brief.budgetMin ? formatCurrency(brief.budgetMin) : "—"} – ${brief.budgetMax ? formatCurrency(brief.budgetMax) : "—"}`
                    : "—"}
                </TableCell>
                <TableCell>{brief.geography ?? "—"}</TableCell>
                <TableCell>
                  {brief.timelineStart
                    ? `${formatDate(brief.timelineStart)} – ${brief.timelineEnd ? formatDate(brief.timelineEnd) : "—"}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {(brief as unknown as { _count: { matches: number } })._count.matches}
                  </Badge>
                </TableCell>
                <TableCell>
                  <GenerateMatchesButton demandBriefId={brief.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
