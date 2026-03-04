import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Mail } from "lucide-react";
import { IntroPackActions } from "./intro-pack-actions";
import { IntroEmailActions } from "./intro-email-actions";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  MEETING_BOOKED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-red-100 text-red-800",
};

export default async function IntroductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let intro;
  try {
    const { org } = await getOrgScoped();
    intro = await db.introduction.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            demandBrief: {
              include: { createdByOrg: { select: { name: true } } },
            },
            inventory: true,
          },
        },
        deliveryCycle: true,
      },
    });

    if (!intro) return notFound();

    // Verify org access
    const m = intro.match;
    const hasAccess =
      m.demandBrief.createdByOrgId === org.id ||
      m.inventory.ownerOrgId === org.id ||
      m.sharedOrgId === org.id;
    if (!hasAccess) return notFound();
  } catch {
    return notFound();
  }

  // Fetch the Intro Pack document
  const introPackDoc = await db.document.findFirst({
    where: {
      relatedType: "Introduction",
      relatedId: intro.id,
      fileType: "intro_pack",
    },
    orderBy: { createdAt: "desc" },
  });

  const match = intro.match;
  const brief = match.demandBrief;
  const inventory = match.inventory;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/introductions"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Introductions
        </Link>
        <PageHeader
          title={`${brief.createdByOrg.name} x ${inventory.propertyName}`}
          description={brief.title}
        >
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[intro.status] ?? ""}`}
          >
            {intro.status}
          </span>
        </PageHeader>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Match Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{match.matchScore} / 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDate(intro.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Intro Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {intro.introSentAt
                ? formatDate(intro.introSentAt)
                : "Not yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {intro.deliveryCycle
                ? formatDate(intro.deliveryCycle.month)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reason codes */}
      {match.reasonCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {match.reasonCodes.map((code) => (
            <Badge key={code} variant="secondary">
              {code
                .replace(/_/g, " ")
                .replace(/:/g, ": ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          ))}
        </div>
      )}

      {/* Intro Pack */}
      {introPackDoc?.content ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Intro Pack</CardTitle>
            <IntroPackActions markdown={introPackDoc.content} />
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border bg-muted/30 p-6 font-mono text-sm leading-relaxed">
              {introPackDoc.content}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Intro Pack</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No Intro Pack has been generated for this introduction yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Intro Email */}
      {intro.introEmailBody ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Intro Email</CardTitle>
            </div>
            <IntroEmailActions
              introId={intro.id}
              subject={intro.introEmailSubject ?? ""}
              body={intro.introEmailBody}
              sent={intro.introSentAt !== null}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-2 text-sm font-medium">
                Subject: {intro.introEmailSubject}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {intro.introEmailBody}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Intro Email</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No intro email has been generated for this introduction yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {intro.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{intro.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
