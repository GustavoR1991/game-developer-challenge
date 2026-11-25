# Architecture

Pirate Battle is a single-page app with two clearly separated worlds:

- **React** owns menus, forms, dialogs, the HUD panel and everything accessible.
- **PixiJS** owns the arena: water, islands, ships, cannonballs, effects and the health bars above ships.
- A framework-free **simulation** owns every gameplay rule. Neither React nor PixiJS mutates game state.

```
src/
  app/                 App shell, hash router, services context, network-control facade
  api/                 Contracts (zod), Axios client, TanStack Query hooks, submission outbox
  mocks/               MSW handlers, persisted mock database, fixtures, network scenarios
  storage/             Typed localStorage helpers (options, profile, last result)
  utils/               Math, ids, asset URLs
  game/
    config/            Typed gameplay config + per-match frozen snapshot
    simulation/        GameSimulation, state, events, seeded RNG, fixed-step clock
      systems/         Movement, collisions, player weapons, enemy AI, projectiles, spawner, damage
      world/           Arena layout (landmasses, decorations) and rounded-rectangle colliders
    input/             Keyboard + touch -> InputCommands
    render/            PixiJS: textures, camera, arena, ships, health bars, projectiles, effects
    session/           GameSession (loop, lifecycle, pause) and HudStore (React sync)
    audio/             Sound effects mapped from simulation events
    testing/           Test hooks (seed, manual clock, balance overrides, state inspection)
  ui/
    screens/           Menu, Options, Game, Result, Captain's Log
    components/
      common/          Buttons, dialog, pagination, query states, footer
      menu/            Controls help, options form, network scenario panel
      log/             Captain's Log tabs, ranking and history tables
      game/            HUD and touch controls
    styles/            Global CSS
public/assets/
  images/              Menu background and Jungle Gaming logo
  sheets/              ships.png + ships.json (atlas), tiles.png / tiles@2x.png (tile sheet)
  tiles/               Water tile (1x / 2x) used by the tiling water
  ui/default|retina/   Menu, HUD and control images used by React and the in-game health bars
  sounds/              Sound effects
assets-src/            Source XML of the ship atlas (converted by scripts/build-atlases.mjs)
docs/reference/        Reference screenshots provided with the challenge
```

## React ⇄ PixiJS integration

`GameScreen` loads the textures, then creates a `GameSession` inside an effect. `GameSession.create` is async (PixiJS v8 `Application.init` is async), so it receives an `isCancelled` callback: when React Strict Mode mounts, unmounts and mounts again, the first session is destroyed as soon as its init resolves and only the second one survives. The cleanup function always calls `session.destroy()`.

`GameSession.destroy()` releases everything it created:

- `window` `keydown`/`keyup`/`blur` and `document` `visibilitychange` listeners;
- the ticker callback (the session uses its own non-shared ticker, which is stopped);
- every Pixi display object (`app.destroy({ removeView: true }, { children: true, texture: false })`), the cropped health-bar textures it created, and the effect pools;
- the HUD store listeners.

Shared textures are **not** destroyed: they live in the PixiJS `Assets` cache and are reused by the next match, so restarting or playing again does not download or upload them again.

### Keeping React out of the frame loop

The HUD does not re-render on every frame. After each frame the session builds a tiny snapshot (score, health, whole seconds left, phase) and `HudStore.update` only notifies subscribers when a value really changed — about once per second for the timer. React reads it through `useSyncExternalStore`. Accessible announcements (`aria-live`) fire only on meaningful changes (score, 60/30/10/5 s left, low hull, pause, end).

## Simulation loop

