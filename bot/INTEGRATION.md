# Shared pilot integration candidate

Base: `f8481101d5dbf136b07659a28a3b908493ade655`. Rules/catalog: V25.
Policy: hand-size predicate `<9` plus `P3-shared-investment-v2.3-common-horizon-candidate`.
Deployment profile: `intermediario` / `equilibrado`, search budget **500**.
Do not infer combined validation from the historical 400-match battery.

The server code enables this candidate by default. Explicit `RUNAMARCA_SHARED_BOT=0`
selects legacy rollback; no Render settings were changed during preparation.
Other level/style values are rejected by the reviewed asynchronous adapter.
Lobby, mulligan and mandatory discard still use the legacy protocol; prep,
forging, vote and formation use the shared policy.

One worker performs CPU search. Only sanitized canonical observations and the
bot's own decision memory cross the worker boundary. Queue capacity is eight;
each active decision has a 10-second deadline, distinct from queue wait.
Revision, phase, turn, actor, match identity and cancellation epoch are revalidated
before dispatching queued work and before accepting an action.
The server checks that the room still exists before applying it.
On failure/deadline the active room is quarantined: its decision is rejected and
never automatically retried. Queued rooms have not been sent to the worker yet.
After awaiting termination, the bridge creates one replacement and processes
still-current queued work. Maximum two replacements per bridge lifetime; after
that, or failed replacement initialization, all pending work fails explicitly.
No overlapping workers, unlimited restart loop, budget change or silent policy
fallback. Quarantined rooms require investigation; a new room is a new identity.
The host queue can wait behind other decisions/recovery; no latency SLA is claimed.
Queue-full alone is treated as temporary pressure: the room scheduler retries
up to three times at 700ms, then reports interruption. `clear` invalidates pending
results even if the room revision is unchanged; it does not preempt computation
already executing. Worker CPU deadlines still bound that computation.

`runner/source/manifest.json` validates every loaded module and data read.
An explicit absolute hostSourceRoot is required whenever enabled. Host modules
and snapshot must match. `.gitattributes` preserves the LF bytes
used by these hashes; regenerate intentionally if rules change, never disable
validation. Docker copies `bot` and starts Node with VM modules enabled.

Local test adapters (`accounts-offline-loader.mjs`, `tests/`) are for isolated
rule QA only, never production persistence. Production does not load that adapter.
Run `node --experimental-vm-modules --test bot/integration.test.mjs` for the
focused integration suite. Full server/database/Docker and visual QA remain
release gates; this candidate has not been deployed.
