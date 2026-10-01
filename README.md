# Fretwork

Browser-based guitar practice tools, driven from the keyboard so your hands can stay on the guitar.

## Tools

- **1 minute changes:** pick two chords, get an audible count-in, alternate between the chords for 60 seconds, then log how many changes you made. Scores are tracked per chord pair. In Mic mode, your strums are counted automatically from a microphone or audio interface.
- **Metronome:** a steady click from 30 to 300 BPM, with an accented first beat, tap tempo and a large beat display. Its speed trainer raises the tempo by a set step every few bars until it reaches a target, and it keeps time in a background tab.

## Privacy

Fretwork runs entirely in your browser. There are no accounts and no server-side storage. The microphone is used only in Mic mode, and its audio never leaves the browser. Results and settings are saved in your browser only. The published build blocks connections to any other site with a Content-Security-Policy. The full statement is on the app's Privacy page, linked from the footer.

## Development

```sh
npm install
npm run dev     # start the dev server
npm test        # run unit and UI tests
npm run lint    # lint
npm run build   # type-check and build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how work is planned, built and reviewed.

## License

[MIT](LICENSE)
