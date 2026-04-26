# AI Cost Optimization Dashboard

**Route:** `/ai/cost-dashboard`
**Added:** AA09 (P95)
**Plugin required:** `ai` (paid bundle)

## Overview

The AI Cost Optimization dashboard shows how much you are spending on AI requests and where you can save money by routing task types to cheaper models without losing quality.

## Features

- **Optimization Score** (0–100): percentage of available savings that routing rules are currently capturing.
- **Recommendations panel**: top 5 highest-savings suggestions with one-click Apply.
- **Routing rules table**: active rules, target models, estimated monthly savings, and disable controls.
- **Re-analyze button**: triggers an on-demand scan of the last 30 days of requests.

## API Endpoints (internal auth)

| Method | Path | Description |
| ------ | ---------------------------- | -------------------------------------------- |
| `GET` | `/ai/cost/report` | Recommendations for last N days (`?days=30`) |
| `GET` | `/ai/cost/savings` | Projected total monthly savings |
| `GET` | `/ai/cost/score` | Optimization score 0-100 |
| `GET` | `/ai/cost/rules` | Active routing rules |
| `POST` | `/ai/cost/rules` | Apply a recommendation as a rule |
| `POST` | `/ai/cost/rules/:id/disable` | Disable a routing rule |
| `POST` | `/ai/cost/analyze` | Trigger on-demand analysis |

## Quality Sampling

When a routing rule is active, 5% of requests are still sent to the original (more expensive) model. The engine computes cosine similarity between both outputs. If the difference exceeds 0.15, the rule is flagged for review in the dashboard.

## Navigation

The dashboard is linked from the **AI** section in the left sidebar under **Cost Optimization**.
