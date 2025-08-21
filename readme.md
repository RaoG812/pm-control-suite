# OINTment

Early documentation and starter UI for the Onboarding Insights Neural Toolset. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture, data model, and execution plan.

## Toolset / Mission Control

The Toolset dashboard (aka Mission Control) exposes project health metrics once the **Apply OINT** job has completed. The job can be triggered from the home page, the roster page, or directly from `/toolset`. Until the job succeeds, Mission Control stays in an idle state. A mock server job flips to `success` after about three seconds.

## Getting Started

```bash
pnpm i
pnpm dev
```

The home page now links to key interfaces:

- **Upload ZIP / GitHub Repo** &mdash; manual ingestion or GitHub analysis at `/ingest`
- **View Matrix** &mdash; integration matrix prototype at `/matrix`
- **3D Map** &mdash; commit map at `/3d-map`

`pnpm test` runs a TypeScript type check.

*Binary assets such as `.ico` files are intentionally excluded.*

## Integration Matrix

The `/matrix` page inspects this project's `package.json` to list real dependencies.
For each dependency, the server resolves a homepage and displays its favicon via
Clearbit, providing a quick visual snapshot of the stack along with placeholder
readiness scores. Beneath the matrix, expandable widgets surface risk and
coverage details, a progress timeline, and a pie chart showing the distribution
of integration categories.

## Manual Ingestor

Upload a repository ZIP or point to a GitHub repo/branch at `/ingest` to trigger
an analysis run. Provide an API key for language model analysis via
`AIML_API_KEY` (uses [aimlapi.com](https://aimlapi.com) by default); the app now
targets the `gpt-5` chat model and automatically falls back to `gpt-4o` if
needed. The last
ingest result along with your selected repo and branch are cached in the browser
so you can navigate away and return without losing context. Below the console,
AI‑extracted takeaways and metrics render in animated widgets.

Click a row on the Matrix page to drill into indicator explanations, improvement
tips and code references gathered from the repo.

The code reference API now searches the entire workspace using `ripgrep`,
surfacing up to twenty matching lines across TypeScript, JavaScript, and JSON
files instead of only showing `package.json` entries.
