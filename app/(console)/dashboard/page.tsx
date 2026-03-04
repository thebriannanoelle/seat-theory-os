import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Radio,
  FileText,
  Package,
  Shuffle,
  Send,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardData(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    signalsCount,
    briefsCount,
    inventoryCount,
    matchesCount,
    introsCount,
    meetingsCount,
    dealsCount,
    deliveryCycle,
  ] = await Promise.all([
    db.signal.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    db.demandBrief.count({
      where: { createdByOrgId: orgId },
    }),
    db.inventory.count({
      where: { ownerOrgId: orgId },
    }),
    db.match.count({
      where: {
        OR: [
          { demandBrief: { createdByOrgId: orgId } },
          { inventory: { ownerOrgId: orgId } },
        ],
      },
    }),
    db.introduction.count({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        match: {
          OR: [
            { demandBrief: { createdByOrgId: orgId } },
            { inventory: { ownerOrgId: orgId } },
          ],
        },
      },
    }),
    db.match.count({
      where: {
        status: "MEETING_BOOKED",
        OR: [
          { demandBrief: { createdByOrgId: orgId } },
          { inventory: { ownerOrgId: orgId } },
        ],
      },
    }),
    db.match.count({
      where: {
        status: "NEGOTIATING",
        OR: [
          { demandBrief: { createdByOrgId: orgId } },
          { inventory: { ownerOrgId: orgId } },
        ],
      },
    }),
    db.deliveryCycle.findUnique({
      where: { orgId_month: { orgId, month: monthStart } },
    }),
  ]);

  return {
    signalsCount,
    briefsCount,
    inventoryCount,
    matchesCount,
    introsCount,
    meetingsCount,
    dealsCount,
    deliveryCycle,
  };
}

export default async function DashboardPage() {
  let data;
  try {
    const { org } = await getOrgScoped();
    data = await getDashboardData(org.id);
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Welcome to Seat Theory Broker OS"
        />
        <p className="text-muted-foreground">
          Sign in and select an organization to view your dashboard.
        </p>
      </div>
    );
  }

  const quotaProgress = data.deliveryCycle
    ? `${data.deliveryCycle.deliveredCount} / ${data.deliveryCycle.introQuota}`
    : "No active plan";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operator overview for the current month"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Signals This Month" value={data.signalsCount} icon={Radio} />
        <StatCard title="Demand Briefs" value={data.briefsCount} icon={FileText} />
        <StatCard title="Inventory" value={data.inventoryCount} icon={Package} />
        <StatCard title="Matches Created" value={data.matchesCount} icon={Shuffle} />
        <StatCard title="Intros Delivered" value={data.introsCount} icon={Send} />
        <StatCard title="Meetings Booked" value={data.meetingsCount} icon={Calendar} />
        <StatCard title="Deals in Negotiation" value={data.dealsCount} icon={DollarSign} />
        <StatCard title="Quota Progress" value={quotaProgress} icon={Target} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          {data.deliveryCycle ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Introductions delivered</span>
                <span className="font-medium">
                  {data.deliveryCycle.deliveredCount} /{" "}
                  {data.deliveryCycle.introQuota}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (data.deliveryCycle.deliveredCount /
                        data.deliveryCycle.introQuota) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active delivery cycle. Subscribe to a plan to start.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
