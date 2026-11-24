# Deployment

**Status: deployed to StudioNet** at `0xc255bFb1Dd218Dc6e71b21654CBC785c82070348` ([explorer](https://explorer-studio.genlayer.com/address/0xc255bFb1Dd218Dc6e71b21654CBC785c82070348)). The Vercel frontend is not deployed yet; no live filing has been run.

1. Redeploying: deploy `contracts/openshelf.py` from studio.genlayer.com (no constructor arguments).
2. Paste the address into `src/config/chains.ts` (`CONTRACT_ADDRESS`), commit.
3. Deploy the frontend on Vercel (`vercel.json` already contains the SPA rewrite).

Network: StudioNet, chain id 61999, RPC `https://studio.genlayer.com/api`. StudioNet is temporary: deployed addresses may not survive resets, so the repository tests are the proof of behaviour, not an address.

## Run it locally

```bash
npm install && npm run dev
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint download --version v0.2.16
genvm-lint check contracts/openshelf.py && genvm-lint typecheck contracts/openshelf.py
pytest tests -q -p no:cacheprovider
```

Tests pin GenVM v0.2.16 (`sdk_version` in every deploy). Unpinned, `genlayer-test` resolves GitHub's latest GenVM release, which can be a release candidate whose bundle is not published.

## Testing status

Direct-mode tests load the real contract and run its real `leader_fn` / `validator_fn`; only Zenodo and the model are mocked. They cover every write method, every gate, the fee arithmetic, every validator-compared field changed in isolation, HTTP 403/404/500 and unreadable replies, malformed model output, access control with separate wallets, the pull-based claim, replay via snapshot/revert, and a `check_pickling` run.

They do **not** prove real model behaviour, the live Zenodo payload beyond its documented fields, or real multi-node consensus timing. A Run and Debug pass in Studio would cover that runtime-only layer. The frontend has been type-checked and built, not exercised against a live deployment.
