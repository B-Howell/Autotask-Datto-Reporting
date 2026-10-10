# Fork and upstream workflow

> How a private deployment tracks this repository without ever editing a file it owns.

## Purpose

The public repository is upstream. A deployment is a private fork with `upstream` as a second remote. Everything that identifies the deployment lives in files upstream never touches, so `git merge upstream/main` is conflict-free by construction.

## What lives where

| Deployment-specific value | Lives in | Tracked upstream? |
|---|---|---|
| Sync interval, data directory, delivery flow URL, renderer URL, schedule timezone; optionally the vendor credentials, Autotask zone and Datto platform, and the master key `APP_SECRET_KEY` | `server/.env` | no (`.env.example` is) |
| Vendor credentials, Autotask zone and Datto platform entered on the Settings page, encrypted | the `credentials` table in the SQLite file under `server/data/` | no |
| Master key for the stored credentials, when not set as `APP_SECRET_KEY` | `server/data/secret.key`, generated on first use | no |
| Client list, agency groups, logos, billing rates, picker year floors | `server/data/agencies.json`, `server/data/tenant.json`, `server/data/logos/` | no (`tenant.example.json` is) |
| Picklist ids, SLA targets, role tiers, fiscal month | `server/report_rules_local.py` | no (`report_rules_local.example.py` is) |
| Licence counts, presets, schedules, run history, saved reports | the SQLite file and `saved_reports/` under `server/data/` | no |

Logos must be PNG files and should be kept to roughly 600 by 200 pixels: the exporters read the size from the PNG header and embed the file at its native resolution, scaled down only for display, so a very large image inflates every Word and PDF export, and a file in any other format is skipped with a console warning.

## Setting up the fork

```bash
git clone <private fork url> reporting && cd reporting
git remote add upstream https://github.com/B-Howell/Autotask-Datto-Reporting.git
cp server/.env.example server/.env
cp server/data/tenant.example.json server/data/tenant.json
cp server/report_rules_local.example.py server/report_rules_local.py
```

Fill in the three copied files. Never commit them; `.gitignore` already excludes each. The vendor credentials, zone and platform can be left out of `.env` and entered on the Settings page after the first start instead; see the [credential storage page](<Reporting Credential Storage.md>).

## Pulling upstream changes

```bash
git fetch upstream
git merge upstream/main
```

If the merge reports a conflict, the fork has edited an upstream-owned file. Resolve by moving the deployment value into one of the files above and taking upstream's version of the source file.

## Rule for new deployment values

A new deployment-specific value added upstream must be read from `.env`, `data/`, or `report_rules_local.py`. Adding a constant to tracked source is a bug.
