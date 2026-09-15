# Contributing

Thanks for your interest in **@0123896/dsh-notify-sounds**! This project is
small and intentionally plain-JS (no bundler, no TypeScript). Here is how to
make changes and send a good PR.

## Before you start

- Open an issue or a discussion to describe what you want to change/why.
- Keep changes scoped. Two halves of the plugin are just two files:
  - `src/host.js` — where events are detected and optional audio is served.
  - `src/client.js` — where the browser drains and plays the sound.

## Development flow

1. Fork the repo and clone it.
2. Make your change in `src/`.
3. Load the two bodies with `cordis_define` in a running DSH session to test.
   Verify both moments produce the right sounds:
   - `end` → conversation / reply finished.
   - `approval` → `ask_user_question` (and the fallback events) fire.
4. Update `README.md` if behavior/config changed.

## Guiding rules

- **No bundled audio.** Default is Web Audio synthesis; no MP3/WAV committed.
- **No hard-coded local paths.** Any path comes from config, never inline.
- **Plain JavaScript only** for `host.js` / `client.js` (no JSX/TS/import).
- **Client audio** uses ambient browser globals (`Audio`, `AudioContext`) and
  removes the browser autoplay gates with a note in README.

## Commit style

- Atomic, focused commits with a one-line subject. Use conventional prefixes:
  `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Please don't mix formatting-only changes with logic changes.

## Releasing

- Bump `version` in `package.json`.
- Append to `CHANGELOG.md` under a new Unreleased section.

Thanks for helping make those beeps predictable. 🎵