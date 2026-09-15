# Changelog

All notable changes to **@0123896/dsh-notify-sounds** will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

- Initial open-source release.
- New trigger: `agent/turn-stopping` → `end` tone (reply finished).
- New trigger: `tools/pre-execute` on `ask_user_question` (+
  `approval/request`, `user-questions/request` fallbacks) → `approval` tone.
- Browser client polls `notif-drain` (400 ms) and coalesces events
  (2.5 s dedup for approval) so multiple triggers produce one sound.
- No bundled audio: default Web Audio tones (880 Hz end / 660 Hz approval).
- Optional external audio via `end…Url` / `approval…Url` config, served by the
  host half under `/__dsh-notify/…` (requires `config.endFilePath` /
  `approvalFilePath`, injects `fs`/`webServer`).