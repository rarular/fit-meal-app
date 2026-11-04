export type Diet = "omnivore" | "vegetarian" | "vegan";
export type Goal = "weight_loss" | "maintenance" | "muscle_gain";
export type Activity = "sedentary" | "light" | "moderate" | "very_active";
export type Slot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Meal {
  id: string;
  name: string;
  slot: Slot;
  diet: Diet;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
}

export interface Prefs {
  goal: Goal;
  activity: Activity;
  diet: Diet;
  calories: number;
  // Optional macro targets in grams per day; missing ones fall back to goal defaults.
  protein?: number;
  carbs?: number;
  fat?: number;
}

// A meal in the plan. anchorId/step remember where a Replace cycle started.
export interface PlannedMeal {
  meal: Meal;
  anchorId?: string;
  step?: number;
}

export interface Plan {
  prefs: Prefs;
  days: PlannedMeal[][];
}

export interface SavedPlan {
  id: number;
  name: string;
  createdAt: string;
  plan: Plan;
}
