import { Pool } from "pg";

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // Railway's internal host needs no SSL; the public proxy does.
    const local = /railway\.internal|localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  }
  return pool;
}

// Creates the table on first use, so no separate migration step is needed.
export async function db(): Promise<Pool> {
  const p = getPool();
  if (!ready) {
    ready = p
      .query(
        `CREATE TABLE IF NOT EXISTS saved_plans (
           id SERIAL PRIMARY KEY,
           user_id TEXT NOT NULL,
           name TEXT NOT NULL,
           plan JSONB NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         CREATE INDEX IF NOT EXISTS saved_plans_user_idx ON saved_plans (user_id);`
      )
      .then(() => undefined);
    ready.catch(() => {
      ready = null;
    });
  }
  await ready;
  return p;
}
