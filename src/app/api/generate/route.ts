import { NextResponse } from "next/server";
import { loadMeals } from "@/lib/meals";
import { generatePlan } from "@/lib/plan";
import { parsePrefs } from "@/lib/validate";

export async function POST(req: Request) {
  const prefs = parsePrefs(await req.json().catch(() => null));
  if (typeof prefs === "string") return NextResponse.json({ error: prefs }, { status: 400 });
  return NextResponse.json({ plan: generatePlan(prefs, loadMeals()) });
}
