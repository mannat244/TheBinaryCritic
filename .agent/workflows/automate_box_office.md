---
description: Set up Daily Automation (Cron) for Box Office Agent
---

# Automating the Box Office Agent

To make the agent run automatically every day at 2 PM IST (approx 8:30 AM UTC), you need to trigger the `/api/agent/box-office` endpoint.

## Option 1: Vercel Cron (Recommended)

If you are hosting on Vercel, this is the easiest way.

1. Create a file named `vercel.json` in your root directory (if it doesn't exist).
2. Add the `crons` configuration:

```json
{
  "crons": [
    {
      "path": "/api/agent/box-office",
      "schedule": "30 8 * * *"
    }
  ]
}
```
*Note: `30 8 * * *` is 8:30 AM UTC.*

## Option 2: GitHub Actions

If you want to run it from your repo without Vercel Cron.

1. Create `.github/workflows/box-office-scheduler.yml`.
2. content:

```yaml
name: Box Office Scheduler

on:
  schedule:
    # Runs at 08:30 UTC daily
    - cron: '30 8 * * *'

jobs:
  ping-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X POST https://thebinarycritic.in/api/agent/box-office \
          -H "x-api-secret: ${{ secrets.CRON_SECRET }}"
```

## Option 3: External Cron (cron-job.org)

1. Sign up/Log in.
2. Create Cron Job.
3. **URL**: `https://thebinarycritic.in/api/agent/box-office`
4. **Method**: `POST`
5. **Headers**: Key: `x-api-secret`, Value: `[Your-Secret-Value]`
6. **Schedule**: Daily at desired time.
