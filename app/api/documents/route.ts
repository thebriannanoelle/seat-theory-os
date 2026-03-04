import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await getOrgScoped();
    const { searchParams } = new URL(req.url);
    const relatedType = searchParams.get("relatedType");
    const relatedId = searchParams.get("relatedId");

    const documents = await db.document.findMany({
      where: {
        ...(relatedType && relatedId ? { relatedType, relatedId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getOrgScoped();
    const body = await req.json();

    const document = await db.document.create({
      data: {
        title: body.title,
        url: body.url,
        fileType: body.fileType,
        relatedType: body.relatedType,
        relatedId: body.relatedId,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
