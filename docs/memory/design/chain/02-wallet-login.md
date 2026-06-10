# 🔐 Wallet Login — sign in with Algorand (Design Codex · chain)

> Status: **⬜ planned** (design intent only — nothing in this doc is built unless tagged ✅).
> Read `../00-game-vision.md` first. This doc designs the replacement for API-key friction:
> a real player connects an Algorand wallet, proves control of it with a signature, and gets
> a game session — **without the chain ever becoming the source of gameplay truth.**

## Why this exists
Today a player's only credential is a per-player API key, returned exactly once at creation
(`src/growpodempire/api/game_api.py:54-57`) and checked constant-time on every write
(`src/growpodempire/api/auth.py:36`, `hmac.compare_digest`). That is correct, auditable — and
hostile to real players: lose the key, lose the account. The dev shortcut (`POST /players/guest`,
`game_api.py:62-86`) papers over the friction but is a find-or-create credential-discloser, which
is exactly why it shipped **secure-by-default OFF** behind `GPE_DEV_LOGIN`
(`src/growpodempire/config.py:119-128`, post-F016). The durable answer is the credential players
already hold on the chain we're heading to: their Algorand keypair. The wallet becomes the login;
the API key becomes plumbing.

**Non-negotiables inherited from Layer 0/1:** DB stays authoritative (the wallet *authenticates*,
it never *owns* gameplay state); writes require auth; security flags default OFF; CI never needs a
live key; no secrets in docs or repo.

---

## §1 Wallet connect on the web client ⬜

