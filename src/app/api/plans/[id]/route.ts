import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseUserId } from "@/lib/validate";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = parseUserId(req.headers.get("x-user-id"));
  const id = Number(params.id);
  if (!userId || !Number.isInteger(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const pool = await db();
    await pool.query("DELETE FROM saved_plans WHERE id = $1 AND user_id = $2", [id, userId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not delete the plan." }, { status: 500 });
  }
}