- `FixedStepClock` turns variable frame times into fixed 1/60 s steps (frames longer than 250 ms are clamped, so a stall never produces a burst of steps). Movement, cooldowns, damage over time and spawn timers all depend only on `dt`, never on the frame rate.
- The renderer interpolates between the previous and current transform using the clock's leftover fraction, so motion is smooth on 120/144 Hz screens.
- `GameSimulation.step(dt, input)` runs, in order: player (movement, collisions, weapons), enemies (AI, collisions, ram contacts), projectiles (movement, island/ship hits, range), spawner, and finally the time-up check. Every phase is skipped as soon as the match ends, so the end of a match immediately stops movement, attacks, damage, spawns and scoring.
- The simulation emits events (`shotFired`, `projectileImpact`, `shipDamaged`, `shipDestroyed`, `scoreChanged`, `matchEnded`, …). The renderer turns them into effects and the audio layer into sounds; the rules never know about either.
- Randomness goes through a seeded `Random` (mulberry32). The same seed and the same inputs replay the same match, which the tests rely on.

### Pause

`pause(reason)` is triggered manually (button, `Esc`, `P`), by `window` blur, by a hidden tab, or by rotating a touch device to portrait. While paused the simulation is not stepped, so the timer, cooldowns, AI and spawns are frozen; effect animations are frozen too. `resume()` is only called from a player action (the Resume button or `Esc` in the dialog). Resuming resets the clock accumulator, skips the next frame delta and clears held input, so neither time nor movement nor shots from the paused period are replayed.

## Collisions

- Ships and cannonballs are circles. Islands are **rounded rectangles** slightly inset from their tiles so the collision follows the visible sand.
- Ships are moved first and then pushed out of any overlapping island along the penetration normal (up to three passes), then clamped to the arena. Speeds are low relative to island size, so there is no tunnelling.
- Cannonballs are removed on the first island or ship they touch, when they leave the arena, or when they have travelled their maximum range. Each one applies damage exactly once (`alive` is cleared before damage is applied).
- Player cannonballs only hit enemies; enemy cannonballs only hit the player. Destroyed ships are removed from the simulation at the end of the step, so they stop dealing damage, shooting and colliding.
- A Chaser touching the player explodes: it is destroyed with cause `ram` (no point) and the player takes `ramDamage`. A Shooter is pushed away instead.

## Enemy behaviour

- Both enemies steer with a look-ahead probe: if the straight line to the target hits an island or the arena edge, they try alternative headings left and right (closest to their current heading first). Throttle drops while turning sharply, which avoids orbiting the player.
- **Chaser:** always pursues the player.
- **Shooter:** approaches until `preferredDistance`, then holds position and turns to aim; it fires its single cannon when the player is within `attackRange` and its aim is within tolerance.
- **Spawning:** every `intervalSeconds` a spawn is attempted. The first spawns follow `openingSequence` (Chaser, then Shooter) so both kinds always appear in a default match; afterwards the kind is chosen by `weights`. A spawn point must be inside the arena, clear of islands by `obstacleClearance`, not overlapping another enemy, and at least `minDistanceFromPlayer` (480 px) away — further than the Shooter's attack range (420 px) and about five seconds of Chaser travel — so no damage is unavoidable right after a spawn. If no point is found after `maxPlacementAttempts`, or `maxAliveEnemies` are already alive, the spawn is skipped and counted.

## Configuration and balancing

`src/game/config/gameConfig.ts` holds every gameplay number in a typed `GameConfig`: match duration, spawn interval/delay/weights/opening sequence/clearance, navigation, health, movement and turning speed, acceleration, collision radius, damage, projectile speed/range/radius, cooldowns, broadside count/spacing, Shooter range/aim tolerance, Chaser ram damage.

When a match starts, `createMatchConfig(options)` deep-clones the defaults, applies the two player options and deep-freezes the result. That snapshot is the only config the match sees; changes made in Options later only affect new matches.

Balancing decisions:

