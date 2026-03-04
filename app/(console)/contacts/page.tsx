import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactForm } from "./contact-form";

export default async function ContactsPage() {
  let contacts: Awaited<ReturnType<typeof db.contact.findMany>> = [];
  let accounts: { id: string; name: string }[] = [];
  try {
    const { org } = await getOrgScoped();
    contacts = await db.contact.findMany({
      where: { account: { orgId: org.id } },
      include: { account: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    accounts = await db.account.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
    });
  } catch {
    // Not authenticated
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Manage contacts across your accounts">
        <ContactForm accounts={accounts} />
      </PageHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No contacts yet.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell>{contact.email ?? "—"}</TableCell>
                <TableCell>{contact.title ?? "—"}</TableCell>
                <TableCell>
                  {(contact as unknown as { account: { name: string } }).account.name}
                </TableCell>
                <TableCell>{contact.phone ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
