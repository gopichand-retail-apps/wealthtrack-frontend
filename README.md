# WealthTrack Frontend

![CI](https://github.com/gopichand-retail-apps/wealthtrack-frontend/actions/workflows/ci.yml/badge.svg)
**Live demo:** https://wealthtrack-frontend-eight.vercel.app/

[Architecture guide](docs/architecture.md) — source map, workflows, contracts, data, security, and checks.

## Repository layout and Windows workflow

This is the WealthTrack React/Vite frontend repository. It keeps its own Git history, origin, package manifest, and lockfile; the API is the independent [wealthtrack-backend](https://github.com/gopichand-retail-apps/wealthtrack-backend) repository. Place the pair under one WealthTrack folder to use the supplied single-folder VS Code workspace.

Use Node **24.15.0** and npm with the committed lockfile. From this repository in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

The client is at http://127.0.0.1:5901; start the API separately. For both services in the complete Retail Apps workspace, use `./scripts/Start-Apps.ps1 -App WealthTrack` from the workspace root. Use `-EnvironmentName IT` only for the independent IT copies.

See the [app overview](docs/architecture.md#1-scope-users-and-repository-boundary) and [canonical architecture](docs/architecture.md). The architecture guide is included in this repository. No cross-app backend integration is added by this organization change.

WealthTrack is a local React + TypeScript workspace for reviewing synthetic household finance records. The frontend owns presentation, accessible filters, charts, local theme preference, and CSV import/export interactions; the API owns validation and persistence.

## Run

Use Node.js 22.13 or newer. Start the API first; setup and database configuration are in the [backend README](https://github.com/gopichand-retail-apps/wealthtrack-backend/blob/main/README.md).

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5901`. The strict `version/appId/locale/messages/data` content model is `public/wealthtrack-model.json`; it points to the local API at `http://127.0.0.1:5902/api/v1`.

## Checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:cov
npm audit
npm run test:e2e
VITE_IS_MOCK=false npm run test:e2e
```

The coverage command enforces at least 90% statements, branches, functions, and
lines across production source, excluding only the Vite startup bootstrap
`src/main.tsx`. Each E2E command builds production assets into ignored
`node_modules/.cache/wealthtrack-e2e`, starts isolated frontend/API services on
ports 5903/5904 with in-memory SQLite, serves that bundle, and runs Chromium
flows. The test API uses a higher per-minute request limit so the full suite
does not trip its normal runtime limit; production behavior remains
model-configured. E2E does not reuse existing services or replace the normal
`dist/` output. Set `WEALTHTRACK_FRONTEND_PORT` and `WEALTHTRACK_API_PORT` to
choose other free test ports. Install the browser once with
`npx playwright install chromium` if needed.

## Architecture and limits

See the canonical [architecture](docs/architecture.md), [security boundary](docs/architecture.md#8-security-privacy-and-egress), and [quality status](docs/architecture.md#13-dated-verification-and-limitations). The UI uses a typed API client with Zod response validation and abortable data requests. It does not connect to banks, provide financial advice, authenticate users, or enforce household ownership. Use synthetic data only; the local-only app is not suitable for external exposure.

API failures are mapped from stable error codes to the public model's localized messages; backend-provided message text is not rendered.

## Vercel frontend configuration

Import this frontend's GitHub repository as its own Vercel project. Set **Root Directory** to the repository root (`./`), **Node.js Version** to **24.x**, and keep the checked-in [vercel.json](vercel.json). It selects Vite, dist output, and browser-route fallback with `npm ci` and `npm run build`. The SPA fallback excludes /api and /socket.io so missing backend routes do not return HTML.

Set `VITE_IS_MOCK=true` and `VITE_MOCK_API_BASE_URL` to an approved isolated HTTPS API **base including /api/v1**. For the other selector, set `VITE_IS_MOCK=false` and `VITE_REAL_API_BASE_URL`. The [environment template](.env.vercel.example) lists exact names; it is documentation, not an automatically loaded production configuration. Replace its reserved .invalid host. Changing mode or endpoints requires a new build/deployment. Both selectors still call an API; neither creates a browser-only backend or real provider integration.

Production Vite assets do not contain the development proxy; requests use the configured absolute API URL. A hosted API needs independently verified identity, persistence, exact origin/CORS and session/CSRF settings. Existing APIs remain local-only; localhost in a deployed bundle would point at the visitor or build machine.

The configuration adds noindex, frame/content-type/referrer/permission protections and no-store for the active UI model. Headers and noindex do not provide access control. Keep preview deployment protection enabled and use synthetic data. Hosted routing, cookies, headers, and user workflows have **not** been verified; no deployment is performed.

Known release gaps: No sign-in, household ownership, or bank integration. Use synthetic CSVs only; formatting, bundle, identity, persistence, and import isolation work remain.
