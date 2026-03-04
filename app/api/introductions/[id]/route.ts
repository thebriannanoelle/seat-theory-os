import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { org } = await getOrgScoped();
    const { id } = await params;

    const intro = await db.introduction.findUnique({
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

    if (!intro) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const m = intro.match;
    const hasAccess =
      m.demandBrief.createdByOrgId === org.id ||
      m.inventory.ownerOrgId === org.id ||
      m.sharedOrgId === org.id;
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(intro);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { org } = await getOrgScoped();
    const { id } = await params;
    const body = await req.json();

    const intro = await db.introduction.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            demandBrief: { select: { createdByOrgId: true } },
            inventory: { select: { ownerOrgId: true } },
          },
        },
      },
    });

    if (!intro) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const m = intro.match;
    const hasAccess =
      m.demandBrief.createdByOrgId === org.id ||
      m.inventory.ownerOrgId === org.id ||
      m.sharedOrgId === org.id;
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update payload from allowed fields
    const updateData: Record<string, unknown> = {};

    if (body.markSent) {
      updateData.introSentAt = new Date();
      updateData.status = "SENT";
    }

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.calendlySchedulingUrl !== undefined) {
      updateData.calendlySchedulingUrl = body.calendlySchedulingUrl;
    }

    if (body.calendlyEventId !== undefined) {
      updateData.calendlyEventId = body.calendlyEventId;
    }

    const updated = await db.introduction.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
