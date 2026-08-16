import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_build() -> None:
    print("Running frontend/Electron build...")
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)


def run_backend_smoke() -> None:
    sys.path.insert(0, str(BACKEND))

    from fastapi.testclient import TestClient
    from app.main import app

    suffix = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    client_name = f"Smoke Client {suffix}"
    edited_client_name = f"Smoke Edited Client {suffix}"
    task_name = f"Smoke Task {suffix}"
    edited_task_name = f"Smoke Edited Task {suffix}"
    now = datetime.now(timezone.utc).replace(microsecond=0)

    with TestClient(app) as client:
        print("Checking health endpoints...")
        health = client.get("/health")
        check(health.status_code == 200, health.text)
        check(health.json() == {"status": "ok"}, "GET /health returned unexpected payload")
        head_health = client.head("/health")
        check(head_health.status_code == 200, "HEAD /health did not return 200")

        print("Checking timer start/active/stop flow...")
        started = client.post(
            "/timer/start",
            json={
                "client_name": client_name,
                "project_name": "General",
                "task_name": task_name,
                "description": "Smoke timer entry",
            },
        )
        check(started.status_code == 200, started.text)
        active = client.get("/timer/active")
        check(active.status_code == 200, active.text)
        check(active.json()["task_name"] == task_name, "Active timer did not match started task")
        stopped = client.post("/timer/stop")
        check(stopped.status_code == 200, stopped.text)
        stopped_entry = stopped.json()
        check(stopped_entry["ended_at"] is not None, "Stopped timer did not receive ended_at")

        print("Checking catalog endpoints...")
        clients = client.get("/clients")
        projects = client.get("/projects")
        tasks = client.get("/tasks")
        check(clients.status_code == 200, clients.text)
        check(projects.status_code == 200, projects.text)
        check(tasks.status_code == 200, tasks.text)
        check(any(item["name"] == client_name for item in clients.json()), "Client was not listed")
        check(any(item["name"] == task_name for item in tasks.json()), "Task was not listed")
        deleted_timer = client.delete(f"/time-entries/{stopped_entry['id']}")
        check(deleted_timer.status_code == 204, deleted_timer.text)

        print("Checking manual create/edit/delete flow...")
        manual_start = now + timedelta(hours=1)
        manual_end = manual_start + timedelta(minutes=20)
        manual = client.post(
            "/time-entries/manual",
            json={
                "client_name": client_name,
                "project_name": "General",
                "task_name": task_name,
                "description": "Manual smoke description",
                "notes": "Manual smoke note",
                "started_at": manual_start.isoformat(),
                "ended_at": manual_end.isoformat(),
            },
        )
        check(manual.status_code == 200, manual.text)
        manual_entry = manual.json()
        check(manual_entry["duration_seconds"] == 1200, "Manual duration was not 20 minutes")

        invalid_manual = client.post(
            "/time-entries/manual",
            json={
                "client_name": client_name,
                "project_name": "General",
                "task_name": task_name,
                "started_at": manual_end.isoformat(),
                "ended_at": manual_start.isoformat(),
            },
        )
        check(invalid_manual.status_code == 422, "Invalid manual range should fail")

        edited_start = manual_start + timedelta(minutes=5)
        edited_end = edited_start + timedelta(minutes=45)
        edited = client.patch(
            f"/time-entries/{manual_entry['id']}",
            json={
                "client_name": edited_client_name,
                "project_name": "General",
                "task_name": edited_task_name,
                "description": "Edited smoke description",
                "notes": "Edited smoke note",
                "started_at": edited_start.isoformat(),
                "ended_at": edited_end.isoformat(),
                "seconds_adjustment": 300,
            },
        )
        check(edited.status_code == 200, edited.text)
        edited_entry = edited.json()
        check(edited_entry["client_name"] == edited_client_name, "Client edit did not persist")
        check(edited_entry["task_name"] == edited_task_name, "Task edit did not persist")
        check(edited_entry["description"] == "Edited smoke description", "Description edit did not persist")
        check(edited_entry["notes"] == "Edited smoke note", "Notes edit did not persist")
        check(edited_entry["duration_seconds"] == 3000, "Edited duration + adjustment should be 50 minutes")

        print("Checking day/week summaries...")
        day_summary = client.get(f"/summaries/day?day={manual_start.date().isoformat()}")
        week_start = (manual_start.date() - timedelta(days=manual_start.weekday())).isoformat()
        week_summary = client.get(f"/summaries/week?start_day={week_start}")
        check(day_summary.status_code == 200, day_summary.text)
        check(week_summary.status_code == 200, week_summary.text)
        check(
            any(bucket["task_name"] == edited_task_name for bucket in day_summary.json()["buckets"]),
            "Edited task was missing from day summary",
        )
        check(
            any(bucket["task_name"] == edited_task_name for bucket in week_summary.json()["buckets"]),
            "Edited task was missing from week summary",
        )

        deleted = client.delete(f"/time-entries/{manual_entry['id']}")
        check(deleted.status_code == 204, deleted.text)
        deleted_again = client.delete(f"/time-entries/{manual_entry['id']}")
        check(deleted_again.status_code == 404, "Deleting a missing entry should return 404")

        print("Backend smoke checks passed.")


def main() -> None:
    run_backend_smoke()
    run_build()
    print("Smoke test completed successfully.")


if __name__ == "__main__":
    main()
