# MoneyMind

MoneyMind is an AI-powered personal finance assistant that helps users understand spending, identify patterns, monitor budgets, and evaluate progress toward financial goals.

Rather than acting as a simple expense tracker, the project uses an agentic workflow to analyze expense input, retrieve historical spending data, detect patterns, estimate spending trends, and generate financial decisions.

## Key Features

- Natural-language expense analysis
- Expense categorization and tracking
- MongoDB-backed spending memory
- Spending-pattern detection
- Daily budget monitoring
- Goal-progress evaluation
- Spending trend and prediction logic
- Interactive financial dashboard

## Agentic Workflow

MoneyMind uses LangGraph to coordinate multiple processing stages:

1. **Analyze** — interprets an expense entered by the user
2. **Memory** — retrieves previous expenses from MongoDB
3. **Pattern Detection** — identifies spending behaviour
4. **Prediction** — evaluates spending trends against the daily budget
5. **Goal Evaluation** — checks whether current behaviour supports the user's savings target
6. **Decision** — produces a final recommendation based on the gathered state

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **AI / Agents:** LangChain, LangGraph, Google Generative AI, Groq SDK
- **Database:** MongoDB
- **Visualization:** Recharts

## Project Structure

```text
src/
├── app/          # Next.js application routes and pages
├── components/   # Reusable UI components
└── lib/
    ├── agent.ts      # LangGraph workflow
    ├── ai.ts         # AI expense analysis
    ├── decision.ts   # Financial decision logic
    └── mongodb.ts    # MongoDB connection
```

## Getting Started

```bash
git clone https://github.com/Nadula-W/MoneyMind.git
cd MoneyMind
npm install
npm run dev
```

Create the required environment variables for the configured AI provider and MongoDB connection before starting the application.

## Why I Built This

This project explores how agentic AI can be applied to a practical problem where an application needs more than a single LLM response. The goal was to combine persistent data, deterministic financial logic, AI analysis, and multi-step orchestration in one system.

## Status

Active learning / development project focused on agentic AI architecture and applied personal-finance automation.
