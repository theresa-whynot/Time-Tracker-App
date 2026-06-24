from datetime import date, datetime, time, timedelta, timezone

def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def range_bounds_for_day(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def range_bounds_for_week(start_day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(start_day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=7)


def current_week_start() -> date:
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())
