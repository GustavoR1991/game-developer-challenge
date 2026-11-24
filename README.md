# Pirate Battle

A top-down 2D naval shooter built with **React**, **TypeScript (strict)** and **PixiJS**. Sail between islands, sink enemy ships and score as many points as you can before the time runs out. Ranking and match history use REST APIs mocked with **MSW**, consumed with **Axios** and **TanStack Query**, and the whole game is covered by **Playwright** end-to-end and visual regression tests.

- Live demo: _add the deployment URL here after `vercel --prod`_
- Architecture and decisions: [ARCHITECTURE.md](ARCHITECTURE.md)
- Original challenge brief (Portuguese): [docs/CHALLENGE.md](docs/CHALLENGE.md)

## Stack

| Concern | Technology |
| --- | --- |
| UI and menus | React 19 |
| Language | TypeScript 6, `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Game rendering | PixiJS 8 |
| Remote state | TanStack Query 5 |
| HTTP client | Axios |
| API mocking | MSW 3 (also in the published build) |
| Validation | zod 4 |
| Sound | @pixi/sound |
| E2E and visual tests | Playwright |
| Build | Vite |

## Setup

Requirements: Node.js 20 or newer (developed with Node 24) and npm.

```bash
npm ci
npx playwright install chromium
npm run dev
```

Open http://localhost:5173.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run preview` | Serve the production build (port 4173) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project check (app, config and tests) |
| `npm run format` | Prettier |
| `npm run test:e2e` | Build, serve and run every Playwright test (desktop and mobile Chromium) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:update` | Re-record the visual regression baselines |
| `npm run test:e2e:report` | Open the last HTML report |
| `npm run perf:profile` | Run the 3-minute performance profile (see [docs/profiling](docs/profiling)) |
| `npm run assets:atlases` | Regenerate the PixiJS atlases from the provided sheets |

## Environment variables

All are optional. Copy `.env.example` to `.env.local` to change them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base URL of the ranking/history API (served by MSW) |
| `VITE_ENABLE_TEST_HOOKS` | `false` | Always expose `window.__PIRATE_BATTLE__` (otherwise opt in with `?e2e=1`) |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Sail forward | `W` / `↑` | ⬆ button (left cluster) |
| Turn left / right | `A` / `←`, `D` / `→` | ↺ / ↻ buttons |
| Front cannon (1 ball) | `Space` / `K` | top fire button (right cluster) |
| Left broadside (3 balls) | `Q` / `J` | left fire button |
| Right broadside (3 balls) | `E` / `L` | right fire button |
| Pause | `Esc` / `P` or the pause button | pause button |

Moving and firing work at the same time. Game keys are only captured while a battle is running; in menus and dialogs the keyboard behaves normally. Every menu is fully usable with `Tab`, `Shift+Tab`, `Enter`, `Space` and the arrow keys (tabs).

On phones and tablets the battle is played in **landscape**. In portrait the game pauses and asks you to rotate the device; menus work in both orientations.

## Gameplay

- Destroying an enemy with your cannonballs scores **1 point**. A Chaser that rams you explodes and does not score.
- **Chaser** (black sails) pursues you and explodes on impact. **Shooter** (red sails) closes in and fires when you are in range.
- The match ends when the time runs out or your hull reaches zero. Pausing (manually, by switching tabs or by losing focus) freezes everything until you press Resume.

### Gameplay configuration

All balance values live in a single typed object: [`src/game/config/gameConfig.ts`](src/game/config/gameConfig.ts) (`DEFAULT_GAME_CONFIG`). Changing a number there never requires touching system logic.

The Options screen exposes two of them, saved in localStorage and validated:

| Option | Limits | Default |
| --- | --- | --- |
| Game session time | 60–180 s (whole seconds) | 120 s |
| Enemy spawn time | 1–10 s, steps of 0.5 s | 4 s |

The captain name used in the ranking can also be changed there. Each match uses a frozen snapshot of the configuration taken when it starts.

## Mock API and network scenarios

The ranking and history API is implemented with MSW handlers that run in a service worker in development, in tests **and in the deployed build**. Confirmed matches and pending submissions are persisted in localStorage, so they survive a refresh.

### Selecting a scenario

- **UI:** main menu → **Network scenarios (mock API)** → choose a scenario. The change applies to the next requests.
- **URL:** `/?scenario=<id>&mockSeed=<n>&mockLatency=<ms>` (for example `/?scenario=slow`). The selection is remembered.
- **Tests / console:** `window.__PIRATE_BATTLE__.network.selectScenario('<id>')` (with `?e2e=1`).

| Id | Behaviour |
| --- | --- |
| `success` | Everything works (150 ms) |
| `empty` | Ranking and history are empty |
| `many-pages` | Large datasets with many pages |
| `slow` | Every response takes 2.5 s |
| `variable-latency` | Seeded random latency, 200 ms – 2 s |
| `out-of-order` | Consecutive reads alternate slow/fast, so older requests resolve last |
| `timeout` | No response before the client timeout (5 s) |
| `network-error` | Connection failures |
| `server-error` | HTTP 503 everywhere |
| `client-error` | HTTP 400 everywhere (not retried) |
| `ranking-fails` | Only the ranking fails (500) |
| `history-fails` | Only the history fails (500) |
| `submit-timeout-after-commit` | The match is stored but the first answer arrives after the timeout; the retry returns the existing record |
| `offline-at-match-end` | Registering a match fails until you switch back to `success` |

### Resetting

**Reset mock API data** in the same panel restores the `success` scenario, the original fixtures, clears confirmed and pending submissions and the query cache. You can also clear the site data in the browser.

### Reproducing failures

1. **Pending registration and recovery:** select `offline-at-match-end`, play a match until it ends. The result screen shows *Not saved yet* with *Retry save*; the Match History tab shows the battle as waiting. Refresh the page — it is still pending. Select `success` and press *Retry save* (or just open a tab: the next successful request retries it). It is saved once.
2. **Timeout after commit:** select `submit-timeout-after-commit` and finish a match. The first request times out, the automatic retry gets the existing record, and history shows a single entry.
3. **Errors and retries in the tabs:** select `ranking-fails`, `history-fails`, `server-error`, `timeout` or `network-error` and open the tabs; use *Try again*. The game stays playable.
4. **Late responses:** select `out-of-order` while the ranking is open and quickly page forward: the older, slower response never replaces the page on screen.
5. **Asset loading failure:** block `assets/atlases/ships.json` in the browser dev tools (Network → Block request URL) and press Play; an error dialog with *Retry* appears. Unblock and retry.

## Tests

```bash
npm run test:e2e
```

Playwright builds the app, serves the production build and runs the suite in **desktop Chromium (1366×768)** and **mobile Chromium (Pixel 7, landscape, touch)**. Tests start from isolated browser contexts, use a fixed match seed and a manual simulation clock (`?e2e=1&seed=42&manualClock=1`), press real keys and touch buttons, and read state through the read-only test hooks.

| File | Covers |
| --- | --- |
| `01-options` | Navigation, validation, persistence, keyboard navigation |
| `02-assets` | Loading progress, failure and retry |
| `03-movement` | Start, forward movement, rotation, arena limits, island collisions |
| `04-combat` | Front and broadside fire, cooldowns, damage once, single scoring, islands block shots |
| `05-enemies` | Chaser pursuit and ram, Shooter range and fire, spawn interval/distance/kinds |
| `06-match-end` | Time up, death, frozen simulation, clean restart |
| `07-pause` | Manual pause, focus loss, hidden tab, no timer drift |
| `08-result` | Result screen and persistence after refresh |
| `09-navigation` | Abandoned matches not registered, repeated navigation, touch controls |
| `10-captains-log` | Ranking/history pagination, loading, empty and error states |
| `11-registration` | Registration updates both tabs, pending record recovered after refresh |
| `12-resilience` | Retry after timeout without duplicates, late responses, API failures don't block play |
| `13-visual` | Visual baselines of the menu, a stable arena and the result screen |

Reports: `playwright-report/index.html` (HTML report) and `test-results/` (traces, videos and screenshots of failures). Visual baselines are versioned in `tests/e2e/__screenshots__/`. A copy of the last report is kept in [docs/reports](docs/reports).

## Performance

See [docs/profiling/README.md](docs/profiling/README.md) for the reference environment, the 3-minute combat profile (FPS, p95 frame time, entity counts) and the memory check after five start/play/leave cycles.

## Deployment

The app is a static build. With the Vercel CLI:

```bash
npm run build
vercel --prod
```

`vercel.json` rewrites unknown paths to `index.html`; the MSW worker (`/mockServiceWorker.js`) and assets are served as static files.

## Assets and licences

All art and sound in `public/assets` were provided with the challenge by Jungle Gaming and are used as the visual base. The files in `public/assets/atlases/` are generated from the provided sheets by `scripts/build-atlases.mjs` (format conversion only; no pixels changed). No third-party fonts or remote resources are used.
