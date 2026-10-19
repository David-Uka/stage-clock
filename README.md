# Stage Clock

A free, open-source countdown timer for live events: conferences, church services, pitch nights, school debates, anything with a speaker and a clock.

Runs in any browser, installs as a Windows / macOS / Linux app, works offline, and needs no account or server. Nothing leaves your machine.

**Silent by design.** Every alert is visual: the digits turn yellow, then red, then the whole screen flashes red with "TIME'S UP". No sound, ever.

![Controller](docs/screenshot-controller.png)
![Speaker display](docs/screenshot-display.png)

## Get it

| | |
| --- | --- |
| **Use it in the browser** | <https://david-uka.github.io/stage-clock/> |
| **Install on Windows** (no download) | Open the link above in Edge or Chrome and click the **Install app** icon in the address bar. |
| **Download the Windows installer / portable .exe** | [Latest release](https://github.com/David-Uka/stage-clock/releases/latest) |
| **macOS / Linux** | Same release page: `.dmg` and `.AppImage` |

> The Windows installer is not code-signed yet, so SmartScreen may show "Windows protected your PC". Click **More info → Run anyway**. The in-browser install has no such warning.

## What it does

- **Rundown**: one timer per speaker or segment, each with a title, speaker line, duration, count down or count up, what happens at zero (keep counting overtime as `+0:12`, or stop), and optional auto-start of the next timer. Drag to reorder, duplicate, edit, delete.
- **Wrap-up colors**: per timer, choose when the digits turn yellow and when they turn red.
- **Time's up alert**: flash the whole screen red, solid red screen, blinking red digits, or plain red digits. The "TIME'S UP" text is editable.
- **Speaker display**: huge digits, title at the top, speaker at the bottom, time of day, "next up", progress bar. Open it in its own window and drag it to the projector or confidence monitor, or go fullscreen in the same tab.
- **Live control**: start/pause, reset, next/previous, nudge ±10 s / ±1 min / +5 min while running, blackout, flash to get attention, and text messages to the speaker (white/green/red, bold, uppercase, flashing).
- **Appearance**: all colors, three digit fonts, toggles for every element, 12/24-hour clock.
- **Import/export** the rundown and appearance as JSON. Everything is saved in the browser automatically.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Start / pause |
| R | Reset current timer |
| N / → | Next timer |
| P / ← | Previous timer |
| ↑ / ↓ | Add / remove 1 minute |
| Shift + ↑ / ↓ | Add / remove 10 seconds |
| F | Fullscreen display in this tab (Esc to leave) |
| B | Blackout |
| X | Flash the display |
| M | Jump to the message box |

## Run from source

The whole app is `index.html`. No build step.

```sh
git clone https://github.com/David-Uka/stage-clock
cd stage-clock
python3 -m http.server 8080        # or: npx serve .
```

Open <http://localhost:8080>. Open `/?view=output` in another window for the display.

### Desktop builds

```sh
cd electron
npm install
npm start              # run it
npm run build:win      # electron/dist/Stage Clock-1.0.0-win-x64.exe (+ portable)
npm run build:mac      # .dmg
npm run build:linux    # .AppImage
```

Tagging a release (`git tag v1.0.1 && git push --tags`) makes GitHub Actions build all three and attach them to the release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests are welcome as issues.

## Credits

Feature ideas borrowed from the tools event crews already use: [Stagetimer](https://stagetimer.io) (rundown, wrap-up colors, messages, output screen), [Big Timer](https://www.bigtimer.net) (one-click fullscreen, red flash), [CueTimer](https://presentationtools.com) (whole-screen flash, overtime counter), and [Ontime](https://github.com/cpvalente/ontime) (operator vs stage views).

## License

[MIT](LICENSE). Use it, change it, ship it.
