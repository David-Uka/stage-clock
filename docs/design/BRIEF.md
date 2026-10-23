# Stage Clock design brief

This file explains Stage Clock to a designer, or to a design tool, well enough to redesign it without opening the code. The source of truth for every value below is `index.html` in the repository root. If this file and the code disagree, the code wins.

## 1. What it is

Stage Clock is a free, open-source countdown timer for live events: conferences, church services, pitch nights, school debates, award shows. An operator builds a list of timed segments (the rundown) on a laptop, puts a big clock on the projector or a confidence monitor facing the speaker, and runs the show from the laptop or a phone.

All alerts are silent and visual. The digits turn yellow when it is time to wrap up, red for the final stretch, and the screen flashes red with "TIME'S UP" at zero. There is no sound anywhere in the app and there must never be.

It runs in the browser at https://david-uka.github.io/stage-clock/, installs as a web app from Edge or Chrome, and ships as a Windows, macOS and Linux desktop app. It works offline and nothing leaves the machine.

### Who uses it

- **The operator.** A stage manager, AV technician, host or volunteer at a laptop in the back of the room. Often in a dark room, often stressed, often doing three other things. Needs big obvious controls, zero ambiguity about what is running, and no way to click something destructive by accident.
- **The speaker.** Sees only the display from 5 to 30 metres away. Needs the digits readable at a glance and the colour change impossible to miss.
- **The phone remote user.** A host or producer walking around the room with a phone. Needs thumb-sized buttons and confirmation that a tap worked.

### What already exists

- The app itself (one HTML file, vanilla CSS and JS, no framework, no build step).
- A logo: a clock mark with a red ring plus the wordmark "STAGE CLOCK" in Barlow Semi Condensed 700. Files in `docs/brand/`.
- Screenshots of the current controller and display in `docs/`.
- No website. The GitHub Pages link opens the app directly. The GitHub README is the only landing page today.

## 2. The four surfaces

### 2.1 Controller (desktop, the operator's screen)

Dark "control room" layout. One top bar, then two columns.

- **Top bar:** logo + wordmark, time of day in monospace, then buttons: Open display window, Full-screen here (F), Appearance, Export, Import.
- **Left column, "Rundown":** header with Reset all and + Add timer. Then a list of timer cards. Each card shows an index number, the title, a meta line (duration, countdown/count up, yellow threshold, red threshold, overtime or stops at 0, start trigger, speaker), and four small actions: Load, edit, duplicate, delete. Cards are drag-to-reorder. The active card has a blue border and a slightly blue background. Done cards are faded. Under the list: total duration and a keyboard shortcuts panel.
- **Right column, "Now playing":** a status line (Running / Paused / Over time / Finished / Starts automatically at HH:MM), a 16:9 live preview of the display, three big transport buttons (Start or Pause, Reset, Next), a nudge row (−1 min, −10 s, +10 s, +1 min, +5 min, Prev, Blackout toggle, Flash), a "Message to speaker" panel (text, three colour swatches white/green/red, Bold, Uppercase, Flashing, Show, Hide), and a long "Remote displays & remote control" panel.
- **Remote displays panel:** shows the four-digit Control PIN with a New PIN button, then three sections stacked: *On the venue Wi-Fi · desktop app* (QR + link, only in the desktop app), *Anywhere · room code* (Start a room, then QR, six-character code, link, Copy, connected count, Stop room), *Anywhere · your own relay* (relay URL input, Start relay room, then the same QR/code/link block). Each section has a Display / Remote control segmented switch that changes what the QR and link open.
- **Dialogs:** Add/Edit timer (title, speaker, duration h/m/s, countdown or count up, yellow-at m/s, red-at m/s, at zero continue or stop, start manually / after previous / at a time of day), Appearance (background, digits, secondary text, yellow, red colour pickers; digit font condensed/mono/system; time-over alert style; time-over text; show/hide title, speaker, time of day, next up, progress bar; 24-hour clock; hide hours when zero), Export/Import (JSON textarea, Copy, Download, file picker, Load).
- **Mobile controller (a real surface, not a fallback).** Below 820 px the two columns stack: rundown first, then Now playing. People do run a show from a phone or tablet in the browser, so this layout has to be designed on purpose, not inherited. Today it has these problems: the transport buttons sit below the entire rundown, so Start is off-screen; the top bar wraps its five buttons into two or three rows; drag-to-reorder uses HTML5 drag and drop, which does not work on touch, so timers cannot be reordered on a phone; double-click-to-load has no touch equivalent; the explanation of "Open display window" lives in a hover tooltip that touch users never see; the per-card edit, duplicate and delete buttons are about 24 px tall; the full-screen exit button is drawn at 35% opacity and relies on hover, and there is no Escape key on a phone.

