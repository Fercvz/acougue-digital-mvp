import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import type { DatabaseState } from "../shared/types.js";
import { seedState } from "./seed.js";

/** One demo store. A JSONB row provides atomic durable PostgreSQL transactions. */
export class Repository {
  readonly storage: "local" | "postgres";
  private data!: DatabaseState;
  private queue: Promise<unknown> = Promise.resolve();
  private pool?: pg.Pool;
  constructor(
    private directory: string,
    private databaseUrl?: string,
  ) {
    this.storage = databaseUrl ? "postgres" : "local";
  }
  async init() {
    if (this.databaseUrl) {
      this.pool = new pg.Pool({ connectionString: this.databaseUrl });
      await this.pool.query(
        "CREATE TABLE IF NOT EXISTS acougue_demo_state (id TEXT PRIMARY KEY, data JSONB NOT NULL)",
      );
      await this.pool.query(
        "INSERT INTO acougue_demo_state(id,data) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        ["default", JSON.stringify(seedState())],
      );
      const result = await this.pool.query(
        "SELECT data FROM acougue_demo_state WHERE id=$1",
        ["default"],
      );
      this.data = result.rows[0].data;
    } else {
      await mkdir(this.directory, { recursive: true });
      try {
        this.data = JSON.parse(
          await readFile(path.join(this.directory, "state.json"), "utf8"),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        this.data = seedState();
        await this.writeLocal(this.data);
      }
    }
  }
  async read(): Promise<DatabaseState> {
    await this.queue;
    if (this.pool)
      this.data = (
        await this.pool.query(
          "SELECT data FROM acougue_demo_state WHERE id=$1",
          ["default"],
        )
      ).rows[0].data;
    return structuredClone(this.data);
  }
  mutate<T>(update: (data: DatabaseState) => T | Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      if (this.pool) {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          const row = await client.query(
            "SELECT data FROM acougue_demo_state WHERE id=$1 FOR UPDATE",
            ["default"],
          );
          const next: DatabaseState = row.rows[0].data;
          const result = await update(next);
          await client.query(
            "UPDATE acougue_demo_state SET data=$2 WHERE id=$1",
            ["default", JSON.stringify(next)],
          );
          await client.query("COMMIT");
          this.data = next;
          return structuredClone(result);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      }
      const next = structuredClone(this.data);
      const result = await update(next);
      await this.writeLocal(next);
      this.data = next;
      return structuredClone(result);
    });
    this.queue = task.catch(() => {});
    return task;
  }
  private async writeLocal(data: DatabaseState) {
    const temp = path.join(this.directory, "state.json.tmp");
    await writeFile(temp, JSON.stringify(data, null, 2), "utf8");
    await rename(temp, path.join(this.directory, "state.json"));
  }
  async close() {
    await this.queue;
    await this.pool?.end();
  }
}
