import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stageColors: Record<string, string> = {
  QUALIFICATION: "bg-gray-100 text-gray-800",
  PROPOSAL: "bg-blue-100 text-blue-800",
  NEGOTIATION: "bg-yellow-100 text-yellow-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
};

export default async function OpportunitiesPage() {
  let opportunities: Awaited<ReturnType<typeof db.opportunity.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    opportunities = await db.opportunity.findMany({
      where: {
        match: {
          OR: [
            { demandBrief: { createdByOrgId: org.id } },
            { inventory: { ownerOrgId: org.id } },
            { sharedOrgId: org.id },
          ],
        },
      },
      include: {
        match: {
          include: {
            demandBrief: { select: { title: true } },
            inventory: { select: { propertyName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Opportunities" description="Deal pipeline and revenue tracking" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Demand Brief</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Est. Value</TableHead>
            <TableHead>Probability</TableHead>
            <TableHead>Close Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No opportunities yet.
              </TableCell>
            </TableRow>
          ) : (
            opportunities.map((opp) => {
              const o = opp as unknown as {
                match: {
                  demandBrief: { title: string };
                  inventory: { propertyName: string };
                };
              };
              return (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium">
                    {o.match.demandBrief.title}
                  </TableCell>
                  <TableCell>{o.match.inventory.propertyName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[opp.stage] ?? ""}`}>
                      {opp.stage}
                    </span>
                  </TableCell>
                  <TableCell>
                    {opp.estimatedValue ? formatCurrency(opp.estimatedValue) : "—"}
                  </TableCell>
                  <TableCell>{opp.probability}%</TableCell>
                  <TableCell>
                    {opp.closeDate ? formatDate(opp.closeDate) : "—"}
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
