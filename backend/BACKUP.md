# Database Backup Strategy

## Manual Backup

Run a full `mongodump` of the remote database to a local timestamped folder:

```bash
npm run backup:db
```

This executes:

```bash
mongodump --uri "$MONGO_URI" --out "backups/$(date +%Y-%m-%dT%H-%M-%S)"
```

The `MONGO_URI` value is read from your `.env` file.  
Output lands in `backups/<timestamp>/` (e.g. `backups/2026-09-01T14-30-00/`).  
The `backups/` directory is in `.gitignore` — backups are never committed.

### Prerequisites

- `mongodump` must be installed locally (`mongodump --version` to verify).  
  Install via [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools).

---

## Automated Backups (Recommended for Production)

For zero-effort daily backups with point-in-time restore, enable **MongoDB Atlas Continuous Cloud Backup**:

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com).
2. Navigate to your cluster → **Backup** tab.
3. Click **Enable Backup** and choose a policy (recommended: daily snapshot, retain for 7 days).
4. Optionally enable **Continuous Cloud Backup** (M10+ clusters) for point-in-time restore.

Atlas backups are stored in cloud object storage, versioned, and restorable from the dashboard without `mongodump`.

---

## Restore from a Manual Backup

```bash
mongorestore --uri "$MONGO_URI" backups/<timestamp>/
```

Replace `<timestamp>` with the folder name from the backup run.

> **Warning:** `mongorestore` by default only inserts — it does not drop collections first.  
> Add `--drop` to replace existing data: `mongorestore --uri "$MONGO_URI" --drop backups/<timestamp>/`
