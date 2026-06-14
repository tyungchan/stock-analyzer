# AI Stock Analyzer

A multi-provider AI stock analysis dashboard with technical indicators, entry timing, risk factors, catalysts, and buy/hold/avoid signals.

## Features

- React and Vite frontend
- Express API server
- Server-controlled provider and model
- API keys stored outside the application
- Support for Anthropic, OpenAI, Google Gemini, Groq, Mistral, DeepSeek, and OpenRouter
- RSI, MACD, moving averages, Bollinger Bands, support, and resistance analysis

## Project Structure

```text
stock-analyzer/
|-- server/
|   |-- index.js
|   `-- providers.js
|-- src/
|   |-- App.jsx
|   `-- main.jsx
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- README.md
`-- vite.config.js
```

## Getting Started

```bash
git clone https://github.com/tyungchan/stock-analyzer.git
cd stock-analyzer
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

For local development, configure secrets in an untracked `.env` file. The browser
never receives or submits an LLM API key.

## Environment Variables

```text
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
PORT=3001
ANALYSIS_PROVIDER=anthropic
ANALYSIS_MODEL=claude-haiku-4-5-20251001
APP_ACCESS_TOKEN=replace-with-a-long-random-value
RATE_WINDOW_MS=60000
RATE_MAX=3
DAILY_MAX=50
```

Only configure the providers you plan to use. Never commit your `.env` file.

## Cloud Run Deployment

This application is designed to run as one Cloud Run service. Express serves
both the built React frontend and `/api` endpoints.

Enable the required services:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

Create the LLM API key and application access code as secrets:

```bash
printf "YOUR_LLM_API_KEY" | gcloud secrets create anthropic-api-key --data-file=-
openssl rand -base64 32 | gcloud secrets create stock-analyzer-access-token --data-file=-
```

Grant the Cloud Run service account access to both secrets:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stock-analyzer-access-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

Deploy with conservative cost limits:

```bash
gcloud run deploy stock-analyzer \
  --source . \
  --region australia-southeast1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --cpu 1 \
  --memory 512Mi \
  --concurrency 5 \
  --timeout 300 \
  --set-env-vars="ANALYSIS_PROVIDER=anthropic,ANALYSIS_MODEL=claude-haiku-4-5-20251001,RATE_MAX=3,DAILY_MAX=50" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,APP_ACCESS_TOKEN=stock-analyzer-access-token:latest"
```

Retrieve the access code when you need to use the application:

```bash
gcloud secrets versions access latest --secret=stock-analyzer-access-token
```

Enter that value in the application's **Private access code** field. This code
protects use of the server-side paid API key; it is not the LLM API key itself.

### Cost Controls

- `--min-instances 0` allows scale-to-zero.
- `--max-instances 1` prevents traffic from multiplying LLM usage across instances.
- `DAILY_MAX=50` caps attempted analyses per running instance per UTC day.
- `RATE_MAX=3` limits each client IP to three requests per minute.
- Use an economical model such as Haiku or a small/flash model.
- Configure billing budgets and provider-side spending limits as a final safeguard.

## Commands

```bash
npm run dev        # Run the frontend and API server
npm run build      # Build the frontend
npm start          # Run the production API server
npm run preview    # Preview the frontend build
```

## Disclaimer

This project provides AI-generated information for educational purposes. It is not financial advice. Verify market data independently and consult a licensed financial adviser before making investment decisions.