### 2.2 Speaker display (the output)

The same renderer runs in three places: the preview in the controller, the full-screen overlay (F key), and a separate window or remote device opened with `?view=output`. It is a 16:9 black canvas that scales everything with container-query units, so it looks identical at 400 px and 4K.

Layout: title top-left, time of day top-right, huge digits centred, time-over text under the digits, speaker bottom-left, "Next: …" bottom-right, thin progress bar along the bottom edge.

States the design must cover:

| State | What happens |
| --- | --- |
| Normal | White digits on black, progress bar white. |
| Wrap-up (warn) | Digits and progress bar turn yellow `#f5c518`. |
| Final (crit) | Digits and progress bar turn red `#ff2d2d`. |
| Over time | Digits show +0:12 and count up. Depending on setting: whole screen flashes red at 1 Hz, solid red screen with white digits, digits blink, or digits just stay red. "TIME'S UP" (editable text) appears under the digits. |
| Paused | Currently identical to Normal. A subtle paused indicator is wanted. |
| Waiting for a scheduled start | Under the digits: "Starts at 14:30". |
| Message | The whole canvas is replaced by the message text in white, green or red, optionally bold, uppercase, flashing. |
| Blackout | Pure black, nothing visible. |
| No source (remote display not yet connected) | Centred grey text "Enter room code" with a code input and Connect button. |
| Stopped at zero | Digits 0:00 in red, no overtime. |

Honour `prefers-reduced-motion`: flashing becomes solid red.

### 2.3 Phone remote (`?view=remote`)

A single column, max 560 px wide, centred. Header with small logo and "STAGE CLOCK · Remote" plus time of day. A "now" card with the timer title, 64 px digits that follow the same yellow/red colours, and a sub line. A Control PIN row (four digits, numeric keypad). A two-column button grid: Start/Pause (full width), Prev, Next, −1 min, +1 min, −10 s, +10 s, Reset, Blackout (toggle), Flash the display (full width). A message row (text, Show, Hide). A connection status line at the bottom. Anyone with the link can watch; only the PIN holder can control. A wrong PIN shows a red message.

### 2.4 Website (does not exist yet)

A landing page is wanted at the Pages URL or a `/site/` path, same palette, same fonts. Content it must carry: one-line pitch, the two screenshots, the silent-alert story (yellow → red → flashing red), download buttons for Windows installer, Windows portable, macOS, Linux, plus "Open in browser", the three remote-display options and phone remote in one short section, "free and open source, MIT" with a GitHub link, and the first-run notes for unsigned builds (SmartScreen on Windows, Open Anyway on macOS). No accounts, no pricing, no sign-up.

## 3. Colour

### 3.1 Controller and remote (dark UI)

| Token | Hex | Used for |
| --- | --- | --- |
| `--bg` | `#0b0d10` | Page background, inputs |
| `--panel` | `#14181d` | Top bar, cards, panels, dialogs |
| `--panel-2` | `#1b2128` | Buttons, segmented control, kbd chips |
| `--line` | `#2a323b` | All 1 px borders |
| `--fg` | `#e8ecf0` | Primary text |
| `--muted` | `#8b96a3` | Hints, labels, meta, eyebrows |
| `--accent` | `#3fb6ff` | Primary buttons, active card border, focus ring, room codes, selected segment |
| `--accent-ink` | `#061018` | Text on accent |
| `--ok` | `#37d67a` | Green message swatch, connected state |
| `--warn` | `#f5c518` | Yellow threshold, Blackout toggle when on |
| `--crit` | `#ff3b3b` | Red threshold, wordmark "CLOCK", red message swatch |
| Button hover | `#222a33` border `#3a4552` | |
| Primary hover | `#63c4ff` | |
| Danger text | `#ffb3b3` | Delete, Stop room, bad connection |
| Active card bg | `#12222e` | |
| Toggle-on ink | `#231a00` | Text on yellow |

### 3.2 Speaker display (defaults, user-adjustable)

| Token | Hex | Meaning |
| --- | --- | --- |
| `--o-bg` | `#000000` | Background |
| `--o-fg` | `#ffffff` | Digits, title, progress |
| `--o-dim` | `#8a8a8a` | Time of day, speaker, next up |
| `--o-warn` | `#f5c518` | Wrap-up |
| `--o-crit` | `#ff2d2d` | Final and over time |
| Message green | `#37d67a` | |
| Message red | `#ff3b3b` | |

The operator can change all five display colours in Appearance. Design the display with the defaults but do not make anything depend on them.

### 3.3 Brand

Background `#0b0d10`, ink `#ffffff`, red `#ff2d2d`, ring grey `#2a323b`. Wordmark: "STAGE" white, "CLOCK" red.

