# Development

## Requirements

- Node.js 24 and npm. The preview uses Node's built-in `node:sqlite`.
- A current desktop Chrome or Edge browser for the best-tested camera path.
- A webcam for real movement testing. Logic tests do not require one.
- Python 3 only for optional browser-test setup and asset-download scripts.

```bash
npm ci
npm start
```

Open [http://localhost:4173](http://localhost:4173). The server reads the browser source directly, so no build is needed before starting. It binds to the loopback interface. A Node SQLite experimental warning, if emitted by your Node release, is expected.

Models and WASM runtimes are already bundled. The app needs no API keys. Camera access works on localhost; remote deployments require HTTPS. For Windows/WSL checkouts, run npm and the server inside WSL so the local SQLite database uses the native Linux filesystem. Avoid sharing one `node_modules` directory between Windows and Linux.

## Local feed and accounts

The preview creates `.local/feed-preview.sqlite` and applies the checked-in migrations. It uses the `local-preview-owner` identity by default. This is a development convenience, not a real login.

To preview as a guest on macOS/Linux/WSL:

```bash
RELAY_PREVIEW_IDENTITY=anonymous npm start
```

In PowerShell:

```powershell
$env:RELAY_PREVIEW_IDENTITY = 'anonymous'
npm start
```

Use another `RELAY_PREVIEW_IDENTITY` value to simulate a different account; restart the server after changes. Set `PORT` to use a different port. The server ignores incoming hosting identity headers and supplies only its configured preview identity.

Browser profiles, gestures, message drafts, and Creator drafts are separate from this feed database. Use a fresh browser profile for isolated manual testing; avoid deleting your actual calibration to reset a test.

## Repository layout

```text
dist/                   Browser source and bundled assets
  src/                  UI, recognition, and environment modules
  models/               Pinned face, hand, and handwriting models
  vendor/               Vision and ONNX runtimes with licenses
  data/                 Catalog and attributed word vocabulary
worker/                 Shared-feed API and built-in catalog seeding
db/                     Drizzle schema
drizzle/                Database migrations
scripts/                Local server, build, integrity checks, test setup
tests/                  Logic and browser regression scripts
docs/                   Architecture, setup, and real UI screenshots
```

Despite its name, `dist/` is the editable web root. `npm run build` generates `dist/client/`, `dist/server/`, and `dist/.openai/`; these are ignored. Do not delete `dist/` as a build-cleaning step.

## Validation

```bash
npm test
npm run check
npm run build
```

`npm test` runs the checked-in Node test suite. `npm run check` checks source syntax and verifies SHA-256 hashes of bundled models and runtimes. Build creates the client and worker output; it does not deploy the site.

Run this sequence after a clean `npm ci` before submitting a change. This repository does not include an automated GitHub workflow or deployment credentials.

### Browser regressions

Browser scripts use an installed Google Chrome and pinned Playwright Core in `.local/`:

```bash
python3 scripts/setup-browser-tests.py
```

Run the local server in another terminal. For a focused Creator check:

```bash
RELAY_PREVIEW_URL=http://localhost:4173 node tests/creator-interactions-browser.mjs
```

PowerShell equivalent:

```powershell
$env:RELAY_PREVIEW_URL = 'http://localhost:4173'
node tests/creator-interactions-browser.mjs
```

Some older browser scripts use a fixed preview port; inspect their `base`/URL setting before running them. Scripts write screenshots and temporary fixtures into ignored local directories. Install Chrome in the same operating system where you run the browser scripts.

Controlled camera landmarks test UI behavior and action gating. Static image fixtures test the bundled vision pipeline. Neither substitutes for real-user recognition evaluation. Rehearse with the intended camera before relying on a particular interaction.

## Build and hosting

The current live app uses Sites hosting with a D1 binding named `DB`. `.openai/hosting.json` identifies that existing project; it is not a credential. The generated Wrangler configuration contains a placeholder database ID and is not a ready-to-deploy standalone Cloudflare configuration.

For an independent deployment, configure your own host, database, migrations, static-asset binding, and trusted authentication gateway. The worker expects verified identity in `oai-authenticated-user-id`; never accept that header directly from an untrusted client. The loopback preview server is for development only.

Building or contributing to this repository does not update the hosted app. There is no automatic production deployment connected to this repository.

## Working on recognition

Preserve the distinction between observation, uncertainty, and activation. Missing tracking must cancel a pending selection rather than supply a valid-looking default. Keep visual trail smoothing separate from measurements used to recognize an action. Check old exported profiles and version-1 environments when changing schemas.

Use synthetic examples or consented, non-identifying fixtures in tests. Do not commit camera recordings, personal profiles, validation exports, private messages, or local databases. Model changes should preserve their source URLs, licenses, and integrity entries.
