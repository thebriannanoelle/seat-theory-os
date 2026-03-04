import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const tasks = await db.task.findMany({
      where: { orgId: org.id },
      include: { assignee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await getOrgScoped();
    const body = await req.json();

    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status ?? "TODO",
        priority: body.priority ?? "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        orgId: org.id,
        assigneeId: body.assigneeId,
        relatedType: body.relatedType,
        relatedId: body.relatedId,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
