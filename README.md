# RecoveryIQ — AI-Powered Financial Recovery Decision Engine

> An AI system that answers three questions for every overdue payment or loan:
> **who to approach, what action to take, and why.**

**Live Demo:** _[link coming soon — deployment in progress]_
**Demo Login:** `agent@recoveryiq.com` / `password123`

---

## The Problem

Financial institutions deal with a large volume of overdue or failed payments —
missed EMIs, failed transactions, unpaid dues. It's hard to know which
customers to approach first and which recovery method (reminder, payment
link, human call) will actually work. This leads to delayed recoveries,
wasted collection effort, and lost revenue.

Most existing systems just flag overdue accounts and send generic automated
reminders. They don't compare *options*, don't estimate the *payoff* of a
decision, and don't *explain* their reasoning.

## What RecoveryIQ Does

For every overdue/failed case, RecoveryIQ:
1. **Predicts** the probability the case will be recovered (ML model)
2. **Compares** possible recovery actions (reminder, payment link, human
   follow-up) by their *expected recovery value* — probability × amount,
   weighted by how effective that action type typically is
3. **Recommends** the single best action
4. **Tracks NPA staging** (Standard → SMA-0 → SMA-1 → SMA-2 → NPA), the real
   regulatory risk progression used in Indian banking
5. **Explains** the recommendation in plain English and **drafts** the actual
   customer message, using Generative AI (Gemini)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ml-service     │     │      server       │     │      client      │
│  Python/FastAPI  │◄────│   Node/Express    │◄────│  React/Vite      │
│                  │     │                    │     │                  │
│  scikit-learn    │     │  MongoDB (Atlas)   │     │  Dashboard       │
│  model, serves   │     │  Decision Engine   │     │  Cases table     │
│  /predict        │     │  Gemini AI calls   │     │  Case details    │
└─────────────────┘     │  JWT auth          │     │  Model perf.     │
                         │  Excel import/export│     └─────────────────┘
                         └──────────────────┘
```

Three independent services, each doing one job well:
- **ml-service** only knows how to score a case's recovery probability —
  nothing about customers, decisions, or UI
- **server** orchestrates everything: calls the ML service, applies business
  rules, calls Gemini, stores data, serves the API
- **client** is a pure consumer of the backend's API — no business logic
  lives in the frontend

## Key Technical Decisions

**Hybrid ML + rules, not pure ML.** The ML model outputs a probability, not
an action. A hand-written decision engine translates that probability
(combined with NPA status) into a concrete recommendation:
```
if npa_status == "NPA" or recovery_probability < 0.3:  -> human_followup
elif recovery_probability > 0.7:                        -> reminder
else:                                                    -> payment_link
```
This reflects real collections logic that pure ML alone wouldn't capture —
e.g., an account already in NPA needs serious intervention regardless of a
borderline probability score.

**Model selection by ROC-AUC, not just accuracy.** Three models were trained
and compared:

| Model | Accuracy | ROC-AUC | Result |
|---|---|---|---|
| **Logistic Regression** | 80.9% | **0.8398** | **Selected (Champion)** |
| Gradient Boosting | 81.0% | 0.8247 | Benchmarked |
| Random Forest | 80.3% | 0.7953 | Benchmarked |

Logistic Regression was chosen despite *not* having the highest raw accuracy,
because it had the best ROC-AUC — a better measure of how well the model
ranks recoverable cases above non-recoverable ones, which matters more for
this use case than a fractional accuracy difference.

**Feature importance confirms sensible learning**, not noise-fitting — the
top features (`days_overdue`, `npa_status`, failure reason) line up with
real collections intuition, not arbitrary signals like transaction type.

**Graceful AI fallback.** If the Gemini API is unavailable or rate-limited,
the system falls back to template-based explanations using the same case
data, so the app never breaks — it degrades gracefully instead.

## Features

- ML-based recovery probability prediction with risk tiering
- Hybrid rule + ML decision engine with expected-recovery-value calculation
- NPA status tracking (Standard/SMA-0/SMA-1/SMA-2/NPA)
- Gemini-powered plain-English explanations and personalized customer
  messaging
- JWT authentication
- Full dashboard: KPIs, NPA distribution chart, case pipeline, case details,
  recovery actions log, model performance view
- Bulk case import/export via Excel

## Tech Stack

- **ML Service:** Python, FastAPI, scikit-learn, pandas
- **Backend:** Node.js, Express, MongoDB (Atlas), JWT, Google Generative AI SDK
- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Data handling:** SheetJS (xlsx) for bulk import/export

## Running Locally

Three services run independently:

```bash
# Terminal 1 — ML service
cd ml-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Backend
cd server
npm install
npm run dev

# Terminal 3 — Frontend
cd client
npm install
npm run dev
```

Copy `server/.env.example` to `server/.env` and fill in real values
(MongoDB URI, Gemini API key, JWT secret) before starting the backend.

Seed demo data:
```bash
cd server
npm run seed
```

## What I'd Improve With More Time

- Replace the recovery action simulator with real gateway/SMS webhooks
- Add a message queue for retry scheduling instead of synchronous calls
- Expand the training data beyond synthetic generation with anonymized
  real-world patterns
- Add role-based dashboards (agent vs supervisor views)
- Add automated tests for the decision engine's edge cases

---

*Built as a portfolio project exploring how ML predictions, rule-based
decisioning, and generative AI can combine into an explainable
decision-support system — not just a black-box classifier.*
