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
import { AccountForm } from "./account-form";

export default async function AccountsPage() {
  let accounts: Awaited<ReturnType<typeof db.account.findMany>> = [];
  try {
    const { org } = await getOrgScoped();
    accounts = await db.account.findMany({
      where: { orgId: org.id },
      include: { _count: { select: { contacts: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Manage brand, property, agency, and talent accounts">
        <AccountForm />
      </PageHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Contacts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No accounts yet. Create your first account.
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{account.type}</Badge>
                </TableCell>
                <TableCell>{account.industry ?? "—"}</TableCell>
                <TableCell>{account.website ?? "—"}</TableCell>
                <TableCell>
                  {(account as unknown as { _count: { contacts: number } })._count.contacts}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
