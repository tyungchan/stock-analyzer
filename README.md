# AI Stock Analyzer

A multi-provider AI stock analysis dashboard with technical indicators, entry timing, risk factors, catalysts, and buy/hold/avoid signals.

## Features

- React and Vite frontend
- Express API server
- Provider and model settings panel
- Server-side or per-request API keys
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

API keys can be configured in `.env` or entered in the application settings panel.

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
```

Only configure the providers you plan to use. Never commit your `.env` file.

## Commands

```bash
npm run dev        # Run the frontend and API server
npm run build      # Build the frontend
npm start          # Run the production API server
npm run preview    # Preview the frontend build
```

## Disclaimer

This project provides AI-generated information for educational purposes. It is not financial advice. Verify market data independently and consult a licensed financial adviser before making investment decisions.
