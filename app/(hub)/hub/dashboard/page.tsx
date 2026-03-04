import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Handshake, Send, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HubDashboardPage() {
  let data = {
    sharedMatches: 0,
    introsSent: 0,
    meetingsBooked: 0,
    activeDeals: 0,
    deliveryCycle: null as { deliveredCount: number; introQuota: number } | null,
  };

  try {
    const { org } = await getOrgScoped();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sharedMatches, introsSent, meetingsBooked, activeDeals, deliveryCycle] =
      await Promise.all([
        db.match.count({
          where: { sharedOrgId: org.id, visibility: "SHARED" },
        }),
        db.introduction.count({
          where: {
            match: { sharedOrgId: org.id },
            status: { in: ["SENT", "APPROVED"] },
          },
        }),
        db.match.count({
          where: { sharedOrgId: org.id, status: "MEETING_BOOKED" },
        }),
        db.match.count({
          where: { sharedOrgId: org.id, status: "NEGOTIATING" },
        }),
        db.deliveryCycle.findUnique({
          where: { orgId_month: { orgId: org.id, month: monthStart } },
        }),
      ]);

    data = {
      sharedMatches,
      introsSent,
      meetingsBooked,
      activeDeals,
      deliveryCycle: deliveryCycle
        ? { deliveredCount: deliveryCycle.deliveredCount, introQuota: deliveryCycle.introQuota }
        : null,
    };
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Client Dashboard" description="Welcome to your Seat Theory Hub" />
        <p className="text-muted-foreground">Sign in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Client Dashboard" description="Your sponsorship partnership overview" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Shared Matches" value={data.sharedMatches} icon={Handshake} />
        <StatCard title="Introductions" value={data.introsSent} icon={Send} />
        <StatCard title="Meetings Booked" value={data.meetingsBooked} icon={Calendar} />
        <StatCard title="Active Deals" value={data.activeDeals} icon={DollarSign} />
      </div>

      {data.deliveryCycle && (
        <Card>
          <CardHeader>
            <CardTitle>This Month&apos;s Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Introductions received</span>
                <span className="font-medium">
                  {data.deliveryCycle.deliveredCount} / {data.deliveryCycle.introQuota}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (data.deliveryCycle.deliveredCount / data.deliveryCycle.introQuota) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