### 3.4 Colour rules

- Yellow means wrap-up and red means final or over time, everywhere, always. Do not use them decoratively.
- Blue is the only interactive accent. One primary blue button per group.
- Red is never a big destructive button. Destructive actions are small with pale red text.
- Keep the controller dark. Operators work in dark rooms. A light theme is optional and secondary.
- Text on `--bg` and `--panel` must stay at or above WCAG AA. `--muted` on `--bg` is about 5.6:1 today; do not go lighter in background or darker in muted text.

## 4. Typography

Loaded from Google Fonts, already in the page, nothing else may be added:

- **Barlow** 400 / 500 / 600 / 700, the UI face. Body 14 px, line height 1.4.
- **Barlow Semi Condensed** 600 / 700, headings and digits. Wordmark 20 px, section headings 18 px, panel headings 16 px, dialog headings 20 px, big transport buttons 18 px uppercase with 0.04 em tracking, remote digits 64 px, display digits 36% of canvas height.
- **Roboto Mono** 500 / 700, anything numeric that lines up: time of day, durations, room codes (28 px, 0.18 em tracking, blue), PIN (16 to 18 px, 0.2 to 0.3 em tracking), kbd chips (10 px).
- Eyebrows: 11 px, 600, uppercase, 0.12 em tracking, muted.
- Hints and labels: 12 px, muted. Labels 600.
- Always `font-variant-numeric: tabular-nums` on anything that counts.

## 5. Components and spacing

- Radius: 8 px on buttons, cards and panels; 6 px on inputs and small chips; 12 px on dialogs and the remote "now" card.
- Borders: 1 px `--line` everywhere. No shadows except the drop indicator (3 px blue line above a card).
- Buttons: 7 × 12 px padding, 600 weight. Variants: default, primary (blue), danger (pale red text), small (4 × 8, 12 px), big (14 × 18, 18 px condensed uppercase), toggle (yellow when pressed). Keyboard hint chip inside some buttons.
- Inputs: `--bg` fill, `--line` border, 7 × 9 px padding. Number inputs mono and centred inside h / m / s groups with tiny uppercase unit captions.
- Focus: 2 px blue outline, 2 px offset, on everything.
- Timer card: grid of index · body · actions, 10 × 12 px padding, 8 px gap between cards.
- Panel: 12 px padding, 16 px top margin.
- Segmented control: pill of two buttons, selected one blue.
- QR block: 148 px white square with 8 px padding, 6 px radius.
- Dialog: 18 px padding, 560 px max, backdrop 60% black.
- Column padding 16 px, respecting safe-area insets. Top bar 10 px vertical.

## 6. Core flows

1. **Build the rundown.** Add timer → fill title, speaker, duration, thresholds, trigger → Save. Repeat, drag to reorder. Import a JSON rundown from a previous event.
2. **Put the clock on the projector.** Open display window and drag it to the second screen, or press F for full-screen in the same tab. Or scan a QR on the remote-displays panel from a tablet.
3. **Run the show.** Space to start, watch the preview, N for the next segment. Nudge ±10 s / ±1 min if a speaker runs long. R to reset. Linked timers start themselves; scheduled timers start at a time of day.
4. **Talk to the speaker.** Type a message, pick a colour, Show. Blackout the screen during video. Flash to get attention.
5. **Hand control to a phone.** Switch a QR to Remote control, scan, enter the PIN.

Keyboard: Space start/pause, R reset, N next, P previous, ↑/↓ ±1 min, Shift ↑/↓ ±10 s, F fullscreen, B blackout, X flash, M message box.

## 7. Known problems to solve

These are the UX issues the redesign should fix, roughly in priority order.

