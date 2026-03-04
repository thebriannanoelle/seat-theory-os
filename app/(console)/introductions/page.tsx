import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  MEETING_BOOKED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-red-100 text-red-800",
};

export default async function IntroductionsPage() {
  let introductions: Awaited<ReturnType<typeof db.introduction.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    introductions = await db.introduction.findMany({
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
        deliveryCycle: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Introductions"
        description="Curated broker introductions sent to clients"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Demand Brief</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Calendly</TableHead>
            <TableHead>Delivery Cycle</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {introductions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No introductions yet.
              </TableCell>
            </TableRow>
          ) : (
            introductions.map((intro) => {
              const i = intro as unknown as {
                match: {
                  demandBrief: { title: string };
                  inventory: { propertyName: string };
                };
                deliveryCycle: { month: Date } | null;
              };
              return (
                <TableRow key={intro.id}>
                  <TableCell className="font-medium">
                    {i.match.demandBrief.title}
                  </TableCell>
                  <TableCell>{i.match.inventory.propertyName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[intro.status] ?? ""}`}>
                      {intro.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {intro.calendlyEventId ? (
                      <Badge variant="default">Linked</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {i.deliveryCycle
                      ? formatDate(i.deliveryCycle.month)
                      : "—"}
                  </TableCell>
                  <TableCell>{formatDate(intro.createdAt)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
