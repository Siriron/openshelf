# Architecture

**Boundary.** Client escrows a fee and locks terms, provider files a Zenodo record number, every validator fetches the record and judges each term, validators must agree on the record and every verdict, plain code splits the fee, each party withdraws its own credit.

| Owner | Responsibility |
|---|---|
| Frontend | wallet connection, reads, forms, the `/guide` test walk-through, transaction states |
| Contract | escrow, locked terms, deterministic gates, verdict comparison rule, fee arithmetic, bounded exits |
| Zenodo | the deposit record itself (validators re-fetch and compare it) |

## Evidence source

| Host | URL pattern | Fetch method | Deciding fields |
|---|---|---|---|
| zenodo.org | `/api/records/<digits>`, built from the filed number, never from a URL | `web.get` | `id` (identity echo), `status`, `created`, `metadata.title / description / keywords / license.id / access_right / resource_type / creators`, `files[].key / size / checksum` |

The reduced record keeps only fields that are stable across requests. `modified`, download statistics and links are dropped, so independent validators compare the same thing.

## Who benefits from a false verdict

The client gains from "NOT_MET" (keeps the fee), the provider from "MET". Neither controls the evidence host.

## Gates (plain code, nothing a prompt can override)

1. The record's own `id` equals the filed number (identity echo).
2. The record is `published` when it states a status.
3. The record carries this job's claim token (`openshelf-<job>-<first 6 hex of provider>`) in title, description or keywords. Only a record's depositor can edit it, so a record that is not the provider's can never be filed.
4. `created` is later than the job's opening time.
5. The record has not served another job.

A failing gate reverts with an `[EXPECTED]` error and uses none of the three filings.

## Validator rule

Re-derive and compare the whole reduced record and every term verdict, zero tolerance (both are discrete). `reasons` and `note` are display text and are not compared. Errors are classified: an `[EXPECTED]` error must reproduce exactly, `[TRANSIENT]` needs both sides transient, anything else disagrees. The payout is never an LLM output.

## Settlement

`provider share = fee * best_met // total_terms`, client gets the remainder. All terms met settles immediately. Otherwise the provider may settle early; anyone may settle after the deadline or after three filings. Credits are pulled with `claim()`, which zeroes and persists the balance before transferring.
