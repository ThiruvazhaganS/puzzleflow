# PuzzleFlow API (Future)

Offline-first extension queues data locally. When you're ready to add cloud sync:

## Endpoints

```
POST /v1/devices/register     → { deviceId }
POST /v1/sync                   → bulk upsert sessions + events
GET  /v1/stats/daily?from=&to=
GET  /v1/stats/personal-best
```

## POST /v1/sync body

```json
{
  "deviceId": "uuid",
  "clientUpdatedAt": 1727000000000,
  "session": { "...Session" },
  "events": [{ "...PuzzleEvent" }]
}
```

## Postgres tables

- `devices(id, created_at)`
- `sessions(id, device_id, started_at, ended_at, solved, failed, ...)`
- `puzzle_events(id, session_id, result, timestamp, duration_ms, ...)`
- `daily_stats(device_id, date, solved, failed, ...)`

Conflict rules: events dedupe by `id`; personal bests merge with `max()`.
