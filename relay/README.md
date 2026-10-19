# Stage Clock relay

A tiny WebSocket relay so the controller and remote displays can meet through a server you own, instead of the public PeerJS service. One Cloudflare Worker with one Durable Object per room. Fits in Cloudflare's free plan for normal event use.

The relay forwards the controller's state to the displays and keeps only the latest message so a display that joins late catches up. No accounts, no logs of timer data.

## Deploy (about five minutes)

```sh
cd relay
npm install
npx wrangler login        # opens the browser once
npx wrangler deploy
```

Wrangler prints the URL, for example `https://stage-clock-relay.<your-subdomain>.workers.dev`. Paste it into **Remote displays → Your own relay** in the controller.

Later updates deploy themselves: add the repository secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID`, and the `Deploy relay` workflow runs on every change to this folder on `main`.

## Protocol

- `GET /health` → `{ "ok": true }`
- `GET /room/<CODE>?role=controller` (WebSocket): send `{ "type": "state", ... }` messages; receive `{ "type": "clients", "n": 2 }`.
- `GET /room/<CODE>?role=display` (WebSocket): receive the latest state on connect, then every update.

Codes are six letters or digits. Anyone with the code can watch; only connections with `role=controller` can push.

## Test locally

```sh
npm test
```

Runs the Worker locally with Wrangler and checks forwarding, late-joiner catch-up, display counts and that displays cannot push.
