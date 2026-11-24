# Contract reference: `contracts/openshelf.py`

Stable v0.2 API, runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.

| Method | Kind | Who | Effect |
|---|---|---|---|
| `open_job(title, terms, provider, days)` | write, payable | client | escrows `msg.value`, locks 1-5 terms (8-200 chars each), provider, 1-30 day deadline; returns `{id, fee, token, deadline}` |
| `file_deposit(job_id, record_id)` | write, consensus | provider | up to 3 filings; judges every term; settles at once if all met |
| `settle(job_id)` | write | provider any time; anyone after deadline or 3 filings | credits the split |
| `claim()` | write | any | transfers the caller's credited balance |
| `get_job(job_id)` | view | any | job, terms, token, latest and best rulings |
| `get_jobs(offset, limit)` | view | any | up to 25 jobs |
| `get_balance(address)` | view | any | claimable wei as a string (address casing normalised) |
| `get_last_job(address)` | view | any | newest job id opened by that client |

Amounts are returned as strings because a JavaScript number cannot hold 1 GEN in wei exactly.

## State machine

`OPEN -> SETTLED`. No other states, no dead ends: the provider can settle early, and anyone can settle once the deadline passes or three filings are used, so no fee is ever locked.

## Verdicts

Each term is `MET` or `NOT_MET`. Any other text from the model counts as `NOT_MET`. A wrong number of verdicts reverts with `[LLM_ERROR]` and writes nothing.

## Deliberate gaps

- File contents are not opened; terms are judged from metadata and file listings.
- Zenodo can edit a published record's metadata; a ruling reflects the record as validators read it at filing time.
- `reasons` are shown but not compared across validators.
- The Zenodo field names are taken from Zenodo's documented record format and have not been exercised against the live API from this repository; the tests mock them.
