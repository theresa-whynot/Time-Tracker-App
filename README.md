# Time-Tracker-App

Starting point for a desktop time tracker that records work by client, project,
and task.

## Stack

- Python + FastAPI backend
- SQLite local persistence via SQLModel
- React + Vite frontend
- Electron desktop shell

## What is included

- A local FastAPI API for:
  - starting and stopping a timer
  - tracking clients, projects, tasks, and time entries
  - daily and weekly summaries
  - manual time-entry adjustments after reviewing summaries
- A React dashboard that:
  - prompts for current client, project, task, and notes on launch
  - repeats the prompt on a configurable interval
  - shows the active timer and day/week summaries
  - lets the user adjust entries from the day summary
- An Electron shell that:
  - wraps the React app as a desktop app
  - briefly brings the app forward and flashes the window for prompts
  - releases always-on-top behavior automatically so prompts can be ignored

## Setup

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt
```

Install Node dependencies:

```bash
npm install
```

## Run in development

From the repository root, with the Python virtual environment activated:

```bash
npm run dev
```

This starts:

- FastAPI at `http://127.0.0.1:8000`
- Vite at `http://127.0.0.1:5173`
- Electron pointed at the Vite dev server

## Useful commands

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:electron
npm run build
```

## Prompt interval

The React app prompts every 30 minutes by default. Override this during
development with:

```bash
VITE_PROMPT_INTERVAL_MINUTES=5 npm run dev
```

## Data

The backend stores local SQLite data in `backend/data/time_tracker.db`. That
folder is ignored by git.
