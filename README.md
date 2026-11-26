# Ship It

An idle game about writing code, styled like a terminal workspace. Tap the big key (or type anything on a keyboard) and a live editor types out code. Install a rubber duck and an intern to write it for you, race sprint tickets, squash bugs crawling across the screen, grab coffee, fix outages, resolve merge conflicts, then ship releases for permanent stars and spend them on your dotfiles. Later you hire a team, answer mail, keep tech debt down, survive boss incidents and raise funding rounds.

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

**Developer mode:** open the game with `#dev` (or `?dev`) in the address, or tap the version number in settings seven times. Settings then shows buttons for extra lines and stars, spawning bugs, incidents, applicants, mail and boss incidents, adding tech debt, finishing sprints and tasks, unlocking tabs and skipping an hour.

## How the game works

| System | What it does |
| --- | --- |
| **pkgs** | Typing and automation packages (the last ones appear after a funding round). Prices grow 15% per copy; each tier costs ~20x the last for ~6x the output. Every 25 copies of a package offers a pick of two upgrades: a major rewrite (x2), a plugin ecosystem (x1.4, +8% to every package of its kind) or an LTS build (x1.5, half price). `top` shows where output comes from. |
| **Tech debt** | Builds from 25K lines written in all, faster with boosts running and escaped bugs. Free up to 10%; above that automation loses up to 50%. `git refactor` in pkgs clears it for a few seconds of output. |
| **Flow state** | Keep tapping and the meter in the status line fills, up to x2 per tap (more with `flow.conf`). It drains after a short pause. |
| **Critical taps** | `keybindings.json` and `sudo.sh` give a chance for a tap to write x5. |
| **Sprints** | Three tickets (20s, 40s, 75s), each showing the taps per second it needs. Missing a deadline only loses the bonus. A used slot waits for the next standup (1, 2.5 or 7 min). The long ticket always drops a script. |
| **~/bin scripts** | Collectable timed boosts you run when you like: `turbo.sh` (x2 per tap), `nightly.sh` (x2 automation), `autotype.sh` (taps for you), `sudo.sh` (+crit chance). |
| **Bugs** | Crawl across the editor every 28–50s; squashing pays ~15s of automation plus 10 taps. `oncall.yml` squashes some for you. |
| **Incidents** | Every 1–2.5 min: coffee (x3 everything for 20s), an outage (tap 30 times to hotfix) or a merge conflict (pick the side that compiles). Missing one never costs anything. |
| **TODO.md** | Three small tasks at a time with small permanent bonuses (or scripts); a finished slot refills after 45s. Each release has a milestone (beat this run's last release by half, with enough packages and sprints) that makes the ship pay +25% stars. |
| **Ship** | Stars come from every line shipped this run (since the last funding round or major version): floor(2·cbrt(lines shipped this run / 2M)), so 2 at 2M, 4 at 16M, 20 at 2B in total. A release needs 2M lines and pays what it adds to that total (times the project and brand bonuses), so one big release beats several small ones. The ship tab shows stars per minute, marks a release ready to merge at +50% stars, and keeps a `git log` of the last 10 releases. Shipping resets lines and packages. Each star earned adds 10% output, even after it is spent. From the second release you pick the next project (CLI tool, enterprise suite, game engine, startup MVP, operating system), each with its own rules. Releases are numbered v{major}.{minor}. |
| **Funding** | Enough stars raise the next round (Seed at 150, then Series A–C and IPO): x3 output for good, a new language in the editor, and equity for company perks (headcount, brand, runway, platform team, devrel). A round restarts stars, dotfiles, releases and the star curve. |
| **Team** | From 100K lines, applicants arrive with a trait (senior, 10x, tester, SRE…). Hire up to 3 (more with headcount) and give each a role: features, sprints, on-call, bug duty or refactoring. They type alongside you in the editor. |
| **Mail** | Story mail from the team and choices with trade-offs, plus `man` pages that unlock as you discover systems. |
| **Boss incidents** | From 1M lines: a Friday deploy, a DDoS, a security audit or a migration takes over the editor in timed stages (mash the key or pick the right line). Winning pays big; losing adds tech debt. |
| **dotfiles** | 11 perks in `editor/`, `team/` and `system/`, bought with stars. `.zshrc` has no cap (x1.1 all output per level, each level twice the price). |
| **Workflows** | Automation earned by shipping, each switchable in the ship tab: `deps.yml` and `dev-deps.yml` install packages (after 2 and 4 releases), `scripts.yml` runs scripts (6), `release.yml` ships as the same project once a release would grow stars by +50/75/100/200% (15). Bugs and coffee are left to the team. |
| **Major versions** | From the Series B round, alongside funding: cutting one banks your stars (and the release in progress) for XP, floor(cbrt(stars banked in total / 200K)). Each XP earned adds 50% to stars from shipping, even after it is spent. Stars, dotfiles, releases and packages reset; funding, equity, XP, skills, the team, workflows, challenge rewards and users stay. It's the reset that never runs out, which carries runs past the walls before and after the IPO. |
| **Skills** | Bought with XP in `~/resume.md` and kept forever: 10x engineering (x2 all output per level, no cap), pair programming (+25% stars from shipping), head start (start each major with stars), muscle memory (keep dotfiles across majors). |
| **Challenge releases** | After the first major: restart a release under a restriction (Legacy codebase, CI is down, Broken keyboard, Solo dev, Clean install) and ship it with about twice the lines shipped so far this run for a permanent reward. |
| **Market** | After the first ship. Every release is reviewed (1–5★: bigger releases, sprints merged and bugs squashed score better; escaped bugs and tiny patches worse) and brings users by its size and review. Users start drifting to rivals after 45 quiet minutes without an update (1% a minute, up to half per quiet spell); time away counts at 35% and on its own costs at most a quarter. A 4★+ release wins back half. 15 fictional rival companies fill the chart, each rival behind you adds 5% output, and passing one for the first time drops scripts. Rivals announce launches: ship first for x1.5 new users, or they grow. A press feed covers releases, rounds, majors and rivals, and you can name your app. |
| **Career** | A title by stars earned over the whole game, from intern to cto. |
| **Achievements** | 93, each worth +1% output, including a few secrets. |
| **Commit streak** | Play on consecutive days for a daily bonus (scripts every 3rd and 7th day). TODO shows a heatmap of the days you played. |
| **Time away** | 25% of automation for up to 2 hours (raised by `crontab`), shown on a welcome-back screen. |

New players see only the pkgs tab at first; sprints, TODO, mail, team, ship, market and major appear as they progress. The rubber duck gives advice when tapped, a CI pane runs builds once the pipeline is installed, and a screensaver takes over after a minute idle (settings can turn it off).

Pacing (from `npm run simulate`): at 4 taps a second the first ship lands around 7 minutes, then every 10–35 minutes. After two hours of active play the last tiers are still ahead. With the bot raising rounds as they open and cutting majors at +50% XP: Seed around hour 3, Series B and the first major around hour 4½, the IPO around hour 6, then a major every 20 minutes to 2 hours. Waiting for a real jump pays: shipping on a 5-minute timer or at every star earns less than half the stars of the patient bot, and `tests/pacing.test.ts` checks it.

## How the code is organised

```
src/
  core/        Game rules. No DOM, no browser APIs: runs the same in tests, browsers and native shells.
    content.ts       All content and tuning: packages, forks, perks, scripts, sprints, incidents, quests, debt,
                     projects, team, bosses, funding, mail timing, unlocks.
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
    ship.ts          Prestige (the star curve, versions) and the next project.
    debt.ts          Tech debt and refactoring.
    team.ts          Applicants, hiring and roles.
    bosses.ts        Boss incidents.
    funding.ts       Funding rounds, equity and company perks.
    major.ts         Major versions, XP, skills and challenge releases.
    mods.ts          Rule changes from major versions (challenges, skills, XP), combined in one place.
    workflows.ts     Automation earned by shipping (.github/workflows).
    market.ts        Reviews, users and churn, rival companies, the chart and the press.
    career.ts        Career titles.
    mail.ts          Story mail and choices.
    man.ts           man pages.
    achievements.ts  Achievement definitions and checks.
    dev.ts           Developer shortcuts.
    game.ts          The Game class: the UI's only entry point. Applies actions and time, emits events.
    save.ts          Versioned save format with migrations, validation, export/import.
  platform/    What the game needs from the device (storage, haptics, app hidden). web.ts today.
    saves.ts         Where saves live: this device plus a cloud copy, backups, newest-wins loading.
    claude.ts        The cloud copy when served as a Claude artifact (its per-player database).
  ui/          Everything on screen: editor, code generator, key, bug, incidents, boss fights, header,
               panels, toasts and effects (fx.ts), the CI pane and duck (workspace.ts), charts,
               screensaver, merge, round and welcome splashes, sounds.
  assets/      keyboard.wav: the key sounds, cut from a recording of a real mechanical keyboard
               (presses, their releases, heavy presses for crits, runs of keys for rewards).
  styles/      The visual language and the four themes (main.css).
public/        Icons, web app manifest, service worker.
scripts/       keyboard-sprite.py: re-cuts keyboard.wav and its clip list from the recording.
tests/         Vitest unit tests for core/, plus the pacing simulator (sim.ts).
```

Flow: the UI calls methods on `Game` (`tap`, `buy`, `chooseFork`, `refactor`, `hire`, `raise`, `answerMail`, `bossPick`, `ship`, …) and `tick()` every 200 ms. The game mutates its state and emits events, which the UI turns into log lines in the editor, sounds, splashes and panel updates.

### Rules of thumb

- Game logic goes in `core/` and never touches `document` or `window`. Time comes from the injected clock, randomness from the injected `rng`, so tests and the simulator are deterministic.
- All quantities are `Decimal`s (via `core/num.ts`) so numbers can pass 1e308.
- After changing anything in `content.ts`, run `npm run simulate` to see the effect on pacing. `tests/pacing.test.ts` fails if the first ship gets too fast or too slow.
- Device features go through `platform/`. To ship natively, add a `capacitor.ts` implementing `Platform` (Preferences for storage, the Haptics plugin, app state events) and return it from `getPlatform()`.
- Saves: browser storage alone is not trusted (some embedded views drop it). As a Claude artifact the game also keeps a copy in the player's private artifact database (the artifact must declare `capabilities: { db: {}, user: {} }`); elsewhere it saves on the device only, and settings says which. The cloud copy is always read, as the store confirms it (never a cached copy, which can be empty right after an update), before it is written; however long that takes (where live updates aren't available the store answers with its periodic refresh, about 30 s), the game keeps waiting instead of giving up on the account for the session. The cloud is then followed live, because the game open in another tab or device writes the same document: a copy that saves more progress, or replaces the save on purpose, wins, and the others switch to it instead of writing over it. An import or restore waits for the account and only reloads once the save is kept somewhere. The game starts from the save with the most progress, not the newest, so a new game started while the real save was out of reach can't replace it; only a deliberate reset, import or restore can, and saves from before it stop counting on every device. A save with more progress is never replaced without leaving a backup that settings can restore, and a save from a newer version is never written over.
- Changing the shape of the save: bump `SAVE_VERSION` in `core/save.ts` and add a migration from the previous version. Old saves are upgraded on load; unreadable saves fall back to a new game instead of crashing.
