# Frontend

React + Vite + `genlayer-js`. The deployed address is one constant in `src/config/chains.ts`.

* Reads use `createClient({ chain: studionet })`; writes use the plain wallet address as `account`, `provider: window.ethereum`, `ensureChain()` before every write, `value` passed explicitly, receipts awaited with `{ retries: 120, interval: 4000 }`, and a distinct timeout error carrying the tx hash.
* **Success is never inferred from ACCEPTED.** After a write is accepted the app reads the receipt's execution result and then re-reads contract state; only a real state change counts. A refused call shows "no change" with the reason.
* Accepted is shown as "provisional, appealable"; a "check finality" button makes one status read. Payout text says it is queued until finalization.
* Rate limits: no polling anywhere; reads happen on load and on a Refresh button; receipts are polled only for the user's own pending transaction.
* IDs: the job id after `open_job` comes from `get_last_job(client)`, never from a global counter.

## Routes

`/` home, `/jobs`, `/jobs/:id`, `/new`, `/guide` (test walk-through), `/docs`, anything else is a styled 404. An error boundary wraps the app.

## Test guide (`/guide`)

Scenario dropdown (full delivery, partial delivery, refused record, no-show refund), each with description and expected outcome. Steps are labelled by acting wallet, forms open pre-filled, a step turns done only when on-chain state shows its result, runs have a resumable ID, and the copyable transaction log shows action, status, execution result and hash.

## UI vs ABI check

`python scripts/check_ui_vs_abi.py contracts/openshelf.py src` (the stock `check_frontend_vs_schema.py` is also included but only sees direct `readContract`/`writeContract` literals, not this app's wrappers).
