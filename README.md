# Ship It

An idle game about writing code. Tap the big key (or type anything on a keyboard) and a live editor types out code; hire a rubber duck and an intern to write it for you, race sprint tickets against the clock, squash bugs that crawl across the screen, and ship releases for permanent stars.

Built as a plain web app (TypeScript + Vite, no framework), so the same code can later be wrapped for the App Store and Google Play with Capacitor, or for Steam with Tauri.

## Run it

Requires Node 22.12 or newer.

```sh
npm install
npm run dev        # local dev server with hot reload
npm test           # unit tests (game rules, saves)
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
```

`dist/` is fully self-contained (fonts included, relative paths, works offline), so it can be uploaded as-is to itch.io, a web portal, any static host, or a subfolder. To publish on GitHub Pages, see the comment at the top of `.github/workflows/deploy.yml`.

## How the code is organised

```
src/
  core/        Game rules. No DOM, no browser APIs: runs the same in tests, browsers and native shells.
    content.ts       Upgrades, sprint tiers, bug timing, ship and offline tuning. Balance lives here.
    num.ts           Big-number wrapper (break_infinity.js) and number formatting.
    state.ts         The saved game state (plain data).
    economy.ts       Output per tap and per second, prices, buying, doublings.
    sprints.ts       Backlog tickets, difficulty, sprint results.
    bugs.ts          Bug spawning, escaping and rewards.
    ship.ts          Prestige: stars for shipping a release.
    achievements.ts  Achievement definitions and checks.
    game.ts          The Game class: the UI's only entry point. Applies actions and time, emits events.
    save.ts          Versioned save format with migrations and validation.
  platform/    What the game needs from the device (storage, haptics, app hidden). web.ts today.
  ui/          Everything on screen: editor, code generator, keycap, bug, header, panels, sound.
  styles/      The visual language (main.css).
tests/         Vitest unit tests for core/.
```

Flow: the UI calls `game.tap()`, `game.buy(id)`, `game.startSprint(slot)`, `game.squashBug()`, `game.ship()`, and `game.tick()` every 200 ms. The game mutates its state and emits events (`purchase`, `sprintEnded`, `bugSpawned`, `achievement`…), which the UI turns into log lines in the editor and panel updates.

### Rules of thumb

- Game logic goes in `core/` and never touches `document` or `window`. Time comes from the injected clock, randomness from the injected `rng`, so tests are deterministic.
- All quantities are `Decimal`s (via `core/num.ts`) so numbers can pass 1e308.
- Device features go through `platform/`. To ship natively, add a `capacitor.ts` implementing `Platform` (Preferences for storage, the Haptics plugin, app state events) and return it from `getPlatform()`.
- Changing the shape of the save: bump `SAVE_VERSION` in `core/save.ts` and add a migration from the previous version. Old saves are upgraded on load; unreadable saves fall back to a new game instead of crashing.

## Game rules (current tuning)

- Upgrade prices grow 15% per copy; every 25 copies of one upgrade doubles its output.
- Sprints: three tickets at a time (20 s, 40 s, 75 s). Each shows the taps per second it needs at your current output. Missing a deadline only loses the bonus; every line written still counts. The long ticket also grants ×2 output for 30 s.
- Bugs appear every 28–50 s and crawl for about 9 s. Squashing one pays 15 s of automation plus 10 taps.
- Shipping a release needs 25,000 lines for the first star (stars = floor(√(lines this release / 25,000))). It resets lines and upgrades; each star adds 10% to all output.
- Time away earns 50% of automation output, up to 2 hours.
