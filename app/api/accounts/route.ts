import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const accounts = await db.account.findMany({
      where: { orgId: org.id },
      include: { _count: { select: { contacts: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await getOrgScoped();
    const body = await req.json();

    const account = await db.account.create({
      data: {
        name: body.name,
        type: body.type,
        website: body.website,
        industry: body.industry,
        orgId: org.id,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
