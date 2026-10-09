# Fork and upstream workflow

> How a private deployment tracks this repository without ever editing a file it owns.

## Purpose

The public repository is upstream. A deployment is a private fork with `upstream` as a second remote. Everything that identifies the deployment lives in files upstream never touches, so `git merge upstream/main` is conflict-free by construction.

## What lives where

| Deployment-specific value | Lives in | Tracked upstream? |
|---|---|---|
| Vendor credentials, Autotask zone, Datto platform, sync interval, data directory | `server/.env` | no (`.env.example` is) |
| Client list, agency groups, logos, billing rates, picker year floors | `server/data/agencies.json`, `server/data/tenant.json`, `server/data/logos/` | no (`tenant.example.json` is) |
| Picklist ids, SLA targets, role tiers, fiscal month | `server/report_rules_local.py` | no (`report_rules_local.example.py` is) |
| Licence counts, saved reports | the SQLite file and `saved_reports/` under `server/data/` | no |

## Setting up the fork

```bash
git clone <private fork url> reporting && cd reporting
git remote add upstream https://github.com/B-Howell/Autotask-Datto-Reporting.git
cp server/.env.example server/.env
cp server/data/tenant.example.json server/data/tenant.json
cp server/report_rules_local.example.py server/report_rules_local.py
```

Fill in the three copied files. Never commit them; `.gitignore` already excludes each.

## Pulling upstream changes

```bash
git fetch upstream
git merge upstream/main
```

If the merge reports a conflict, the fork has edited an upstream-owned file. Resolve by moving the deployment value into one of the files above and taking upstream's version of the source file.

## Rule for new deployment values

A new deployment-specific value added upstream must be read from `.env`, `data/`, or `report_rules_local.py`. Adding a constant to tracked source is a bug.
