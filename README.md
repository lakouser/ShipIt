# Ship It

An idle game about writing code, styled like a terminal workspace. Tap the big key (or type anything on a keyboard) and a live editor types out code. Install a rubber duck and an intern to write it for you, race sprint tickets, squash bugs crawling across the screen, grab coffee, fix outages, resolve merge conflicts, then ship releases for permanent stars and spend them on your dotfiles.

Built as a plain web app (TypeScript + Vite, no framework), so the same code can later be wrapped for the App Store and Google Play with Capacitor, or for Steam with Tauri.

## Run it

Requires Node 22.12 or newer.

```sh
npm install
npm run dev        # local dev server with hot reload
npm test           # unit tests + a 2-hour pacing check
npm run simulate   # longer pacing run with a printed report (SIM_MINUTES, SIM_TAPS)
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
```

`dist/` is fully self-contained (font included, relative paths, works offline after the first visit via a service worker, installable to the home screen). Upload it as-is to itch.io, a web portal, any static host, or a subfolder. To publish on GitHub Pages, see the comment at the top of `.github/workflows/deploy.yml`.

**Developer mode:** open the game with `#dev` (or `?dev`) in the address, or tap the version number in settings seven times. Settings then shows buttons for extra lines and stars, spawning bugs and incidents, finishing sprints and tasks, unlocking tabs and skipping an hour.

## How the game works

| System | What it does |
| --- | --- |
| **pkgs** | 7 typing upgrades and 9 automation upgrades. Prices grow 15% per copy; every 25 copies doubles that package. Each tier costs ~20x the last for ~6x the output. |
| **Flow state** | Keep tapping and the meter in the status line fills, up to x2 per tap (more with `flow.conf`). It drains after a short pause. |
| **Critical taps** | `keybindings.json` and `sudo.sh` give a chance for a tap to write x5. |
| **Sprints** | Three tickets (20s, 40s, 75s), each showing the taps per second it needs. Missing a deadline only loses the bonus. A used slot waits for the next standup (1, 2.5 or 7 min). The long ticket always drops a script. |
| **~/bin scripts** | Collectable timed boosts you run when you like: `turbo.sh` (x2 per tap), `nightly.sh` (x2 automation), `autotype.sh` (taps for you), `sudo.sh` (+crit chance). |
| **Bugs** | Crawl across the editor every 28–50s; squashing pays ~15s of automation plus 10 taps. `oncall.yml` squashes some for you. |
| **Incidents** | Every 1–2.5 min: coffee (x3 everything for 20s), an outage (tap 30 times to hotfix) or a merge conflict (pick the side that compiles). Missing one never costs anything. |
| **TODO.md** | Three small tasks at a time with small permanent bonuses (or scripts); a finished slot refills after 45s. Each release has a milestone that pays stars. |
| **Ship** | Stars = floor(cbrt(lines this release / 2M)): 1 at 2M, 2 at 16M, 10 at 2B. Shipping resets lines and packages. Each star earned adds 10% output forever, even after it is spent. |
| **dotfiles** | 10 permanent perks in `editor/`, `team/` and `system/`, bought with stars. |
| **Achievements** | 56, each worth +1% output, including a few secrets. |
| **Commit streak** | Play on consecutive days for a daily bonus (scripts every 3rd and 7th day). |
| **Time away** | 25% of automation for up to 2 hours (raised by `crontab`), shown on a welcome-back screen. |

New players see only the pkgs tab at first; sprints, TODO and ship appear as they progress.

Pacing (from `npm run simulate`): at 4 taps a second the first ship lands around 6 minutes, then every 5–20 minutes; at 1 tap a second, around 14 minutes. After two hours of active play the last tiers are still ahead.

## How the code is organised

```
src/
  core/        Game rules. No DOM, no browser APIs: runs the same in tests, browsers and native shells.
    content.ts       All content and tuning: packages, perks, scripts, sprints, incidents, quests, unlocks.
    num.ts           Big-number wrapper (break_infinity.js) and number formatting.
    state.ts         The saved game state (plain data).
    economy.ts       Output per tap and per second, multipliers, prices, buying.
    effects.ts       Timed effects and the script inventory.
    perks.ts         dotfiles perks.
    sprints.ts       Backlog tickets, standup cooldowns, results.
    bugs.ts          Bug spawning, escaping and rewards.
    incidents.ts     Coffee, outages and merge conflicts.
    quests.ts        TODO.md tasks and the release milestone.
    streak.ts        Daily commit streak.
    ship.ts          Prestige.
    achievements.ts  Achievement definitions and checks.
    dev.ts           Developer shortcuts.
    game.ts          The Game class: the UI's only entry point. Applies actions and time, emits events.
    save.ts          Versioned save format with migrations, validation, export/import.
  platform/    What the game needs from the device (storage, haptics, app hidden). web.ts today.
  ui/          Everything on screen: editor, code generator, key, bug, incidents, header, panels,
               merge and welcome splashes, sounds.
  styles/      The visual language and the four themes (main.css).
public/        Icons, web app manifest, service worker.
tests/         Vitest unit tests for core/, plus the pacing simulator (sim.ts).
```

Flow: the UI calls methods on `Game` (`tap`, `buy`, `buyPerk`, `runScript`, `startSprint`, `squashBug`, `catchCoffee`, `chooseConflict`, `ship`, …) and `tick()` every 200 ms. The game mutates its state and emits events, which the UI turns into log lines in the editor, sounds, splashes and panel updates.

### Rules of thumb

- Game logic goes in `core/` and never touches `document` or `window`. Time comes from the injected clock, randomness from the injected `rng`, so tests and the simulator are deterministic.
- All quantities are `Decimal`s (via `core/num.ts`) so numbers can pass 1e308.
- After changing anything in `content.ts`, run `npm run simulate` to see the effect on pacing. `tests/pacing.test.ts` fails if the first ship gets too fast or too slow.
- Device features go through `platform/`. To ship natively, add a `capacitor.ts` implementing `Platform` (Preferences for storage, the Haptics plugin, app state events) and return it from `getPlatform()`.
- Changing the shape of the save: bump `SAVE_VERSION` in `core/save.ts` and add a migration from the previous version. Old saves are upgraded on load; unreadable saves fall back to a new game instead of crashing.
