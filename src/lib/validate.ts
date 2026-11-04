import type { Plan, Prefs } from "./types";

const GOALS = ["weight_loss", "maintenance", "muscle_gain"];
const ACTIVITIES = ["sedentary", "light", "moderate", "very_active"];
const DIETS = ["omnivore", "vegetarian", "vegan"];

function optionalGrams(value: unknown): number | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 1500 ? Math.round(n) : null;
}

// Returns clean preferences, or an error message.
export function parsePrefs(input: any): Prefs | string {
  if (!input || typeof input !== "object") return "Missing preferences.";
  if (!GOALS.includes(input.goal)) return "Please choose a fitness goal.";
  if (!ACTIVITIES.includes(input.activity)) return "Please choose an activity level.";
  if (!DIETS.includes(input.diet)) return "Please choose a dietary preference.";
  const calories = Number(input.calories);
  if (!Number.isFinite(calories) || calories < 1000 || calories > 6000) {
    return "Daily calories must be between 1000 and 6000.";
  }
  const protein = optionalGrams(input.protein);
  const carbs = optionalGrams(input.carbs);
  const fat = optionalGrams(input.fat);
  if (protein === null || carbs === null || fat === null) return "Macro targets must be positive numbers of grams.";
  return { goal: input.goal, activity: input.activity, diet: input.diet, calories: Math.round(calories), protein, carbs, fat };
}

export function parsePlan(input: any): Plan | string {
  const prefs = parsePrefs(input?.prefs);
  if (typeof prefs === "string") return prefs;
  const days = input.days;
  const valid =
    Array.isArray(days) &&
    days.length === 7 &&
    days.every((d: any) => Array.isArray(d) && d.length === 4 && d.every((p: any) => p?.meal && typeof p.meal.name === "string"));
  if (!valid) return "Invalid meal plan.";
  return { prefs, days };
}

export function parseUserId(value: string | null): string | null {
  return value && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null;
}
