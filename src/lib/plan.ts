import type { Diet, Goal, Ingredient, Meal, Plan, PlannedMeal, Prefs, Slot } from "./types";

// Pure plan logic. No Node APIs here, so the browser can import it too.

export const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.3;

// Share of the daily calories and macros given to each slot.
const SLOT_SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };

// Default macro split (percent of calories) when the user enters no macro targets.
const GOAL_RATIOS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
  weight_loss: { protein: 35, carbs: 35, fat: 30 },
  maintenance: { protein: 25, carbs: 50, fat: 25 },
  muscle_gain: { protein: 30, carbs: 45, fat: 25 },
};

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Totals extends Macros {
  calories: number;
}

// User-entered macros win; any missing macro comes from the goal default.
export function macroTargets(prefs: Prefs): Macros {
  const r = GOAL_RATIOS[prefs.goal];
  return {
    protein: prefs.protein ?? Math.round((prefs.calories * r.protein) / 100 / 4),
    carbs: prefs.carbs ?? Math.round((prefs.calories * r.carbs) / 100 / 4),
    fat: prefs.fat ?? Math.round((prefs.calories * r.fat) / 100 / 9),
  };
}

export function isEligible(meal: Meal, diet: Diet): boolean {
  if (diet === "omnivore") return true;
  if (diet === "vegetarian") return meal.diet !== "omnivore";
  return meal.diet === "vegan";
}

function roundQuantity(quantity: number, unit: string): number {
  if (unit === "g" || unit === "ml") return Math.max(5, Math.round(quantity / 5) * 5);
  return Math.max(1, Math.round(quantity));
}

export function scaleMeal(meal: Meal, scale: number): Meal {
  return {
    ...meal,
    calories: Math.round(meal.calories * scale),
    protein: Math.round(meal.protein * scale),
    carbs: Math.round(meal.carbs * scale),
    fat: Math.round(meal.fat * scale),
    ingredients: meal.ingredients.map((i) => ({ ...i, quantity: roundQuantity(i.quantity * scale, i.unit) })),
  };
}

// One common factor per day, capped. Approximate when the cap stops us hitting the target.
export function dayScale(meals: Meal[], targetCalories: number): { scale: number; approximate: boolean } {
  const total = meals.reduce((sum, m) => sum + m.calories, 0);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetCalories / total));
  const approximate = Math.abs(total * scale - targetCalories) / targetCalories > 0.05;
  return { scale, approximate };
}

export interface DayView {
  meals: Meal[];
  totals: Totals;
  scale: number;
  approximate: boolean;
}

export function dayView(day: PlannedMeal[], prefs: Prefs): DayView {
  const { scale, approximate } = dayScale(
    day.map((d) => d.meal),
    prefs.calories
  );
  const meals = day.map((d) => scaleMeal(d.meal, scale));
  const totals = meals.reduce<Totals>(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein: t.protein + m.protein,
      carbs: t.carbs + m.carbs,
      fat: t.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return { meals, totals, scale, approximate };
}

function relDiff(value: number, target: number): number {
  return Math.abs(value - target) / Math.max(1, target);
}

function macroError(t: Totals, target: Macros): number {
  return (relDiff(t.protein, target.protein) + relDiff(t.carbs, target.carbs) + relDiff(t.fat, target.fat)) / 3;
}

export function generatePlan(prefs: Prefs, allMeals: Meal[]): Plan {
  const target = macroTargets(prefs);
  const pool = allMeals.filter((m) => isEligible(m, prefs.diet));
  const used = new Map<string, number>();
  const days: PlannedMeal[][] = [];

  for (let d = 0; d < 7; d++) {
    // Keep the 4 best-fitting meals per slot, then try every combination of them.
    const options = SLOTS.map((slot) => {
      const share = SLOT_SHARE[slot];
      return pool
        .filter((m) => m.slot === slot)
        .map((m) => {
          const fit =
            relDiff(m.calories, prefs.calories * share) +
            0.3 * macroError(m, { protein: target.protein * share, carbs: target.carbs * share, fat: target.fat * share });
          return { m, score: fit + 0.05 * (used.get(m.id) ?? 0) + Math.random() * 0.05 };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 4)
        .map((x) => x.m);
    });

    let best: Meal[] = [];
    let bestScore = Infinity;
    for (const b of options[0])
      for (const l of options[1])
        for (const di of options[2])
          for (const s of options[3]) {
            const combo = [b, l, di, s];
            const { scale } = dayScale(combo, prefs.calories);
            const totals = combo.reduce<Totals>(
              (t, m) => ({
                calories: t.calories + m.calories * scale,
                protein: t.protein + m.protein * scale,
                carbs: t.carbs + m.carbs * scale,
                fat: t.fat + m.fat * scale,
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
            const repeats = combo.reduce((sum, m) => sum + (used.get(m.id) ?? 0), 0);
            const score =
              relDiff(totals.calories, prefs.calories) + 0.3 * macroError(totals, target) + 0.02 * repeats + Math.random() * 0.02;
            if (score < bestScore) {
              bestScore = score;
              best = combo;
            }
          }

    best.forEach((m) => used.set(m.id, (used.get(m.id) ?? 0) + 1));
    days.push(best.map((meal) => ({ meal })));
  }

  return { prefs, days };
}

function mealDistance(a: Meal, b: Meal): number {
  return (
    relDiff(a.calories, b.calories) +
    0.5 * ((relDiff(a.protein, b.protein) + relDiff(a.carbs, b.carbs) + relDiff(a.fat, b.fat)) / 3)
  );
}

// Replaces one meal with the closest alternative. Repeated calls walk through the
// alternatives (closest first) and finally return to the original meal.
export function swapMeal(plan: Plan, dayIndex: number, slotIndex: number, allMeals: Meal[]): { plan: Plan; message?: string } {
  const current = plan.days[dayIndex][slotIndex];
  const anchor = allMeals.find((m) => m.id === (current.anchorId ?? current.meal.id)) ?? current.meal;
  const alternatives = allMeals
    .filter((m) => m.slot === anchor.slot && m.id !== anchor.id && isEligible(m, plan.prefs.diet))
    .sort((a, b) => mealDistance(a, anchor) - mealDistance(b, anchor));

  if (alternatives.length === 0) {
    return { plan, message: "No other meal matches your diet for this slot." };
  }

  const ring = [...alternatives, anchor];
  const step = ((current.step ?? -1) + 1) % ring.length;
  const days = plan.days.map((day, di) =>
    di === dayIndex ? day.map((p, si) => (si === slotIndex ? { meal: ring[step], anchorId: anchor.id, step } : p)) : day
  );
  return { plan: { ...plan, days } };
}

function singular(name: string): string {
  if (name.endsWith("oes")) return name.slice(0, -2);
  if (name.endsWith("s")) return name.slice(0, -1);
  return name;
}

export function formatIngredient(i: Ingredient): string {
  if (i.unit === "pcs") return `${i.quantity} ${i.quantity === 1 ? singular(i.name) : i.name}`;
  const unit = i.unit === "slices" && i.quantity === 1 ? "slice" : i.unit;
  return `${i.quantity} ${unit} ${i.name}`;
}

// Sums the scaled ingredients of every meal in the week.
export function shoppingList(plan: Plan): string[] {
  const totals = new Map<string, Ingredient>();
  for (const day of plan.days) {
    for (const meal of dayView(day, plan.prefs).meals) {
      for (const i of meal.ingredients) {
        const key = `${i.name}|${i.unit}`;
        const existing = totals.get(key);
        if (existing) existing.quantity += i.quantity;
        else totals.set(key, { ...i });
      }
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name)).map(formatIngredient);
}
