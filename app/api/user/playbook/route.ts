/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playbookType } = await req.json();
    if (!playbookType) {
      return NextResponse.json({ error: "playbookType is required" }, { status: 400 });
    }

    // Update user's active playbook
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { playbookType },
    });

    return NextResponse.json({ success: true, playbookType: updatedUser.playbookType });
  } catch (err: any) {
    console.error("API error updating user playbookType:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
