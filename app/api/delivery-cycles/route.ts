import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const cycles = await db.deliveryCycle.findMany({
      where: { orgId: org.id },
      orderBy: { month: "desc" },
    });
    return NextResponse.json(cycles);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
