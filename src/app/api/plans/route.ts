import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parsePlan, parseUserId } from "@/lib/validate";

export const dynamic = "force-dynamic";

function rowToSaved(r: any) {
  return { id: r.id, name: r.name, createdAt: r.created_at, plan: r.plan };
}

export async function GET(req: Request) {
  const userId = parseUserId(req.headers.get("x-user-id"));
  if (!userId) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  try {
    const pool = await db();
    const { rows } = await pool.query("SELECT * FROM saved_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [userId]);
    return NextResponse.json({ plans: rows.map(rowToSaved) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load saved plans." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = parseUserId(req.headers.get("x-user-id"));
  if (!userId) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  const body = await req.json().catch(() => null);
  const plan = parsePlan(body?.plan);
  if (typeof plan === "string") return NextResponse.json({ error: plan }, { status: 400 });
  const name = String(body?.name ?? "").trim().slice(0, 80) || "My meal plan";
  try {
    const pool = await db();
    const { rows } = await pool.query(
      "INSERT INTO saved_plans (user_id, name, plan) VALUES ($1, $2, $3) RETURNING *",
      [userId, name, JSON.stringify(plan)]
    );
    return NextResponse.json({ saved: rowToSaved(rows[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the plan." }, { status: 500 });
  }
}