| Value | Reason |
| --- | --- |
| Front cannon 20 dmg / 0.5 s, broadside 3 × 20 dmg / 1.6 s per side | A Chaser (40 HP) dies to two direct hits; a full broadside sinks a Shooter (60 HP). |
| Chaser 100 px/s vs player 150 px/s | The player can always outrun and kite Chasers. |
| Ram 20, Shooter shot 10 / 2.2 s | Five rams or ten hits sink the player; mistakes hurt but are recoverable. |
| Spawn interval 4 s default (1–10 s, 0.5 s steps), max 10 alive | Pressure grows steadily without flooding the arena. |
| Match 120 s default (60–180 s) | Required range from the brief. |

## Assets

`scripts/build-atlases.mjs` converts the provided Starling XML ship atlas (`assets-src/`) into a PixiJS JSON atlas (`public/assets/sheets/ships.json`). Ships, effects, cannonballs, crew, dinghies and loose cannons come from that atlas; islands, the white shallow-water rim, walls, towers, the wooden gate and vegetation are cut from the single tile sheet (sand islands and their shallow rims are drawn from whole blocks with nine-slice sprites, so there are no tile seams); water is a tiling sprite. The whole arena is drawn from four textures and batches well. On screens with a device pixel ratio ≥ 1.5 the 2x tile sheet and water are used. Duplicated copies of the art (loose PNGs already present in the sheets, vector sources, the UI atlas) were removed from the build.

`loadCombatTextures` loads them with a progress callback. Failures become an `AssetLoadError`; the game screen shows an error dialog with Retry, and Pixi's loader drops failed entries from its cache, so retrying fetches again.

The canvas uses `resizeTo` its container with `autoDensity` and `resolution = min(devicePixelRatio, 2)`. The world has a fixed logical size (2112 × 1248) larger than the view (about 1536 × 864 world units). The renderer scales the world uniformly to *cover* the screen (never letterboxed) and a camera follows the player, clamped to the arena edges, so the map always fills the screen while proportions, limits and world coordinates stay the same on every device (`GameRenderer.screenToWorld` converts back if needed). On phones held in portrait the game screen is rotated 90° with CSS so the battle is always played in landscape.

## Local persistence

| Key | Content |
| --- | --- |
| `pirate-battle:options:v1` | Validated match options |
| `pirate-battle:profile:v1` | Generated player id and editable captain name |
| `pirate-battle:last-result:v1` | Result of the last completed match |
| `pirate-battle:submissions:v1` | Submission outbox (pending / failed / confirmed) |
| `pirate-battle:mock-server:v1` | The mock server database (confirmed records) |
| `pirate-battle:mock-scenario:v1` | Selected network scenario, seed and latency override |
| `pirate-battle:sound:v1` | Mute preference |

Everything read back from storage is validated with zod; invalid data falls back to defaults.

Reloading the page while on `#/play` redirects to the menu, which ends the match. Leaving the game screen destroys the session. An abandoned match never produces a result, so it is never queued for registration.

## Ranking and match history

### Contracts

Defined once in `src/api/contracts/matches.ts` with zod and shared by the client, the MSW handlers, the fixtures and the tests.

| Method | Route | Response |
| --- | --- | --- |
| `GET` | `/api/ranking?durationSeconds&spawnIntervalSeconds&page&pageSize` | `Page<RankingEntry>` |
| `GET` | `/api/players/:playerId/matches?page&pageSize` | `Page<MatchRecord>` (newest first) |
| `PUT` | `/api/matches/:matchId` | `201` created / `200` existing / `409` conflicting body |

A `MatchRecord` holds `matchId`, `playerId`, `playerName`, `playedAt`, `score`, `durationSeconds` (effective, pauses excluded), `endReason` and the `config` used. Pages carry `items, page, pageSize, totalItems, totalPages, revision`.

The ranking only compares matches with the same configuration and lists each captain once, with their best match. It is ordered by: score (desc), duration survived (desc), date (asc), then match id — a total, deterministic order. Every completed match is still stored once and shown in Match History.

### Client

