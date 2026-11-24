## Analysis

- **Frame rate:** the combat holds the 60 FPS target for the whole three minutes with the densest setting (1 s spawn interval, the arena kept at the 10-enemy cap). Frame time never left the 16.7 ms vsync budget. The simulation is a fixed 1/60 s step and the renderer only syncs existing display objects, so cost per frame is roughly constant.
- **Entities:** enemies plateau at `maxAliveEnemies` (10). Cannonballs and effects are pooled (sprites are reused, not recreated), and destroyed ships are removed from the scene the same step they sink.
- **Memory:** after five cycles the number of listeners on `window`/`document` is identical to the menu baseline, and no canvas or WebGL context is left behind, so the session teardown releases listeners, ticker and renderer. The heap after leaving grows by +0.37, +0.27, +0.21 and +0.16 MB per cycle: a shrinking, converging increase consistent with warm caches (JIT, TanStack Query entries for refreshed tabs, Pixi texture-source bookkeeping), not with a leak that grows with every match. Shared textures stay in the PixiJS `Assets` cache on purpose and are reused by the next match.

## Limitations

- Measured in headless Chromium with GPU rasterisation through ANGLE/D3D11. Headless Chromium is vsync-limited to 60 Hz, so the profile cannot show headroom above 60 FPS.
- The bot does not aim. It keeps the arena full of enemies and cannonballs but is not a substitute for human play.
- Mobile performance was checked only through Playwright's mobile emulation (layout and touch input), not on a physical phone.
- `JSHeapUsedSize` covers the JavaScript heap only. GPU memory is not visible to the page; the absence of leftover canvases and the fixed listener count are used as the proxy.

## Reproduce

```bash
npm run perf:profile
node scripts/profiling-report.mjs "<your hardware description>"
```
