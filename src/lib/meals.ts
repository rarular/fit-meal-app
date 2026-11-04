import fs from "fs";
import path from "path";
import type { Diet, Ingredient, Meal, Slot } from "./types";

let cache: Meal[] | null = null;

function parseIngredients(text: string): Ingredient[] {
  return text.split(";").map((part) => {
    const [name, rest] = part.split(":");
    const [quantity, unit] = rest.trim().split(" ");
    return { name: name.trim(), quantity: Number(quantity), unit };
  });
}

// Reads data/meals.csv once and keeps it in memory.
export function loadMeals(): Meal[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "meals.csv");
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);
  cache = lines.map((line, i) => {
    const f = line.split(",");
    return {
      id: `m${i + 1}`,
      name: f[0],
      slot: f[1] as Slot,
      diet: f[2] as Diet,
      calories: Number(f[3]),
      protein: Number(f[4]),
      carbs: Number(f[5]),
      fat: Number(f[6]),
      ingredients: parseIngredients(f[7]),
    };
  });
  return cache;
}
