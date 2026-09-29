# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- OpenSpec workflows are available as slash commands in `.claude/commands/opsx/` (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:update`, `/opsx:sync`, `/opsx:archive`). Matching skills are in `.claude/skills/`. Prefer these over running the workflow by hand.
- To check UI or audio behaviour, run the dev server in the background and drive the app with the Claude in Chrome tools. Audio can't be heard, so verify timing by instrumenting `OscillatorNode.prototype.start` from the page to log scheduled times. Keep each browser batch short, since long waits time out. Remove any test data written to `localStorage` afterwards.
