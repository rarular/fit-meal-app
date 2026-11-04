"use client";

import { useEffect, useState } from "react";
import { DAYS, SLOTS, dayView, formatIngredient, macroTargets, shoppingList } from "@/lib/plan";
import type { Activity, Diet, Goal, Plan, Prefs, SavedPlan } from "@/lib/types";

const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Weight loss",
  maintenance: "Maintenance",
  muscle_gain: "Muscle gain",
};
const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: "Sedentary (little exercise)",
  light: "Lightly active (1-3 days/week)",
  moderate: "Moderately active (3-5 days/week)",
  very_active: "Very active (6-7 days/week)",
};
const DIET_LABELS: Record<Diet, string> = { omnivore: "No restrictions", vegetarian: "Vegetarian", vegan: "Vegan" };

interface Form {
  goal: Goal;
  activity: Activity;
  diet: Diet;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_FORM: Form = { goal: "maintenance", activity: "moderate", diet: "omnivore", calories: "2200", protein: "", carbs: "", fat: "" };

function formFromPrefs(p: Prefs): Form {
  return {
    goal: p.goal,
    activity: p.activity,
    diet: p.diet,
    calories: String(p.calories),
    protein: p.protein ? String(p.protein) : "",
    carbs: p.carbs ? String(p.carbs) : "",
    fat: p.fat ? String(p.fat) : "",
  };
}

// Anonymous visitor id kept in localStorage; plans in the database are keyed by it.
function getUserId(): string {
  const make = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  try {
    let id = localStorage.getItem("fitmeal-user-id");
    if (!id) {
      id = make();
      localStorage.setItem("fitmeal-user-id", id);
    }
    return id;
  } catch {
    return make();
  }
}

async function api<T>(url: string, options: RequestInit = {}, userId?: string): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(userId ? { "x-user-id": userId } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export default function Home() {
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [swapMsg, setSwapMsg] = useState<{ key: string; text: string } | null>(null);

  // On first load: get the visitor id and restore the most recent saved plan.
  useEffect(() => {
    const id = getUserId();
    setUserId(id);
    api<{ plans: SavedPlan[] }>("/api/plans", {}, id)
      .then(({ plans }) => {
        setSaved(plans);
        if (plans[0]) {
          setPlan(plans[0].plan);
          setForm(formFromPrefs(plans[0].plan.prefs));
        }
      })
      .catch(() => setError("Saved plans are unavailable right now."));
  }, []);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSwapMsg(null);
    setBusy(true);
    try {
      const { plan } = await api<{ plan: Plan }>("/api/generate", { method: "POST", body: JSON.stringify(form) });
      setPlan(plan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function replaceMeal(day: number, slot: number) {
    if (!plan) return;
    setError("");
    setNotice("");
    try {
      const res = await api<{ plan: Plan; message?: string }>("/api/swap", {
        method: "POST",
        body: JSON.stringify({ plan, day, slot }),
      });
      setPlan(res.plan);
      setSwapMsg(res.message ? { key: `${day}-${slot}`, text: res.message } : null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function savePlan() {
    if (!plan) return;
    setError("");
    setNotice("");
    setBusy(true);
    const name = `${GOAL_LABELS[plan.prefs.goal]} · ${plan.prefs.calories} kcal · ${new Date().toLocaleDateString("en-GB")}`;
    try {
      const { saved: row } = await api<{ saved: SavedPlan }>("/api/plans", { method: "POST", body: JSON.stringify({ name, plan }) }, userId);
      setSaved((list) => [row, ...list]);
      setNotice("Meal plan saved. It will still be here after you refresh.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function loadPlan(p: SavedPlan) {
    setPlan(p.plan);
    setForm(formFromPrefs(p.plan.prefs));
    setSwapMsg(null);
    setNotice(`Loaded "${p.name}".`);
    setError("");
  }

  async function deletePlan(id: number) {
    try {
      await api(`/api/plans/${id}`, { method: "DELETE" }, userId);
      setSaved((list) => list.filter((p) => p.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const targets = plan ? macroTargets(plan.prefs) : null;

  return (
    <>
      <header className="header">
        <h1>FitMeal</h1>
        <p>Your personalised 7-day meal plan</p>
      </header>

      <main className="container">
        <section className="card">
          <h2>Your goals and preferences</h2>
          <form onSubmit={generate}>
            <div className="grid">
              <label>
                Fitness goal
                <select value={form.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                  {Object.entries(GOAL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Activity level
                <select value={form.activity} onChange={(e) => update("activity", e.target.value as Activity)}>
                  {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Dietary preference
                <select value={form.diet} onChange={(e) => update("diet", e.target.value as Diet)}>
                  {Object.entries(DIET_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Daily calorie target (kcal)
                <input type="number" inputMode="numeric" min={1000} max={6000} required value={form.calories} onChange={(e) => update("calories", e.target.value)} />
              </label>
            </div>

            <div className="section-title">Optional daily macro targets (grams)</div>
            <div className="grid">
              <label>
                Protein (g)
                <input type="number" inputMode="numeric" min={1} placeholder="Auto" value={form.protein} onChange={(e) => update("protein", e.target.value)} />
              </label>
              <label>
                Carbohydrates (g)
                <input type="number" inputMode="numeric" min={1} placeholder="Auto" value={form.carbs} onChange={(e) => update("carbs", e.target.value)} />
              </label>
              <label>
                Fat (g)
                <input type="number" inputMode="numeric" min={1} placeholder="Auto" value={form.fat} onChange={(e) => update("fat", e.target.value)} />
              </label>
            </div>
            <p className="hint">Leave a macro empty and FitMeal uses a default split based on your goal.</p>

            <div className="actions">
              <button type="submit" disabled={busy}>{busy ? "Working…" : "Generate Meal Plan"}</button>
            </div>
          </form>
        </section>

        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}

        {plan && targets && (
          <>
            <section className="card">
              <h2>Your weekly meal plan</h2>
              <div className="summary">
                <span className="chip">{GOAL_LABELS[plan.prefs.goal]}</span>
                <span className="chip">{ACTIVITY_LABELS[plan.prefs.activity]}</span>
                <span className="chip">{DIET_LABELS[plan.prefs.diet]}</span>
                <span className="chip">Target {plan.prefs.calories} kcal/day</span>
                <span className="chip">P {targets.protein} g · C {targets.carbs} g · F {targets.fat} g</span>
              </div>

              <div className="days">
                {plan.days.map((day, di) => {
                  const view = dayView(day, plan.prefs);
                  return (
                    <article className="day" key={di}>
                      <h3>{DAYS[di]}</h3>
                      {view.meals.map((meal, si) => (
                        <div className="meal" key={si}>
                          <div className="meal-top">
                            <div>
                              <div className="slot">{SLOTS[si]}</div>
                              <div className="meal-name">{meal.name}</div>
                            </div>
                            <button type="button" className="secondary" onClick={() => replaceMeal(di, si)}>Replace</button>
                          </div>
                          <div className="macros">
                            <span><b>{meal.calories}</b> kcal</span>
                            <span>Protein <b>{meal.protein}</b> g</span>
                            <span>Carbs <b>{meal.carbs}</b> g</span>
                            <span>Fat <b>{meal.fat}</b> g</span>
                          </div>
                          {swapMsg?.key === `${di}-${si}` && <div className="swap-msg">{swapMsg.text}</div>}
                        </div>
                      ))}
                      <div className="totals">
                        <b>Daily total: {view.totals.calories} kcal</b>
                        <div className="macros">
                          <span>Protein <b>{view.totals.protein}</b> g</span>
                          <span>Carbs <b>{view.totals.carbs}</b> g</span>
                          <span>Fat <b>{view.totals.fat}</b> g</span>
                        </div>
                        {view.approximate && (
                          <div className="warning">
                            The calorie total is approximate: the meals could not be scaled far enough to reach {plan.prefs.calories} kcal.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="actions">
                <button type="button" onClick={savePlan} disabled={busy}>Save Meal Plan</button>
              </div>
            </section>

            <section className="card">
              <h2>Shopping list</h2>
              <ul className="shopping">
                {shoppingList(plan).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        )}

        {saved.length > 0 && (
          <section className="card">
            <h2>Saved meal plans</h2>
            <ul className="saved">
              {saved.map((p) => (
                <li key={p.id}>
                  <div>
                    <div>{p.name}</div>
                    <div className="meta">Saved {new Date(p.createdAt).toLocaleString("en-GB")}</div>
                  </div>
                  <div className="row">
                    <button type="button" className="secondary" onClick={() => loadPlan(p)}>Load</button>
                    <button type="button" className="danger" onClick={() => deletePlan(p.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <p className="disclaimer">
        Nutritional values are estimates only and are not personalised medical or dietary advice. Plans are saved to this browser only.
      </p>
    </>
  );
}
