# WealthTrack Frontend

WealthTrack is a local React + TypeScript workspace for reviewing synthetic household finance records. The frontend owns presentation, accessible filters, charts, local theme preference, and CSV import/export interactions; the API owns validation and persistence.

## Run

Use Node.js 22.13 or newer. Start the API first; setup and database configuration are in the [backend README](../wealthtrack-backend/README.md).

```sh
npm install
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

See the canonical [architecture](../docs/architecture.md), [security boundary](../docs/security/README.md), and [quality status](../docs/quality.md). The UI uses a typed API client with Zod response validation and abortable data requests. It does not connect to banks, provide financial advice, authenticate users, or enforce household ownership. Use synthetic data only; the local-only app is not suitable for external exposure.

API failures are mapped from stable error codes to the public model's localized messages; backend-provided message text is not rendered.
