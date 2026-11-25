# Test reports

- [playwright/index.html](playwright/index.html) — HTML report of the last full run of `npm run test:e2e`: 81 passed, 1 skipped (the touch-controls test only runs in the mobile project). Desktop Chromium 1366×768 and mobile Chromium (Pixel 7 landscape), production build.
- Traces, videos and screenshots of failing tests are written to `test-results/` by every local run (`trace: 'retain-on-failure'`) and can be opened with `npx playwright show-trace <trace.zip>`.
- Performance and memory evidence: [../profiling/README.md](../profiling/README.md).
