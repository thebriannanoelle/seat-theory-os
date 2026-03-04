import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    // Signals are INTERNAL only — require OWNER or OPERATOR role
    await requireRole(["OWNER", "OPERATOR"]);

    const signals = await db.signal.findMany({
      where: { visibility: "INTERNAL" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(signals);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["OWNER", "OPERATOR"]);
    const body = await req.json();

    const signal = await db.signal.create({
      data: {
        type: body.type,
        title: body.title,
        summary: body.summary,
        sourceUrl: body.sourceUrl,
        confidenceScore: body.confidenceScore ?? 50,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        visibility: "INTERNAL",
      },
    });
    return NextResponse.json(signal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
