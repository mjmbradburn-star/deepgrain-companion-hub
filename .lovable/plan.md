
## Plan: fix the database security linter warning for `pg_net` in `public`

The linter warning is caused by the `pg_net` extension being registered in the `public` schema:

```text
pg_net → public
```

The app currently has a later migration that tries to install `pg_net` into the safer `extensions` schema, but an earlier migration already installed it without specifying a schema, so the extension stayed registered in `public`.

## Implementation steps

1. **Create a new database migration**
   - Move the existing `pg_net` extension out of `public` and into `extensions` using:

   ```sql
   alter extension pg_net set schema extensions;
   ```

   - Ensure the `extensions` schema exists before moving it.
   - Avoid dropping/recreating the extension so any existing email