import "dotenv/config";

import { readFile } from "node:fs/promises";

import { Pool } from "pg";

async function pushSchema() {
  const [action, ...extraArguments] = process.argv.slice(2);
  if (action !== "push" || extraArguments.length > 0) {
    throw new Error("Usage: npm run db push");
  }

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set it in your .env file before pushing the schema.",
    );
  }

  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      try {
        await client.query(schema);
        await client.query("COMMIT");
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Schema push failed and its transaction could not be rolled back.",
          );
        }
        throw error;
      }
    } finally {
      client.release();
    }
    console.log("PostgreSQL schema applied successfully.");
  } finally {
    await pool.end();
  }
}

pushSchema().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database schema push failed.");
  process.exitCode = 1;
});
