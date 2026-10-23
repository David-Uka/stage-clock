# Prompt for Claude Design

Paste the text below the line into Claude Design. Attach these files from the repository first:

- `index.html` (the whole app, including all CSS)
- `docs/design/BRIEF.md` (this brief)
- `docs/screenshot-controller.png` and `docs/screenshot-display.png`
- `docs/brand/logo-dark.png` and `docs/brand/mark.svg`

---

Redesign Stage Clock, an open-source countdown timer for live events, for better usability. The attached BRIEF.md explains the product, its four surfaces, every colour and font token, the components, the user flows and a prioritised list of fourteen UX problems. The attached index.html is the real app; its CSS variables are the source of truth for colour. Read both before you draw anything.

Keep the identity exactly: dark control-room UI on #0b0d10 with #14181d panels and #2a323b lines, text #e8ecf0, muted #8b96a3, one blue accent #3fb6ff, and the semantic colours yellow #f5c518 for wrap-up and red #ff3b3b (display: #ff2d2d) for final and over time. Those two colours carry meaning and are never decorative. The speaker display is white on pure black by default. Fonts are Barlow for UI, Barlow Semi Condensed for headings and digits, Roboto Mono for anything numeric; nothing else. Logo and wordmark as attached: "STAGE" white, "CLOCK" red.

Design for three people: a stressed operator at a laptop in a dark room, a speaker reading the clock from across a hall, and a host holding a phone. Every alert is silent and visual; never suggest sound.

Fix the problems in section 7 of the brief, in that order of importance. In particular: make running versus paused versus over time unmistakable on the controller; collapse the remote-displays panel to one transport at a time; replace the cryptic timer-card meta line with something that needs no legend; give the top bar one clear primary action; add a light first-run path; add threshold presets and validation to the Add timer dialog; put a live preview in the Appearance dialog; add message presets; add a paused indicator to the display; move status to the top of the phone remote and make Start and Next dominate.

Hard constraints: single HTML file with vanilla CSS, no framework, no icon font, no new fonts, dark theme stays default, the display keeps scaling with container-query units, keyboard shortcuts stay visible, AA contrast, 44 px touch targets on the phone, reduced-motion respected, and the existing element ids and data attributes in index.html are kept or every rename is listed.

Deliver, in this order: the controller at 1440, 1024 and 390 px in running, paused and over-time states; the speaker display in every state listed in section 2.2 as 16:9 frames; the phone remote at 390 px connected, wrong PIN, and no PIN; the Add timer and Appearance dialogs; the redesigned remote-displays area; a landing page for the website (desktop and mobile) with the content listed in section 2.4; a token sheet in `--name: value` form matching section 3; a component sheet; and a change list mapping every existing selector or id to its new treatment so the design can be implemented by hand in index.html.
