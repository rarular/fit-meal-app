import { NextResponse } from "next/server";
import { loadMeals } from "@/lib/meals";
import { swapMeal } from "@/lib/plan";
import { parsePlan } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const plan = parsePlan(body?.plan);
  const day = Number(body?.day);
  const slot = Number(body?.slot);
  if (typeof plan === "string" || !Number.isInteger(day) || !Number.isInteger(slot) || day < 0 || day > 6 || slot < 0 || slot > 3) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  return NextResponse.json(swapMeal(plan, day, slot, loadMeals()));
}
