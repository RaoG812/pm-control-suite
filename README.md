# OINTment

It's a web app built with Next.js and React. 
It ingests repositories, maps dependencies, and visualizes the development flow to highlight integration gaps and develop an action plan.
![Новый проект](https://github.com/user-attachments/assets/fe9c377e-af8e-4306-93b4-d35807dc048b)

OINT stands for Onvoarding Insights Neural Toolset. 

## Features

- **Manual Ingest** &mdash; Upload a ZIP archive or specify a GitHub repository to run local analysis at `/ingest`.
- **Integration Matrix** &mdash; Inspect package dependencies and readiness at `/matrix`.
- **3D Commit Map** &mdash; Explore commit relationships in an interactive three.js scene at `/3d-map`.
- **GitHub App Integration** &mdash; Authorize a GitHub App to analyze private repositories.
- **AI‑Powered Analysis** &mdash; Summaries, roast comments, and AI artifact detection using `AIML_API_KEY` or `OPENAI_API_KEY`.

## Tech Stack

- [Next.js 14](https://nextjs.org) with React 18 and TypeScript
- Tailwind CSS for styling
- Chart.js and `react-chartjs-2` for data visualizations
- Three.js with `@react-three/fiber` for 3D views

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the interfaces.

### Environment Variables

Create a `.env.local` file with:

```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_TOKEN=your_personal_access_token # optional
AIML_API_KEY=your_aiml_api_key          # or OPENAI_API_KEY
AIML_API_BASE_URL=https://api.aimlapi.com/v1 # optional
OPENAI_API_KEY=your_openai_key          # optional
OPENAI_BASE_URL=https://api.openai.com/v1 # optional
LLM_MODEL=gpt-5                          # optional model override
                                        # tries gpt-5, then gpt-5-mini,
                                        # gpt-5-nano, gpt-5-chat-latest,
                                        # finally gpt-4o
```

### Scripts

- `npm run dev` &ndash; start the Next.js development server
- `npm run build` &ndash; create a production build
- `npm start` &ndash; run the production build
- `npm test` &ndash; type-check the project

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design details.

<img width="1347" height="694" alt="image" src="https://github.com/user-attachments/assets/155783f0-183c-494f-9eb8-ab07c4634547" />


**https://lablab.ai/event/co-creating-with-gpt-5**
