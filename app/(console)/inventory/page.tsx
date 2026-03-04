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
import { InventoryForm } from "./inventory-form";

export default async function InventoryPage() {
  let inventories: Awaited<ReturnType<typeof db.inventory.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    inventories = await db.inventory.findMany({
      where: { ownerOrgId: org.id },
      include: { _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Sponsorship supply and available properties">
        <InventoryForm />
      </PageHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Deal Size</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Matches</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No inventory yet.
              </TableCell>
            </TableRow>
          ) : (
            inventories.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.propertyName}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {inv.categoryAvailable.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {inv.dealSizeMin || inv.dealSizeMax
                    ? `${inv.dealSizeMin ? formatCurrency(inv.dealSizeMin) : "—"} – ${inv.dealSizeMax ? formatCurrency(inv.dealSizeMax) : "—"}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {inv.contractExpiration ? formatDate(inv.contractExpiration) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {(inv as unknown as { _count: { matches: number } })._count.matches}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
