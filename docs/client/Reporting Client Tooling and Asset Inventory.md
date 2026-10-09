---
project: "Autotask Datto Reporting"
coverage_inventory: true
coverage_kind: grouped
---

# Client tooling and asset inventory

The build, lint, test and static files around the React client. Behavior lives in the focused pages under this directory; this page explains the supporting files so every one of them has a stated purpose.

## Container image

- [client/Dockerfile](../../client/Dockerfile) is a two-stage build: `node:20-alpine` runs `npm ci` and `npm run build`, then `nginx:alpine` serves the `dist/` output with the project's [nginx configuration](<Reporting Client - nginx.md>) copied over the default site. Dependencies are installed from the lockfile in their own layer so source edits do not reinstall. Active.
- [client/.dockerignore](../../client/.dockerignore) keeps `node_modules`, `dist`, coverage, git metadata, editor settings and any `.env` file out of the build context. Active, declarative.

## Compiler, linter and formatter

- [client/tsconfig.json](../../client/tsconfig.json) is strict TypeScript for a bundler: ES2022 target and lib, `moduleResolution: bundler`, the `@/*` path alias onto `src/`, and every strictness flag on, including `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride` and `verbatimModuleSyntax`. `noEmit` is set because Vite does the emitting; `tsc` is only the typecheck. The `types` list pulls in the Vite client, Vitest globals and jest-dom matchers so test files typecheck. Active.
- [client/eslint.config.js](../../client/eslint.config.js) is the flat config: the recommended JavaScript and typescript-eslint rule sets, React hooks rules, the React Refresh component-export rule, and three project rules, `no-explicit-any` as an error, `consistent-type-imports` as an error (required by `verbatimModuleSyntax`) and unused variables as errors except for underscore-prefixed arguments. Active.
- [client/.prettierrc](../../client/.prettierrc) fixes single quotes, semicolons, two-space indent, 100 columns and ES5 trailing commas. [client/.prettierignore](../../client/.prettierignore) skips build output, dependencies, the lockfile and binary images. Both are thin, declarative configuration.

## Page shell and types

- [client/index.html](../../client/index.html) is the Vite entry page: favicon links, viewport and theme-colour metas, the web manifest, a single `#root` element and the module script that loads [main](<Reporting Client - main.md>). Active.
- [client/src/index.css](../../client/src/index.css) resets the body margin and sets the system font stack and a monospace stack for code. Everything else is styled through the MUI theme in [theme](<Reporting Client - theme.md>). Thin by design.
- [client/src/vite-env.d.ts](../../client/src/vite-env.d.ts) is the one-line reference to Vite's client types so `import.meta.env` and asset imports typecheck. Thin by design.
- [client/src/test/setup.ts](../../client/src/test/setup.ts) registers the jest-dom matchers with Vitest; it is loaded through `setupFiles` in the [Vite config](<Reporting Client - vite config.md>). Thin by design.

## Tests

- [client/src/utils/agencyGroups.test.ts](../../client/src/utils/agencyGroups.test.ts) proves [agencyGroups](<utils/Reporting Util - agencyGroups.md>): agencies sort by name when no groups exist, agencies sharing a configured prefix collapse into one group, a single agency round-trips through its numeric dropdown value, an unknown value resolves to null, and a stored value is named whether it is an id or a group key. Active.
- [client/src/store/tenantStore.test.ts](../../client/src/store/tenantStore.test.ts) proves [tenantStore](<store/Reporting Store - tenantStore.md>): the store starts from `TENANT_DEFAULTS` unloaded, `setTenant` replaces the settings wholesale and marks it loaded, `logoUrl` builds a `/api/tenant/logos/` URL for a mapped name and null otherwise, and `resetTenantStore` restores the defaults. Active.
- [client/src/utils/dates.test.ts](../../client/src/utils/dates.test.ts) proves [dates](<utils/Reporting Util - dates.md>): `reportYears` runs from the given first year through next year and clamps a future first year to next year, the file date stamp is unpadded, and `parseUsDate` accepts only `MM/DD/YYYY` strings. Active.
- [client/src/pages/reports/agencyUtilization/quarters.test.ts](../../client/src/pages/reports/agencyUtilization/quarters.test.ts) proves [quarters](<pages/reports/agencyUtilization/Reporting Agency Utilization - quarters.md>): the choices walk back from the current quarter to the given floor newest first, a future floor still yields the current year, only the current quarter is marked in progress with inclusive ranges, and the default key is the quarter that just ended across the year boundary. Active.
- [client/src/pages/reports/annualUtilization/departments.test.ts](../../client/src/pages/reports/annualUtilization/departments.test.ts) proves [departments](<pages/reports/annualUtilization/Reporting Annual Utilization - departments.md>): `departmentsIn` keeps the given list's order and only the tiers with rows, the Level 0 alias folds onto Administration, and `withDefaultRates` lays overrides over the given list. Active.
- [client/src/store/reportJobStore.test.ts](../../client/src/store/reportJobStore.test.ts) proves [reportJobStore](<store/Reporting Store - reportJobStore.md>): a local run is matched to the server run by the period both labels end with, the further-along progress wins, re-running a report replaces its row, a server run the tab did not start is adopted and updated on later polls, a server poll never adds a twin row for a local run, and a cancelled row stays cancelled even when the aborted request reports an error. Active.
- [client/src/components/report/ReportActions.test.tsx](../../client/src/components/report/ReportActions.test.tsx) renders [ReportActions](<components/report/Reporting Report Component - ReportActions.md>) and checks that export and save stay disabled until there are results while generate stays clickable, and that generate and refresh disable while a report runs. Active.
- [client/src/components/report/AgencySelect.test.tsx](../../client/src/components/report/AgencySelect.test.tsx) renders [AgencySelect](<components/report/Reporting Report Component - AgencySelect.md>) and checks that it lists every agency, a group under its group key and the optional All entry, and reports the All entry with its sentinel value. Active.

## Static assets served from the site root

- [client/public/app-logo.png](../../client/public/app-logo.png) is the application mark shown in the navigation bar by [NavBar](<components/Reporting Component - NavBar.md>). Active.
- [client/public/Office.png](../../client/public/Office.png) and [client/public/Windows.png](../../client/public/Windows.png) are the product icons the licensing report places beside its Office and Windows sections and embeds in the Word and PDF exports; their paths are exported by [assets](<utils/Reporting Util - assets.md>). Active.
- [client/public/favicon.svg](../../client/public/favicon.svg) and [client/public/favicon.ico](../../client/public/favicon.ico) are the tab icons referenced from `index.html`; the SVG is preferred and the ICO is the fallback. Active.
- [client/public/logo192.png](../../client/public/logo192.png) and [client/public/logo512.png](../../client/public/logo512.png) are the home-screen icons listed in the manifest. Active.
- [client/public/manifest.json](../../client/public/manifest.json) is the web app manifest: name, icons, standalone display and colours, so the app can be pinned on a desktop or tablet. Thin, declarative.