**Stack: `@txnlab/use-wallet` v4 (react adapter).** Verified current as of 2026-06: v4.6.0
(released 2026-02-21), with adapters for React/Vue/Solid/Svelte and providers for Pera, Defly,
WalletConnect, Exodus, Kibisis, Lute, and KMD (sources:
[GitHub — TxnLab/use-wallet](https://github.com/TxnLab/use-wallet),
[npm — @txnlab/use-wallet](https://www.npmjs.com/package/@txnlab/use-wallet)). It unifies
connect/disconnect/sign across wallets behind one `WalletManager`. *Assumption (docs were not
fetchable in this session):* v4 exposes ARC-60 `signData` per wallet — verify per-wallet support
before relying on it; keep the transaction fallback in §2 regardless.

Placement in the Next.js 15 app (`web/`):
- A `WalletManager` configured for **TestNet first** (network from `NEXT_PUBLIC_*` env), wrapped
  in a `WalletProvider` client component mounted beside the existing `SessionProvider` in the app
  providers tree. Game session state and wallet connection state stay **separate contexts**:
  disconnecting a wallet must not nuke an active game session, and vice versa.
- **SSR pitfalls** — the same class of bug the codebase already handles: wallet SDKs touch
  `window`/`localStorage` and WalletConnect pulls in browser-only deps. Everything wallet-touching
  is `"use client"`; defer reads to a post-mount effect exactly like `web/src/lib/session.tsx:33-37`
  (hydrate-from-localStorage in `useEffect`, render a `hydrated` gate); if a provider still breaks
  the server pass, `next/dynamic` with `ssr: false` the connect UI. Never read wallet state during
  render of a server component.
- The connect button lives on the onboarding/sign-in surface (today's key-entry flow in
  `web/src/lib/api/players.ts:14-22`) and in settings for linking (§3).

---

## §2 Sign-in with Algorand — challenge → sign → verify → session ⬜

A classic challenge–response, shaped to Algorand's signing surfaces.

**Step 1 — challenge.** `POST /auth/wallet/challenge` `{address}` (public, rate-limited via the
existing limiter — same posture as `game_api.py:63`). Server validates the address structurally
(reuse `_is_valid_algorand_address`, `src/growpodempire/services/game_service.py:75-85`; upgrade
to full algosdk checksum verification when algosdk is a dependency — the current check is format
only, by design). Server generates a **≥32-byte CSPRNG nonce**, stores it server-side keyed by
address with `issued_at` + **5-minute TTL** + `used=false`, and returns the canonical challenge.

**What gets signed — exactly this, nothing else:**
```
GROWv2 wants you to sign in.
This request costs nothing and sends no transaction.
domain:   <our origin>
address:  <58-char address>
nonce:    <base64 nonce>
issued:   <ISO-8601>
expires:  <ISO-8601, issued + 5m>
```
- **Preferred path: ARC-60 arbitrary-data signing with the AUTH scope** — the standard built for
  authentication, where the wallet hashes and domain-binds the payload (verified:
  [ARC-60, Algorand dev portal](https://dev.algorand.co/arc-standards/arc-0060/)).
- **Fallback path (wallets without `signData`): a never-broadcast zero-value transaction** — a
  self-payment, `sender == receiver == address`, `amount = 0`, `fee = 0`, `rekeyTo` absent,
  `closeRemainderTo` absent, the canonical challenge in the `note` field. The server verifies the
  ed25519 signature and **never submits it**; a lone zero-fee txn is also unbroadcastable below
  min-fee. This is the ARC-14 pattern — note ARC-14 is an **unmerged draft**
  ([ARCs PR #41](https://github.com/algorandfoundation/ARCs/pull/41)), so we treat it as prior
  art, not a spec; ARC-31 ("authentication with Algorand accounts") could not be verified this
  session — *assumption: draft, do not cite as final*.

**Step 2 — verify.** `POST /auth/wallet/verify` `{address, signature, payload}`. Server checks,
in order: nonce exists for this address, unused, unexpired (constant-time compare on the nonce);
payload fields byte-match what we issued (domain binding included); for the txn fallback, the
decoded txn matches the strict template above **field for field**; ed25519 signature verifies
against the public key decoded from the address (pure crypto — `algosdk`/`pynacl`, no network
call, no chain read: **the chain stays a mirror; even login never reads it**). On success the
nonce is **deleted (single-use)** and a session is issued (§3). On any failure: generic 403, nonce
still consumed after N failed attempts, attempt logged.

**Replay protection, stated flatly:** single-use server-stored nonce + 5-minute expiry + domain
binding + (fallback path) a txn that is structurally harmless and never broadcast. A captured
signature is worthless after first use or expiry, on any other domain, and on-chain.

---

## §3 Session model — wallet proof in, session out; the API key goes internal ⬜

**Recommendation: opaque server-side session token, not a JWT.** A 256-bit random token, stored
**hashed** in a `sessions` table (`player_id`, `token_hash`, `created_at`, `expires_at` ~7d
sliding, `revoked_at`), sent by the client on writes. This fits the house ethos better than JWT:
the DB is authoritative, revocation is an `UPDATE`, there is no signing-secret lifecycle, and the
audit trail is a table. (A signed JWT is acceptable if horizontal statelessness ever forces it —
record that as an ADR in `../../DECISIONS.md` if so.)

- **Transport:** because the web client proxies same-origin (`web/src/lib/api/client.ts:9-18`,
  Next rewrites), prefer an **httpOnly, Secure, SameSite=Lax cookie** — it takes the credential
  out of `localStorage` entirely, closing the XSS-exfiltration hole the current key storage has
  (`client.ts:22-45`, `session.tsx:39-44`). Header fallback (`Authorization: Bearer`) for
  non-browser clients.
- **`require_player` grows a second accepted credential:** session token *or* `X-API-Key`
  (`auth.py:20-40` keeps its constant-time discipline for both). The per-player API key
  **remains** as an internal/automation credential (scripts, bots, support tooling) — still
  returned once at creation, never displayed again. Reads stay public; writes stay authed;
  rate limits unchanged.

**Account linking rules:**
1. **One wallet ↔ one player.** App-level clash check exists today
   (`game_service.py:172-185`, flush-before-query per the autoflush=False lesson); the **DB
   unique index on `Player.algorand_address` is already backlogged** — it must land *before*
   wallet login ships (`db/models.py:46` is `index=True`, not unique, today).
2. **Wallet login resolution:** after §2 verification only — look up `Player` by
   `algorand_address`; if found, issue session for that player; if not found, **create a fresh
   player** bound to the address (this find-or-create is safe *only because the caller proved
   key control*; contrast F016). Optionally offer "link to existing account instead" — which
   requires presenting that account's API key or an active session.
3. **Existing API-key accounts** lose nothing: authenticate with the key (or current session),
   call the existing `POST /players/<id>/wallet/link` (`game_api.py:978-990`) — thereafter the
   wallet logs into the same player. The key keeps working.
4. **Guest → wallet upgrade without losing progress:** a guest account is a normal `Player` row
   (`game_service.py:133-149`); while its session is live, linking a wallet (rule 3) permanently
   upgrades it — same row, same ledger, same plants. Once linked, dev login for that username
   should be refused even where `GPE_DEV_LOGIN` is on: **a wallet-linked account may never be
   re-entered by username alone.**

---

## §4 Threat model — what wallet login newly exposes ⬜

| Threat | Mitigation |
|---|---|
| **Signature replay** (captured proof reused) | Single-use nonce, deleted on verify; 5-min expiry; domain in the signed payload; verify endpoint rate-limited. |
| **Nonce reuse / pre-issue flooding** | Server-stored, one live nonce per address (new challenge invalidates old); constant-time nonce compare; per-address + per-IP rate limit on `/challenge`. |
| **Malicious sign-request phishing** (we train players to sign blobs; an attacker imitates us with a real txn) | Prefer ARC-60 AUTH scope (wallets render it as auth, not a txn); fallback txn is strictly zero-amount/zero-fee/no-rekey/no-close and the payload says "sends no transaction"; never ask players to sign anything else for login. |
| **Find-or-create takeover** (the F016 class: `guest_login` find-or-create at `game_service.py:133` returns the key to anyone with a username) | Wallet find-or-create happens **only after signature verification**; lookup key is the proven address, never client-asserted; `GPE_DEV_LOGIN` stays default-OFF and is refused for wallet-linked accounts. |
| **Address squatting / clash race** | DB unique index on `algorand_address` (backlogged — required pre-ship) + existing app-level clash check with flush (`game_service.py:175`). |
| **Session theft via XSS** | httpOnly cookie (token never in JS-readable storage); hashed at rest; sliding expiry; logout = server-side revoke. |
| **Bogus address formats** | Structural 58-char base32 guard today (`game_service.py:75-85`); upgrade to checksum verification with algosdk before launch. |
| **Wallet compromise** | Blast radius = game session, **not** custody: the server never holds player mnemonics for login, and DB-authoritative state means a drained wallet doesn't drain the grow room. Support path: re-link after proof of the *new* wallet + manual review. |

Standing heuristic honored throughout: **never store secrets, mnemonics, or session tokens in
docs/memory** — examples above are formats, not values.

---

## §5 Phased rollout — TestNet first, flag-gated, CI stays offline ⬜

- **W0 (this doc):** design agreed; unique-index migration + algosdk checksum check scheduled.
- **W1 — backend, dark:** `/auth/wallet/challenge|verify`, sessions table, dual-credential
  `require_player`, all behind **`GPE_WALLET_LOGIN` (secure-default OFF)** — same pattern and
  rationale as `GPE_DEV_LOGIN` (`config.py:119-128`). Signature verification is pure ed25519:
  **tests generate throwaway keypairs locally and sign challenges in-process** — deterministic,
  no network, no live key, exactly the mock-provider discipline (`chain/provider.py`,
  `config.py:97-100` `USE_MOCK_CHAIN`). Invariant/property tests: nonce single-use, expiry,
  template strictness, unique-address enforcement.
- **W2 — web client, TestNet:** use-wallet provider + connect UI; ARC-60 path with txn fallback;
  cookie sessions; guest-upgrade flow. Playtest deploys flip `GPE_WALLET_LOGIN=true` on TestNet.
- **W3 — MainNet posture:** flag on in prod; `GPE_DEV_LOGIN` permanently off in any environment
  with real accounts (it already must be); API key demoted to internal credential in the UI.
- **Forever-compat:** CI runs with the mock chain and local keypairs only; a test that needs
  Pera, WalletConnect, or any live network is a finding.

> When W1 lands, flip the tags here, add the ADR to `../../DECISIONS.md`, and register this doc
> in the codex README/layer map so `make check-memory` stays green.
