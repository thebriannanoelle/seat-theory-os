import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const inventories = await db.inventory.findMany({
      where: { ownerOrgId: org.id },
      include: { _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(inventories);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await getOrgScoped();
    const body = await req.json();

    const inventory = await db.inventory.create({
      data: {
        propertyName: body.propertyName,
        categoryAvailable: body.categoryAvailable ?? [],
        dealSizeMin: body.dealSizeMin ? parseInt(body.dealSizeMin) : null,
        dealSizeMax: body.dealSizeMax ? parseInt(body.dealSizeMax) : null,
        audienceTags: body.audienceTags ?? [],
        assetsAvailable: body.assetsAvailable ?? [],
        contractExpiration: body.contractExpiration
          ? new Date(body.contractExpiration)
          : null,
        ownerOrgId: org.id,
      },
    });
    return NextResponse.json(inventory, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