- Axios instance with a runtime-configurable timeout; responses are validated with zod and errors are normalised into `ApiError` (`timeout`, `network`, `http`, `invalid-response`).
- TanStack Query: per-page query keys, `keepPreviousData` while paginating, `refetchOnMount: 'always'` (tabs refresh whenever they are shown again), refetch on focus, retries with exponential backoff only for timeouts, network errors and 5xx/429.
- **Stale responses:** the query `signal` is passed to Axios so superseded fetches are cancelled, every page has its own cache key, and a custom `structuralSharing` keeps the cached page when an incoming response has a lower `revision` than the one already shown.
- Loading, empty, error (with retry), background refresh ("Updating…") and "showing saved data" states are rendered explicitly.

### Registration and pending records

1. When a match ends, the result is saved locally and a `MatchRecord` with a client-generated `matchId` is written to the **outbox** (`submissionStore`, persisted in localStorage) before any request is made.
2. `SubmissionWorker` (mounted once at the app root) sends pending entries through a TanStack mutation scoped to run serially. The request is an idempotent `PUT /api/matches/:matchId` with an `Idempotency-Key` header.
3. Success marks the entry `confirmed` and invalidates both the ranking and the history queries, so both tabs refresh.
4. Failure (after automatic retries) marks it `failed`. The result screen shows the status and a Retry button; the history tab shows how many battles are waiting. The player can keep playing meanwhile.
5. Entries survive a refresh (an entry left `sending` is restored as `pending`). Failed entries are retried automatically when the browser goes back online or when any query succeeds again (a sign the API recovered), with a short cooldown.

Because the server deduplicates by `matchId`, retries after a timeout — even when the first request was actually stored — return the existing record instead of creating a second one.

## Mock API (MSW)

The same handlers run in development, in the Playwright tests and in the published build: `startMockApi()` starts the service worker before React renders, in every environment. If it cannot start, the game still works and the tabs show errors.

- `mocks/db/matchDatabase.ts` — the "server": fixtures plus confirmed records, persisted in localStorage, with a monotonically increasing `revision`.
- `mocks/fixtures/matchFixtures.ts` — 70 deterministic matches from 16 fictional captains across five configurations.
- `mocks/scenarios/scenarios.ts` — per-endpoint latency (fixed, seeded random, out-of-order) and failure (HTTP 4xx/5xx, network error, timeout, timeout-after-commit) plus the dataset (default, empty, many pages).

Scenarios: `success`, `empty`, `many-pages`, `slow`, `variable-latency`, `out-of-order`, `timeout`, `network-error`, `server-error`, `client-error`, `ranking-fails`, `history-fails`, `submit-timeout-after-commit`, `offline-at-match-end`.

They are selected from the "Network scenarios" panel in the main menu (which also has **Reset mock API data**), with `?scenario=<id>&mockSeed=<n>&mockLatency=<ms>` in the URL, or from tests through `window.__PIRATE_BATTLE__.network`. Reset restores the success scenario, the fixtures, and clears the outbox and the query cache.

## Testing hooks

Enabled with `?e2e=1` (kept for the browser session) or `VITE_ENABLE_TEST_HOOKS=true`. They expose `window.__PIRATE_BATTLE__` with: the match seed, a **manual clock** (`advance(seconds)` steps the real simulation and renders), balance overrides applied through the normal config snapshot, a read-only state snapshot, API timeout/retry settings and the network control. Tests still press real keys and touch buttons; collisions, AI and rendering run unchanged.

## Known limitations

- Collision shapes are circles and rounded rectangles; ship hulls are elongated, so contacts at the bow/stern are approximate.
- Enemy navigation is local (look-ahead probes), not path-finding; an enemy can hesitate in the narrow gap between an island and the arena edge.
- Sound effects are WAV files loaded on demand; the first sounds of a session can start late on slow connections.
- Ranking and history are client-side mocks by design: data lives in the browser that produced it.