1. **Keyboard shortcuts are hidden.** They live in a panel at the bottom of the rundown column. With eight timers in the list it scrolls off-screen, and a new operator never finds out that Space starts the clock. Only three buttons carry a key chip (Full-screen here, Blackout, Flash). Requirement: shortcuts are visible on the main page without looking for them. Put the key on every control that has one (Start = Space, Reset = R, Next = N, Prev = P, ±1 min = ↑ ↓, ±10 s = Shift ↑ ↓, Full-screen = F, Blackout = B, Flash = X, Message = M), and keep a compact always-visible strip or legend near the transport, never only inside a dialog or a panel you must scroll to. On touch devices the chips can hide, because there is no keyboard.
2. **The mobile controller buries the controls.** See section 2.1. On a phone the Now playing block (status, preview, transport, nudges) must come first or the transport must be a sticky bar, the top bar must collapse to the one primary action plus a menu, timers need touch reordering (move up / move down, or a drag handle with pointer events), card actions need 44 px targets, delete needs a confirm or undo, and the full-screen exit must be a solid visible button.
3. **The running state is not loud enough on the controller.** "Running" is a 12 px muted status line. The active card gets a thin blue border. An operator glancing from across the room cannot tell if the clock is running or paused. Make running, paused and over time unmistakable in both columns.
4. **The remote-displays panel is a wall of text.** Three transports, each with a paragraph, a toggle, a QR, a link and buttons, all stacked under the message panel. Most users will use exactly one. Needs progressive disclosure: pick one, see one. Explanations should move into help, not sit above every control.
5. **Timer card meta line is cryptic.** `20:00 countdown ▲ 5:00 ▲ 1:00 overtime ▶ after previous Dr. Amara Okafor` in 12 px muted text with coloured triangles. Find a representation of the yellow and red thresholds that needs no legend, for example a tiny proportional bar.
6. **Top bar treats five buttons as equals.** "Open display window" is the single most important action for a first-time user and looks like "Export".
7. **No onboarding.** A sample rundown is loaded silently on first run. New users do not learn that there is a display window, a phone remote, or keyboard shortcuts. A light first-run path is wanted, without a tour that gets in the way of a returning operator.
8. **Add timer dialog is fiddly.** Four groups of number inputs. Yellow-at and red-at need m and s each, and nothing stops red being larger than yellow. Presets (yellow at 5 / 2 / 1 min, red at 1 min / 30 s) and inline validation would help. The trigger dropdown hides the time input until "At a time of day" is chosen.
9. **Appearance dialog has no preview.** You change colours and have to look at the preview behind the dialog.
10. **Message panel has no presets.** The same three messages get typed at every event: wrap up, five minutes, Q&A next. Colour swatches have no text labels.
11. **Display has no paused indicator** and no way to tell "stopped at zero" from "paused at zero".
12. **Phone remote.** Connection status and PIN feedback sit at the bottom, below the fold on small phones. Buttons are 17 px text in a tight grid; the two most-used (Start/Pause, Next) should dominate. Blackout should look dangerous when on, since the speaker sees nothing. Needs a clear disconnected state and a reconnecting state, and should hold up in landscape and on a tablet.
13. **Mobile controller controls are desktop-sized.** Transport and nudge buttons should become thumb-sized below 820 px, and dialogs should open full-screen on a phone instead of a 560 px card.
14. **Danger actions are too close to safe ones.** Delete (✕) sits beside Duplicate on every card with no confirmation. Reset all sits beside Add timer.
15. **Done timers only fade.** No visible check mark, no actual duration recorded against planned.
16. **No empty state art.** "No timers yet" is a dashed box.

## 8. Hard constraints on the redesign

- Stays one HTML file with vanilla CSS and JS. No React, no Tailwind, no icon font, no new dependencies. Inline SVG icons are fine.
- Dark theme stays the default. Fonts stay the three already loaded.
- The display renderer must keep scaling with container-query units (`cqh`, `cqw`) because the same markup runs at preview size and at 4K.
- Keep the semantic colours and their meanings.
- Silent. No sound, no haptics, no suggestion of them.
- Keyboard shortcuts stay and stay visible somewhere.
- Must still work at 1024 px wide (old venue laptops). The controller and the remote are both first-class at 390 px (phone) and 768 px (tablet); the controller is not allowed to be a squashed desktop.
- On touch (`pointer: coarse`) every control is at least 44 px tall, nothing depends on hover, double-click or a tooltip, and nothing depends on the Escape key.
- Respect `prefers-reduced-motion`.
- Element ids and `data-` attributes in `index.html` are wired to JavaScript. A redesign that keeps them (or lists every rename) can be dropped in; one that invents a new structure cannot.
- Accessibility: AA contrast, 44 px touch targets on the remote, visible focus, `aria-pressed` on toggles, dialogs stay native `<dialog>`.

## 9. What to deliver

1. Controller at 1440, 1024, 768 and 390 px wide, in the running, paused and over-time states. The 390 and 768 px versions must show how the transport reaches the top, how timers are reordered by touch, and how the top bar collapses.
2. The keyboard shortcut treatment: key chips on the controls and the always-visible strip or legend, plus how it hides on touch.
3. The speaker display in every state in the table in section 2.2, as a 16:9 frame.
4. The phone remote at 390 px, connected with and without a valid PIN, and in the wrong-PIN state.
5. Add timer dialog and Appearance dialog.
6. The remote-displays area, redesigned with one transport visible at a time.
7. A landing page, desktop and mobile.
8. An updated token sheet in the exact `--name: value` form used in section 3, plus a component sheet (button variants, card, panel, input, segmented control, dialog).
9. A change list: for every screen, which existing selector or id changes to what, so the design can be implemented in `index.html` by hand.
