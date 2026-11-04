# FitMeal

FitMeal creates a personalised 7-day meal plan from your fitness goal, dietary preference and daily calorie target, with a matching shopping list.

Built with Next.js (App Router), TypeScript and PostgreSQL. Deployed on Railway from `main`.

## How it works

- Meals come from `data/meals.csv` (40 sample meals), read on the server.
- Each day has 4 meals: breakfast, lunch, dinner and a snack. Meals are chosen by diet and calorie fit; macros are a soft preference.
- One scaling factor per day (0.8x to 1.3x) brings the day close to the calorie target. If the cap stops that, the day shows an "approximate" warning.
- Fitness goal sets default macro ratios (protein/carbs/fat): weight loss 35/35/30, maintenance 25/50/25, muscle gain 30/45/25. Macros entered by the user take priority.
- Activity level is saved and displayed but does not change the plan.
- **Replace** swaps a meal for the closest alternative of the same type and diet; repeated clicks cycle through the alternatives.
- The shopping list sums the scaled ingredients of the whole week.
- **Save Meal Plan** stores the plan, including the preferences, in PostgreSQL.

## Saved plans and limitations

Visitors are anonymous. A random ID is created on the first visit and kept in the browser's local storage; saved plans are linked to it. Saved plans therefore do not follow you to another browser or device, and clearing site data loses access to them.

Nutritional values are estimates and are not personalised medical or dietary advice.

## Configuration

The only environment variable is `DATABASE_URL` (the Railway PostgreSQL connection string). The `saved_plans` table is created automatically on first use.

## Scripts

- `npm run build` builds the app
- `npm start` starts the production server (uses `PORT`)
