#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appName = process.env.SHIFTSNAP_APP_NAME || "shiftsnap";
const migrationSchema = process.env.SHIFTSNAP_MIGRATIONS_SCHEMA || "shiftsnap_meta";
const migrationTable = process.env.SHIFTSNAP_MIGRATIONS_TABLE || "migrations";
const migrationDir =
  process.env.SHIFTSNAP_MIGRATIONS_DIR ||
  path.resolve(__dirname, "../migrations/shiftsnap");
const lockKey = Number(process.env.SHIFTSNAP_MIGRATION_LOCK_KEY || "94133721");
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL for migration runner.");
  process.exit(1);
}

if (!Number.isInteger(lockKey)) {
  console.error("SHIFTSNAP_MIGRATION_LOCK_KEY must be an integer.");
  process.exit(1);
}

function checksum(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function quoteIdent(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function ensureMigrationLedger(client) {
  const quotedSchema = quoteIdent(migrationSchema);
  const quotedTable = quoteIdent(migrationTable);

  await client.query(`create schema if not exists ${quotedSchema};`);
  await client.query(`
    create table if not exists ${quotedSchema}.${quotedTable} (
      id bigint generated always as identity primary key,
      app_name text not null,
      file_name text not null,
      checksum text not null,
      execution_ms integer not null,
      applied_at timestamptz not null default now(),
      unique (app_name, file_name)
    );
  `);
}

async function loadAppliedMigrations(client) {
  const quotedSchema = quoteIdent(migrationSchema);
  const quotedTable = quoteIdent(migrationTable);
  const result = await client.query(
    `select file_name, checksum from ${quotedSchema}.${quotedTable} where app_name = $1;`,
    [appName]
  );

  return new Map(result.rows.map((row) => [row.file_name, row.checksum]));
}

async function getMigrationFiles() {
  const entries = await readdir(migrationDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(client, fileName) {
  const fullPath = path.join(migrationDir, fileName);
  const sql = await readFile(fullPath, "utf8");
  const fileChecksum = checksum(sql);

  const start = Date.now();
  await client.query("begin");
  try {
    await client.query(sql);

    const quotedSchema = quoteIdent(migrationSchema);
    const quotedTable = quoteIdent(migrationTable);

    await client.query(
      `
      insert into ${quotedSchema}.${quotedTable}
        (app_name, file_name, checksum, execution_ms)
      values ($1, $2, $3, $4);
      `,
      [appName, fileName, fileChecksum, Date.now() - start]
    );

    await client.query("commit");
    return fileChecksum;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1);", [lockKey]);
    await ensureMigrationLedger(client);

    const files = await getMigrationFiles();
    const applied = await loadAppliedMigrations(client);

    if (files.length === 0) {
      console.log(`No migration files found in ${migrationDir}`);
      return;
    }

    for (const fileName of files) {
      const sql = await readFile(path.join(migrationDir, fileName), "utf8");
      const currentChecksum = checksum(sql);
      const existingChecksum = applied.get(fileName);

      if (existingChecksum && existingChecksum === currentChecksum) {
        console.log(`SKIP ${fileName}`);
        continue;
      }

      if (existingChecksum && existingChecksum !== currentChecksum) {
        throw new Error(
          `Checksum mismatch for ${fileName}. Existing migration files must be immutable.`
        );
      }

      await applyMigration(client, fileName);
      console.log(`APPLY ${fileName}`);
    }
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1);", [lockKey]);
    } catch {
      // ignore unlock errors if connection is already closing
    }
    await client.end();
  }
}

run().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message || error.stack || String(error));
  } else {
    console.error("Migration failed:", JSON.stringify(error));
  }
  process.exit(1);
});
