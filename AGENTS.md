<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Prisma Migration Rules

- **Never edit a migration file after it has been applied to any environment.** If a migration has a bug, create a new corrective migration instead (`npx prisma migrate dev --name fix_<description>`). Editing applied migrations breaks the migration history and causes drift errors.
- In development, if drift occurs and there is no important data, use `npx prisma migrate reset` to start clean.
- In production, if drift occurs, use `npx prisma migrate resolve --applied <migration_name>` or `--rolled-back <migration_name>` to reconcile — never reset.
- Always use `npx prisma migrate deploy` in production, never `migrate dev`.
- All schema changes must go through migrations. Never run raw SQL against the database to add tables, columns, or indexes.

## Fixing Migration Drift Without Reset

When `migrate dev` reports drift and reset is not an option:

1. **Shadow DB failures** — `migrate dev` replays all migrations on a fresh shadow DB. If any migration SQL fails on a clean DB (e.g. `DROP INDEX` for an index that was manually created), use `IF EXISTS` in the migration SQL.
2. **Missing `_prisma_migrations` records** — If tables were created via raw SQL or `db push`, insert corresponding records into `_prisma_migrations` with the correct checksum (`sha256` of the migration SQL file). Use the `pg` library directly: `pool.query('INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count) ...')`.
3. **Checksum mismatches** — If you must edit an applied migration, update the `checksum` column in `_prisma_migrations` to match the new file's SHA-256 hash. The `checksum` column is varchar(64) storing a hex-encoded SHA-256.
4. **FK/constraint mismatches** — Check actual constraint definitions with `pg_get_constraintdef(oid)` and match the migration SQL exactly.
5. **Enum mismatches** — Ensure the enum is created (`CREATE TYPE`) before any table that references it.

## Schema Introspection Queries

```sql
-- Column types for a table
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '...' ORDER BY ordinal_position;

-- Foreign key definitions
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '...'::regclass AND contype = 'f';

-- Index definitions
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '...';

-- Existing migration records
SELECT id, migration_name, checksum FROM _prisma_migrations ORDER BY started_at;
```
