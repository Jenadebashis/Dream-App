## Quick context

This is a small React + Vite single-page app for creating and playing an animated quiz (no backend). The app keeps the quiz in-memory in `App.jsx` and passes it down to the editor (`src/components/QuizEditor.jsx`) and player (`src/components/QuizPlayer.jsx`). Vite bundles static assets imported from `src/assets` (video/audio). `vite.config.js` enables the `babel-plugin-react-compiler` plugin which affects dev/build behavior.

## How to run (dev / build / lint)

- Install deps: `npm install`
- Dev server: `npm run dev` (Vite)
- Build for production: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint` (project uses ESLint)

Refer to `package.json` for scripts.

## Big-picture architecture & data flow

- Root: `src/main.jsx` mounts `App` inside a `BrowserRouter` and imports a single global stylesheet `src/styles.css`.
- `App.jsx` owns the quiz state: a single object `{ questions: [] }`. It exposes `addQuestion(q)` to `QuizEditor` and passes the same `quiz` into `QuizDisplay`/`QuizPlayer` for playback.
- `QuizEditor.jsx` builds question objects (client-only) and uses Data URLs for images (File -> base64 via FileReader). See `handleAdd` where the `q` object is constructed.
- `QuizDisplay.jsx` renders a full-screen background `<video>` and forwards a `ref` to `QuizPlayer` as `backgroundVideoRef` so the player can swap background clips per question.
- `QuizPlayer.jsx` is responsible for the entire play flow: background transitions, per-question timer, reveal logic, and optional screen+audio recording using `getDisplayMedia`, `MediaRecorder` and an `AudioContext` mix of ding + mic + display audio.

## Important, discoverable conventions & patterns

- Question object shape (source: `QuizEditor.jsx`):

  - `id` (string): stable unique id (uses `crypto.randomUUID()` when available, else timestamp+random)
  - `questionText` (string)
  - `answerFormat` (one of `text`, `image`, `both`, `multiple-images`)
  - `options` (array of 4 items): each `{ text: string, image: string|null }` — images are stored as data URLs
  - `correctAnswer` (number): 1-based index (1..4)

- The editor expects exactly 4 options for each question. `multiple-images` requires 4 uploaded files.
- The project uses a single global stylesheet at `src/styles.css` — follow existing class names (e.g., `.quiz-section`, `.option-card`) when changing styles.
- The player uses a small set of internal state flags and timing constants you should respect when modifying behavior: `QUESTION_DURATION` (in `QuizPlayer.jsx`) controls per-question time; `revealed`, `selected`, `running`, `completed` drive the play lifecycle.
- Background video swapping: `QuizPlayer` calls `setBackgroundForQuestion(i)` to set `video.src` and uses `video.datasetCurrent` to avoid unnecessary swaps. Respect this pattern if you add other background assets.

## Integration points & external behavior to be careful about

- Browser permissions: recording flow uses `navigator.mediaDevices.getDisplayMedia()` and `getUserMedia()`; these will fail if the page is not served over HTTPS (or localhost) or permissions are denied. `QuizPlayer` already handles fallbacks but tests that touch recording must mock media APIs.
- Vite asset bundling: video and audio files are imported from `src/assets` (see `App.jsx` imports). When adding/removing assets use `import` so Vite includes them in the build.
- HMR and compiler plugin: `vite.config.js` enables `babel-plugin-react-compiler`. Expect slightly different dev perf/refresh behavior than default Vite React templates.

## Developer signals already present

- `console.log` is used in `QuizEditor.handleAdd` and at the top of `QuizPlayer.jsx` to expose the current quiz for quick debugging in the browser console. Grep for `console.log('` to find these spots.

## What an AI agent can safely change (examples)

- UI text and layout in `src/components/*` (e.g., labels in `QuizEditor.jsx`, option render in `QuizPlayer.jsx`). These are isolated and do not affect app-wide state.
- Add persistence with minimal risk: persist `quiz` to `localStorage` from `App.jsx` and restore on mount. The app currently keeps state in-memory.
- Add small unit-tests or snapshot tests for pure helpers (for example extract `fileToDataURL` to a module and test it). There are no tests currently.

## What NOT to change without review

- The recording logic in `QuizPlayer.jsx` (AudioContext graph, mixed streams, and stop/cleanup). These are fragile and permission-dependent.
- The timing/transition flow between background swap and content show (`setShowContent`, `contentTimeoutRef`) — changing timings may break the smooth reveal UX.

## Key files to open first

- `src/App.jsx` — central state & routes
- `src/components/QuizEditor.jsx` — question creation, ID & option shape
- `src/components/QuizPlayer.jsx` — play, recording, reveal, timers, background handling
- `src/pages/QuizDisplay.jsx` — full-screen background video wiring
- `vite.config.js`, `package.json` — build & plugin details

If you want me to expand any section (for example add concrete code snippets for localStorage persistence or tests), tell me which part to expand.
