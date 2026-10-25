# Changelog

## 1.4.0 (2026-10-26)

- Redesigned controller: the state of the show (running, paused, over time, finished, scheduled) is shown the same way on the status bar, the preview frame, the active rundown card and the Start button.
- Rundown cards show a threshold bar with a live playhead, the speaker and start rule, and "planned vs actual" once a segment is done. Duplicate and delete live in a per-card menu; delete and Reset all ask twice.
- Timer dialog: yellow and red thresholds as presets with a live bar, and impossible combinations block Save with a reason.
- Message presets ("Please wrap up", "5 minutes left", "Q&A is next"), editable, and an "On screen" indicator.
- Remote displays panel is collapsed by default with one transport visible at a time (venue Wi-Fi, room code, your own relay) and a connected-count summary.
- Speaker display shows a PAUSED marker while paused and a still red display when a stop-at-zero timer finishes.
- Phone remote: connection status and PIN on top, controls locked until the PIN is accepted, bigger Start and Next.
- Phone-sized controller: Now playing first, top bar folds into a menu, 44px touch targets, Move up/down in the card menu.
- Keyboard shortcuts moved off the main page into a Help dialog (the ? button or key).
- First-run strip while the sample rundown is loaded, and a landing page at /site/.

## 1.3.0 (2026-10-19)

- Remote control from a phone over all three transports (venue Wi-Fi, room code, your own relay), protected by a four-digit PIN shown on the controller.
- Every remote QR code and link can be switched between display and remote control.

## 1.2.0 (2026-10-19)

- Remote displays on the venue Wi-Fi from the desktop app: QR code or link, no internet needed.
- Remote displays anywhere with a room code over WebRTC (PeerJS).
- Remote displays through your own relay: a Cloudflare Worker in `relay/`, with a deploy workflow.

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
