---
name: uknowme-repo
description: Work on the UKnowMe monorepo. Use when changing the Vue frontend, Spring Boot backend, chat/matching/avatar flows, Docker or tar build docs, or the LiveKit-based media stack in this repository.
---

# UKnowMe Repo

## Structure

- Work from the repository root.
- Frontend lives in `FE/u-know-me`.
- Backend lives in `BE/u-know-me`.
- Build and run docs live in `assets/description/`.

## Frontend

- Stack: Vue 3, Pinia, Vue CLI.
- Use `npm.cmd` on Windows PowerShell.
- Common commands:
  - `npm.cmd run serve`
  - `npm.cmd run build`
- Chat UI and media logic live mainly in:
  - `FE/u-know-me/src/views/chat/ChatView.vue`
  - `FE/u-know-me/src/stores/chat/chat.js`
  - `FE/u-know-me/src/components/chat/`

## Backend

- Stack: Spring Boot 2.7, Java 8, MariaDB.
- Use `.\gradlew.bat` on Windows PowerShell.
- Common verification command:
  - `.\gradlew.bat test`
- Chat token issuance lives in:
  - `BE/u-know-me/src/main/java/com/ssafy/uknowme/livekit/controller/SessionController.java`

## Media Stack

- Chat uses LiveKit, not OpenVidu.
- The backend issues LiveKit participant tokens from:
  - `LIVEKIT_WS_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- The frontend connects to LiveKit using the `/session` API response.
- When debugging camera or microphone issues, remember that `getUserMedia` needs `https` or `localhost`.
- Do not assume iOS Chrome and iOS Safari behave the same just because both are WebKit-based.
- Current iOS motion handling policy:
  - Desktop, Android, iOS Chrome: keep the `@mediapipe/tasks-vision` path.
  - iOS Safari: use the legacy `@mediapipe/holistic` runtime on the main thread.
  - iOS Safari motion should stay face + pose centric; hand rigging is intentionally disabled for stability.
  - Safari legacy assets are served from `FE/u-know-me/public/mediapipe/holistic/`.
- Chat motion troubleshooting notes live in:
  - `FE/u-know-me/docs/ios-safari-motion-troubleshooting.md`

## Landing Media

- Landing background video lives in:
  - `FE/u-know-me/src/components/land/LandingPage.vue`
  - `FE/u-know-me/src/assets/land/landing-background.mp4`
- Keep the landing background video iOS-friendly:
  - `H.264`
  - `yuv420p`
  - `faststart`
  - no audio track
  - no extra data/timecode track
- Keep a poster fallback for iOS black-screen/autoplay failures:
  - `FE/u-know-me/src/assets/land/landing-background-poster.jpg`
- If the landing video changes, preserve the retry flow on `loadeddata`, `canplay`, `pageshow`, `focus`, and first touch/pointer input so iOS can retry playback.

## Deployment Defaults

- Frontend container serves on `3000`.
- Backend container maps `8888 -> 8080`.
- LiveKit deployment docs are currently written for `LiveKit Cloud`, not self-hosted `livekit-server`.
- Keep docs in sync when deployment behavior changes:
  - `README.md`
  - `assets/description/docker_build.md`
  - `assets/description/local_run.md`
- Backend Docker entrypoint runs under Alpine `/bin/sh` (`ash`), so do not use bash-only substitutions such as `${!var}`.

## Working Rules

- Prefer editing code with `apply_patch`.
- Do not commit build outputs such as `dist`, `build`, `node_modules`, or `.tar`.
- If chat behavior changes, verify both:
  - frontend build
  - backend tests
