# Contributing to Stage Clock

Thanks for helping. The whole app is one file, `index.html`, with no build step, so contributing is simple.

## Run it locally

```sh
git clone https://github.com/David-Uka/stage-clock
cd stage-clock
python3 -m http.server 8080     # or: npx serve .
```

Open <http://localhost:8080>. Open `http://localhost:8080/?view=output` in a second tab to see the speaker display.

## Tests

```sh
npm install
PW_CHROME=1 npm test      # uses your installed Google Chrome
npx playwright install chromium && npm test   # or download Chromium instead
```

Every change goes through a pull request, and the tests run on each one. `main` is protected: nothing is pushed to it directly.

## Before you open a pull request

- Keep it dependency-free. The web app must stay a single `index.html` that works offline.
- Keep alerts silent. No audio, by design.
- Test the three places the display renders: the preview, "Full-screen here", and "Open display window".
- Test at phone width (about 400px) and on a 1080p screen.
- Add or update a test in `tests/` for anything that changes behavior.

## Reporting bugs

Use the bug report template. Include your browser, OS, and whether you used the web version, the installed PWA, or the `.exe`.

## Ideas we would welcome

- More display layouts (progress ring, time-of-day only, "pre-show" countdown to a start time)
- Scheduled start times and linked timers that start when the previous ends
- Remote control over a local network (controller on a laptop, display on a Raspberry Pi)
- Translations
