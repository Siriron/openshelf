<div align="center">

<img src="./public/favicon.svg" width="88" alt="OpenShelf logo" />

# OpenShelf

### Escrow for open-science dataset deposits: validators settle each term from Zenodo's own record.

<br />

![Status](https://img.shields.io/badge/status-building-yellow?style=flat-square)
![Network](https://img.shields.io/badge/network-StudioNet-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-1f4d3f?style=flat-square)

<br />

**[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/openshelf.py)** &nbsp;·&nbsp; **[Deployment](./docs/deployment.md)**

</div>

<br />

---

## What this is

A client escrows a fee and writes what a finished dataset deposit must look like, in plain language. The provider publishes the data on Zenodo and files the record number. GenLayer validators read Zenodo's own record and judge every term separately, so the fee splits by what was actually delivered instead of by whoever argues better.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Term-by-term escrow for open-science dataset deposits |
| **Consensus need** | The client gains from "not met" (keeps the fee), the provider from "met" (is paid); neither controls Zenodo |
| **Evidence source** | Zenodo's public record, fetched by every validator from the filed record number, never from a submitted URL |
| **Network** | StudioNet (temporary test network; see Status) |

</div>

<br />

---

## How it works

**Boundary.** Client escrows fee and locked terms -> provider files a Zenodo record number -> every validator fetches `zenodo.org/api/records/<id>` and reduces it to fixed facts -> a model judges each term -> validators must agree on the record and on every verdict (equivalence principle: exact match, no tolerance) -> plain code splits the fee -> each party claims its credit.

- **Frontend owns:** wallet connection, reads, forms, the in-app `/guide` test walk-through, transaction states
- **Contract owns:** escrow, locked terms, deterministic gates, the validator comparison rule, the fee arithmetic, every exit path
- **External sources own:** the deposit record; validators re-fetch and compare it

**Evidence sources:**

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| zenodo.org | `/api/records/<digits>` built from the filed number | `web.get` | `id` echo, `status`, `created`, `metadata` (title, description, keywords, license, access, type, creators), `files[]` (key, size, checksum) |

1. The client opens a job: 1 to 5 terms, the provider wallet, a 1 to 30 day deadline, the fee in GEN. Terms are locked before any work exists.
2. The contract derives a claim token from the job id and the provider's address. The provider puts it in the description, title or keywords of their Zenodo record.
3. The provider files the record number (three filings per job). Gates, in plain code: the record's own id matches, it is published, it carries the token, it was created after the job opened, and it has not served another job. A failing gate reverts and uses no filing.
4. Validators judge each term. All met settles immediately; otherwise the provider may accept the partial result, and anyone may settle after the deadline or after three filings. Provider share is `fee * terms_met // terms`.

<br />

<details>
<summary><b>The graded verdict</b></summary>
<br />

Each term is `MET` or `NOT_MET`, and the payout is a deterministic function of how many are met. The model never produces an amount. Anything other than `MET` counts as `NOT_MET`, and a wrong number of verdicts reverts and writes nothing.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0xc255bFb1Dd218Dc6e71b21654CBC785c82070348` | [View](https://explorer-studio.genlayer.com/address/0xc255bFb1Dd218Dc6e71b21654CBC785c82070348) |

StudioNet is a temporary test network: deployed addresses may not survive resets. The repository tests below are the proof of behavior, not the address.

</div>

<br />

---

## Quick start

```bash
npm install
npm run dev
```

Run the contract tests (they execute the real contract under the GenVM SDK in direct mode):

```bash
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint check contracts/openshelf.py
pytest tests -q -p no:cacheprovider
```

The tests pin GenVM v0.2.16 (`sdk_version` in every deploy). Unpinned, `genlayer-test` resolves GitHub's latest GenVM release, which can be a release candidate whose bundle is not published.

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/openshelf.py             The GenVM contract
tests/test_openshelf.py            Direct-mode tests that execute the real contract
pytest.ini                         Makes unused test mocks fail the suite
scripts/                           UI-vs-ABI checkers
.github/workflows/ci.yml           Lint + tests + frontend build on every push
src/                               React + Vite app (includes the /guide test walk-through and /docs)
docs/                              architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                            MIT
```

<br />

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/direct--mode%20tests-107%20passing-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/live%20StudioNet%20run-untested-yellow?style=flat-square)

</div>

107 direct-mode tests pass (`pytest tests -q -p no:cacheprovider`), `genvm-lint check` and `typecheck` report 0 errors, and the frontend type-checks and builds. The tests load the real contract and run its real leader and validator functions, mocking only Zenodo and the model; planted bugs (a wrong status attribute, a validator that skips term comparison, a removed token gate, a removed identity echo, a payout off-by-one, a claim that does not zero the balance) were each shown to fail the suite. They do **not** prove real model behavior, the live Zenodo payload beyond its documented fields, or real multi-node timing. The contract is deployed to StudioNet but has not yet been exercised by a live filing, and the frontend has not been run against it.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com)

</div>
