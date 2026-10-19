# Changelog

## Unreleased

- Remote displays on the venue Wi-Fi from the desktop app: QR code or link, no internet needed.
- Remote displays anywhere with a room code over WebRTC (PeerJS).

## 1.1.1 (2026-10-19)

- macOS build is ad-hoc signed so it no longer reports "damaged and can't be opened". It still needs right-click → Open the first time.
- README explains the macOS and Windows first-run prompts.

## 1.1.0 (2026-10-19)

- Scheduled starts: a timer can start at a set time of day.
- Linked starts: "when the previous timer ends" replaces the old auto-next checkbox. Existing rundowns are converted automatically.
- The show engine now runs on a Web Worker clock, so linked and scheduled starts fire on time while the controller tab is in the background.
- The display shows "Starts at HH:MM" while a scheduled timer is waiting.
- New logo and app icons.

## 1.0.0 (2026-10-19)

- First release.
