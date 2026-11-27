# Notes for Claude sessions

- **Start from the newest code, not just `main`.** Work is sometimes pushed to a `claude/*` session branch and not merged yet. Before changing anything, run `git fetch origin` and compare: `git log --oneline origin/main..origin/<branch>` for each branch, and the `version` in each branch's `package.json`. If a branch is ahead of `main`, build on it (or ask which to use).
- **Never publish an older build over a newer one.** The game is published as a Claude artifact named "Ship It". Before publishing, read the live artifact and compare it with this checkout (its tabs and bundle, and the version shown in settings → about). If the live game has features this checkout lacks, stop and ask.
- The artifact must keep `capabilities: { db: {}, user: {} }` (saves live in the player's artifact database; see README.md).
- After changing anything in `src/core/content.ts`, run `npm test` and `npm run simulate`: the pacing tests fail if the early game drags or the late game stalls, if an engaged player (the engaged bot in `tests/sim.ts`) races through or waits too long for something new, or if one project or stack runs away with the game.
