<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-dark.png">
    <img src="docs/brand/logo-light.png" alt="Stage Clock" width="520">
  </picture>
</p>

Free, open-source countdown timer for live events. Runs in the browser, installs as a Windows, macOS or Linux app, works offline. No account, no server, nothing leaves your machine.

All alerts are visual. The digits turn yellow, then red, then the screen flashes red with "TIME'S UP". No sound.

![Controller](docs/screenshot-controller.png)
![Speaker display](docs/screenshot-display.png)

## Get it

- **Browser:** <https://david-uka.github.io/stage-clock/>
- **Windows, no download:** open the link above in Edge or Chrome and click the install icon in the address bar.
- **Installer / portable .exe, macOS, Linux:** [latest release](https://github.com/David-Uka/stage-clock/releases/latest)

The .exe is not code-signed yet. If SmartScreen appears, click **More info → Run anyway**.

## Features

- One timer per speaker or segment, with title, speaker line, duration, count down or count up, overtime or stop at zero, auto-start next. Drag to reorder.
- Per-timer yellow and red warning times.
- Time's up: flash the screen red, solid red, blinking digits, or plain red digits. The text is editable.
- Speaker display in its own window for the projector, or fullscreen in the same tab.
- Start/pause, reset, next/previous, ±10 s and ±1 min while running, blackout, flash, messages to the speaker.
- All colors and fonts adjustable. JSON import/export. Saves automatically.

## Shortcuts

| Key | Action |
| --- | --- |
| Space | Start / pause |
| R | Reset |
| N / P | Next / previous timer |
| ↑ / ↓ | ±1 minute (Shift: ±10 s) |
| F | Fullscreen display (Esc to leave) |
| B | Blackout |
| X | Flash |
| M | Message box |

## Run from source

The app is a single `index.html`, no build step.

```sh
git clone https://github.com/David-Uka/stage-clock
cd stage-clock
python3 -m http.server 8080
```

Desktop builds: `cd electron && npm install && npm run build:win` (or `build:mac`, `build:linux`). Pushing a `v*` tag builds all three on GitHub Actions and attaches them to a release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
