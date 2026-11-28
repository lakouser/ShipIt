# Ship It

An idle game about writing code, styled like a terminal workspace. Tap the big key (or type anything on a keyboard) and a live editor types out code. Install a rubber duck and an intern to write it for you, race sprint tickets, squash bugs crawling across the screen, grab coffee, fix outages, resolve merge conflicts, then ship releases for permanent stars and spend them on your dotfiles. Later you hire a team, answer mail, write tests, close user issues, keep tech debt down, survive boss incidents and raise funding rounds, each one a rewrite in the language you pick. Along the way you decide who the product is for, arrange your services on an architecture board, adopt RFCs that take real hours, merge pull requests that came in while you were away and write your own automation rules. The campaign ends when you take the company public; after that it carries on as a public company, beating quarters and buying rivals, until the last one puts you in front of an antitrust committee. Win that and you can sell up and found the next company.

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

**Developer mode:** open the game with `#dev` (or `?dev`) in the address, or tap the version number in settings seven times. Settings then shows buttons for extra lines and stars, spawning bugs, incidents, applicants, mail and boss incidents, adding tech debt, finishing sprints and tasks, filing user issues, ending the quarter, adding cash, unlocking tabs, skipping an hour, stars for the next round, finishing the RFC under discussion, opening pull requests and buying every rival but the last. `?hour=22` in the address pins the time of day in `office.png`, to look at its lighting.

## How the game works

| System | What it does |
| --- | --- |
| **pkgs** | Typing and automation packages (the last ones appear after a funding round). Prices grow 15% per copy; each tier costs ~20x the last for ~6x the output. Every 25 copies of a package offers a pick of two upgrades: a major rewrite (x2), a plugin ecosystem (x1.4, +8% to every package of its kind) or an LTS build (x1.5, half price). `top` shows where output comes from. |
| **Tech debt** | Builds from 25K lines written in all, faster with boosts running and escaped bugs. Free up to 10%; above that automation loses up to 50%. `git refactor` in pkgs clears it for a few seconds of output. |
| **Flow state** | Keep tapping and the meter in the status line fills, up to x2 per tap (more with `flow.conf`). It drains after a short pause. |
| **Critical taps** | `keybindings.json` and `sudo.sh` give a chance for a tap to write x5. |
| **Sprints** | Three tickets (20s, 40s, 75s), each showing the taps per second it needs and paying 1x, 1.4x and 1.9x its target. Missing a deadline only loses the bonus. A used slot waits for the next standup (1, 2.5 or 7 min). The long ticket always drops a script. |
| **~/bin scripts** | Collectable timed boosts you run when you like: `turbo.sh` (x2 per tap), `nightly.sh` (x2 automation), `autotype.sh` (taps for you), `sudo.sh` (+crit chance). They sit in four slots under the key: tap one to run it, or again to add its time. |
| **Bugs** | Crawl across the editor every 28–50s; squashing pays ~15s of automation plus 10 taps. `oncall.yml` squashes some for you. |
| **Incidents** | Every 1–2.5 min: coffee (x3 everything for 20s), an outage (tap 30 times to hotfix) or a merge conflict (pick the side that compiles). Missing one never costs anything. |
| **TODO.md** | Three small tasks at a time with small permanent bonuses (or scripts); a finished slot refills after 45s. Each release has a milestone (beat this run's last release by half, with enough packages and sprints) that makes the ship pay +25% stars. |
| **Test suite** | Opens after the third ship (work/tests). Pick a test budget (0, 10, 20 or 30%): that share of the code you write (taps, automation, time away) goes to tests instead, so it doesn't count toward stars or spending. Coverage is the share of this release's code written as tests, times 3 (Haskell doubles it). It catches that share of escaping bugs, slows tech debt (up to half) and adds up to +1★ to the release's review. It starts again with every release, and the release log records it. |
| **Issues** | Once the app has had 250K users (co/issues), users file an issue every 5 minutes, playing or away, until 12 are open (an hour's worth); then nothing more is filed. One tap closes them all: bug reports pay 45s of output and 2 debt each, feature requests +0.1★ on the next review each (up to +0.5), support questions keep 0.5% of your users each. Low coverage means more bug reports. |
| **Roadmap** | Opens after the fourth ship (pkgs/features). Users come in three kinds, and each pays in proportion to its share of all your users: developers up to x1.5 automation, companies up to +30% stars from shipping (and x2 revenue after the IPO), everyone else up to x1.5 per tap and +100% new users. Point the roadmap at one: every release then ships that segment's next feature as its headline (a CLI, single sign-on, stickers…), which brings x1.2 new users, all of that kind. Users you had before, and users who come with an acquisition, are nobody in particular. |
| **RFCs** | Open after the fifth ship (work/rfcs). Twelve changes to how the company works, each adopted once and kept for good, through rounds, majors and new companies: keep 10% of every package when you ship, sprint slots back twice as fast, package prices that grow 14.5% per copy, crits that write x8, a fourth TODO task, more time in outages and boss stages, escaped bugs that add no debt, a better offline rate, slower flow decay, boss fights that cost nothing to lose and pay double to win, a fourth pull request to pick from, a longer grace before users drift. One is discussed at a time, on a real clock that runs while you're away: 1h, 2h, 4h, 6h, then 8h each. |
| **Architecture board** | Opens with the Seed round (pkgs/infra): `docker-compose.yml` as a grid of slots, three at Seed and one more each round up to six, for nine services (api, worker, db, cache, queue, cdn, lb, search, monitor). Each service has its own effect; two that work together form a link when they sit side by side; three of the right kinds, joined up, make a named pattern (three-tier app, event-driven, edge stack, observability); a service next to the monitor works 50% harder. Arrange a draft, then `docker compose up -d`: one deploy per release, so the board can't be swapped around for whatever comes next. It stays through rounds and majors. |
| **Rules** | From the Series C round, at the bottom of ship/auto: `~/bin/rules`, two lines of "when X, do Y" (more with the shell scripting skill). Conditions: flow is full, a sprint starts, coffee kicks in, a boss fight starts, prod goes down, a rival announces a launch, the release is ready, tech debt passes 40%, six issues are open, a quarter has 2 minutes left, no script is running. Actions: run one of the four scripts, refactor, ship, close issues, start a sprint. A rule fires once, at the moment its condition becomes true, and only if its action can run. |
| **Ship** | Stars come from every line shipped this run (since the last funding round or major version): floor(2·cbrt(lines shipped this run / 2M)), so 2 at 2M, 4 at 16M, 20 at 2B in total. A release needs 2M lines and pays what it adds to that total (times the project and brand bonuses), so one big release beats several small ones. The release panel shows stars per minute and marks a release ready to merge at +50% stars; stats keeps a `git log` of the last 10 releases. Shipping resets lines and packages. Each star earned adds 10% output, even after it is spent. From the second release you pick the next project (CLI tool, enterprise suite, game engine, startup MVP, operating system), each with its own rules. Releases are numbered v{major}.{minor}. |
| **Funding** | Enough stars raise the next round (Seed at 200, then Series A at 3.5K, B at 120K, C at 4M and the IPO at 70M): x3 output for good, equity for company perks (headcount, brand, runway, platform team, devrel), and a rewrite in the stack you pick. A round restarts stars, dotfiles, releases and the star curve. The IPO ends the campaign with a summary screen (time played, releases, stars, users, rank) and nothing resets. |
| **Stacks** | Each run (from one round or major version to the next) is written in one language, picked when you raise or cut a major, with its rules in view: TypeScript (no rules), Python (x1.4 per tap, packages 15% cheaper, debt 50% faster), Go (x1.75 automation, x0.75 per tap, debt 25% slower), Rust (+10% crits, debt half as fast, packages 25% dearer), Haskell after the first major (coverage counts double, +25% stars, x0.6 per tap) and COBOL after buying Legacy Systems Inc (x3 automation, users drift half as fast, x0.25 per tap). The first run is TypeScript. The editor writes the language, and the workspace takes its colour: TypeScript keeps the house green, Python is blue, Go teal, Rust orange, Haskell violet, and COBOL runs on a green screen with scanlines whatever theme is picked (settings → stack colours turns this off). |
| **Quarters** | After the IPO, every 20 minutes of play is a quarter (time away doesn't run the clock; its revenue comes in at the offline rate). Each user brings in $3 a quarter. The board's guidance is the last quarter (or the run rate, if higher) +15%, and 10% more for every beat in a row (up to +60%). A beat raises the stock and adds 5% to all output for good; a miss only costs the stock. The press covers every report. |
| **Acquisitions** | After the IPO, cash buys rivals (co/market): their price is their users × $30, ×2.2 for every rival bought before, divided by the stock price / 100. Half their users join yours, they leave the chart for good but still count as behind you, and each adds 25% to all output. Buying Legacy Systems Inc unlocks COBOL. |
| **The true ending** | The last rival can't just be bought: the purchase goes to an antitrust hearing, a five-stage boss fight that starts at once (mash the key, and pick the answer a lawyer would approve). Lose and the deal waits 5 minutes. Win and the chart is a list of one: the true ending, with its own summary screen. Nothing resets and the quarters carry on. |
| **Founding again** | After the true ending the quarter panel offers `./found-a-new-startup.sh`: sell up and start a new company from an empty editor with x2 output for good and one founder trait (the hacker: x2 per tap; the operator: x2 automation; the storyteller: +50% stars; the bootstrapper: packages 30% cheaper). Traits stack across companies. Kept: trophies and the stats behind them (so workflows earned by shipping, the test suite, the roadmap and RFCs are open from the start), adopted RFCs, the story already read, the streak and settings. The company left behind stays restorable from cfg as a backup. |
| **Team** | From 100K lines, applicants arrive with a trait (senior, 10x, tester, SRE…). Hire up to 3 (more with headcount) and give each a role: features, sprints, on-call, bug duty or refactoring. They type alongside you in the editor. |
| **Mail** | Story mail from the team, from the first day to the IPO, the quarters and the last acquisition, and choices with trade-offs, plus `man` pages that unlock as you discover systems. |
| **Boss incidents** | From 1M lines: a Friday deploy, a DDoS, a security audit or a migration takes over the editor in timed stages (mash the key or pick the right line). Winning pays big; losing adds tech debt. A fifth, the antitrust hearing, only comes with the last acquisition. |
| **dotfiles** | 11 perks in `editor/`, `team/` and `system/`, bought with stars. `.zshrc` has no cap (x1.1 all output per level, each level twice the price). |
| **Workflows** | Automation, each switchable in ship/auto. Earned by shipping: `deps.yml` and `dev-deps.yml` install packages (after 2 and 4 releases), `scripts.yml` runs scripts (6), `release.yml` ships as the project you last picked once a release would grow stars by +50/75/100/200% (15). Earned by clearing each challenge release once: `forks.yml` picks package upgrades by your policy (Legacy codebase), `standup.yml` starts the biggest sprint you can finish (Solo dev), `dotfiles.yml` buys the cheapest dotfile (Clean install), `pager.yml` fixes outages and merge conflicts (Broken keyboard), `triage.yml` closes user issues as they come in (CI is down). Bugs and coffee are left to the team. |
| **Major versions** | From the Series B round, alongside funding: cutting one banks your stars (and the release in progress) for XP, floor(cbrt(stars banked in total / 200K)). Each XP earned adds 50% to stars from shipping, even after it is spent. Stars, dotfiles, releases and packages reset; funding, equity, XP, skills, the team, workflows, challenge rewards and users stay. Each major is a rewrite in the stack you pick. It's the reset that never runs out, which carries runs past the walls before and after the IPO. |
| **Skills** | Bought with XP in `~/resume.md` and kept forever: 10x engineering (x2 all output per level, no cap), pair programming (+25% stars from shipping), head start (start each major with stars), muscle memory (keep dotfiles across majors), shell scripting (+1 rule in `~/bin/rules` per level). |
| **Challenge releases** | After the first major: restart a release under a restriction (Legacy codebase, CI is down, Broken keyboard, Solo dev, Clean install) and ship it with about twice the lines shipped so far this run for a permanent reward and a workflow. Each can be cleared five times: every clear asks a little more and adds a quarter of the first reward again (twice the first reward at five), and the fastest clear is kept. |
| **Market** | After the first ship. Every release is reviewed (1–5★: bigger releases, sprints merged, bugs squashed, test coverage and feature requests closed score better; escaped bugs and tiny patches worse) and brings users by its size and review. Users start drifting to rivals after 45 quiet minutes without an update (1% a minute, up to half per quiet spell); time away counts at 17.5% and on its own costs at most a quarter. A 4★+ release wins back half. 15 fictional rival companies fill the chart, each rival behind you adds 5% output, and passing one for the first time drops scripts. Rivals announce launches: ship first for x1.5 new users, or they grow. A press feed covers releases, rounds, majors and rivals, and you can name your app. The panel charts your users over time, on a log scale, against the rivals either side of you; after the IPO the quarter panel charts the stock and a ticker tape runs along the top of the screen. |
| **Career** | A title by stars earned over the whole game, from intern to cto. |
| **Achievements** | 117, each worth +1% output, including a few secrets. more/trophies lists the unearned ones closest to done first, with progress bars. |
| **Commit streak** | Play on consecutive days for a daily bonus (scripts every 3rd and 7th day). more/stats shows a heatmap of the days you played. |
| **Time away** | 25% of automation for up to 7 hours (raised by `crontab` and runway), shown on a welcome-back screen after two minutes or more away. |
| **Pull requests** | After half an hour or more away (once the app has shipped), contributors have opened three pull requests and you merge one, on the welcome-back screen or in co/mail: a pile of lines, scripts, tech debt paid off, more users or a few stars. Longer absences (2h, 6h) bring better ones, and now and then a stranger's rewrite of the core that adds 2% to all output for good (up to 50%). Merging one closes the rest. |

The screen, top to bottom: the readout (lines, per tap, per second; a company line with users, chart rank and round after the first funding round), a goal line (progress to the next star with a time estimate, whether the release is ready to merge, and the next round or major version), the editor, a one-line event strip (achievements, new panels, mail, and whatever is running against the clock: a boss, an outage, coffee, a rival's launch, a sprint), the key (showing what a tap writes), four script slots, the tool pane and the tmux bar.

The tmux bar has five windows, each with sub-tabs: **pkgs** (pkgs, infra, features); **work** (backlog, todo, tests, rfcs); **ship** (release, dotfiles, auto, major, round, which becomes the quarter in progress after the IPO); **co** (team, mail, issues, market); **more** (man, trophies, stats, cfg). Badges say why a window wants you: a count of things waiting (a coral box), something worth doing now (✓), progress or a timer, or "new". New players see only pkgs and more at first; the rest appear as they progress. Panels keep their rules behind a `?` (`man ship` in the release panel). In the editor, `office.png` is a pixel-art view of the company (see below), `top` shows where output comes from, `team` a desk per developer, `ci` the build log once the pipeline is installed, and `+N` counts the package files installed. Each of those strips opens and closes with its tab; on a phone only one is open at a time, so the code keeps its room, and the choice is remembered on the device. The rubber duck gives advice when tapped, and a screensaver takes over after a minute idle (settings can turn it off).

Pacing comes from two bots that play the real rules at 4 taps a second (`tests/sim.ts`). The official bot taps, buys the best-value package, runs the sprints it can finish, squashes bugs, grabs incidents, ships at +75% stars, raises rounds as they open and cuts majors at +50% XP, and leaves everything else alone (`npm run simulate` prints its run): the first ship lands around 7 minutes, then every 10–35 minutes; the test suite opens around half an hour in, Seed around 2 hours 10, Series B and the first major around 3 hours 20, the IPO around 4 hours 45, then a major every 10 minutes to an hour and about two quarters beaten in three. After two hours the last tiers are still ahead. The engaged bot plays everything as well: package upgrades, the team, boss incidents, mail, refactors, projects, stacks, a 10% test budget, issues, challenges and acquisitions, and it points the roadmap at developers, keeps an RFC under discussion and deploys the best board for the slots it has. It ships first at 4½ minutes, opens the roadmap around 26 minutes and RFCs around 35, raises Seed (and gets the board) just under an hour in and goes public at about an hour and a half, never waiting much more than 10 minutes for something new on the way; it then buys the rivals over the next two hours and takes the last one, past the hearing, at around three and a half. `tests/pacing-engaged.test.ts` holds it to those bounds, and `tests/pacing-balance.test.ts` checks that no project, no stack and no roadmap segment gets an engaged player through the game more than a quarter faster than the median. Waiting for a real jump pays: shipping on a 5-minute timer or at every star earns less than half the stars of the patient bot, and `tests/pacing.test.ts` checks it.

### How it looks

The game is a terminal workspace, and `src/styles/main.css` opens with its visual language. Three things sit on top of the flat panes:

- **Stack colours.** The chrome (session tag, active tabs, prompts, the mode chip) uses `--accent`, which is the house green in TypeScript and the stack's colour in every other language; on the dark theme the ground is tinted to match. `html[data-stack]` carries it.
- **Light and depth.** The ground is vignetted, panes have a lit top edge and a soft drop shadow, and the cursor, the key and full bars glow. The room has a mood (`html[data-mood]`, set every tick in `src/ui/app.ts`): warm in flow, golden on coffee, pulsing red in an outage or a boss fight. Scanlines are a setting.
- **office.png.** `src/ui/office.ts` draws the company on a small canvas a few times a second, in whole pixels scaled up by the stylesheet. The room grows with the rounds (a garage, a co-working space at Seed, an office floor from Series A, a tower from Series C, a ticker along the ceiling after the IPO); the team sit at their desks doing what their roles say; the sky in the windows follows the real time of day and the lights come on at night; a gold star goes on the wall for every round and a frame for every company sold. What happens in the game shows there too: coffee steams, the racks blink red in an outage, a bug crawls across the floor, confetti falls on a release.

Charts (`src/ui/charts.ts`) are inline SVG: users over time, the stock by quarter and the ticker tape.

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
    coverage.ts      The test suite: the test budget, coverage, and writing code through it.
    issues.ts        User issues: filing them over time and closing them.
    stacks.ts        The language of each run: which are open, picking one at a reset.
    corp.ts          After the IPO: quarters, guidance, the stock, cash and acquisitions (the last one past a hearing).
    infra.ts         The architecture board: slots, links, patterns, the draft and its deploy.
    roadmap.ts       Who the app is for: segments, their shares and the headline feature.
    rfcs.ts          RFCs: research on a real clock, adopted for good.
    pulls.ts         Pull requests from contributors after time away.
    rules.ts         ~/bin/rules: the conditions, and adding, changing and removing rules.
    founder.ts       The true ending and founding the next company.
    debt.ts          Tech debt and refactoring.
    team.ts          Applicants, hiring and roles.
    bosses.ts        Boss incidents.
    funding.ts       Funding rounds, equity and company perks.
    major.ts         Major versions, XP, skills and challenge releases.
    mods.ts          Rule changes from major versions (challenges, skills, XP), the stack, the board, the roadmap, RFCs and
                     the founder, combined in one place (and memoised: it is asked for on every calculation).
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
  ui/          Everything on screen: editor, code generator, key, bug, incidents, boss fights, the header
               and goal line, the event strip (events.ts), script slots (scripts.ts), the windows,
               sub-tabs and badges (nav.ts), panels (one file each, `?` texts in panels/help.ts),
               effects (fx.ts), the top/ci panes, desks and duck (workspace.ts), the pixel-art office
               (office.ts), charts (charts.ts), screensaver, merge, round, ending and welcome splashes, sounds.
  assets/      keyboard.wav: the key sounds, cut from a recording of a real mechanical keyboard
               (presses, their releases, heavy presses for crits, runs of keys for rewards).
  styles/      The visual language, the four themes, stack colours and room moods (main.css).
public/        Icons, web app manifest, service worker.
scripts/       keyboard-sprite.py: re-cuts keyboard.wav and its clip list from the recording.
tests/         Vitest unit tests for core/, plus the pacing simulator (sim.ts): an official bot and an engaged one.
```

Flow: the UI calls methods on `Game` (`tap`, `buy`, `chooseFork`, `refactor`, `hire`, `raise`, `answerMail`, `bossPick`, `ship`, …) and `tick()` every 200 ms. The game mutates its state and emits events, which the UI turns into log lines in the editor, sounds, splashes and panel updates.

### Rules of thumb

- Game logic goes in `core/` and never touches `document` or `window`. Time comes from the injected clock, randomness from the injected `rng`, so tests and the simulator are deterministic.
- All quantities are `Decimal`s (via `core/num.ts`) so numbers can pass 1e308.
- After changing anything in `content.ts`, run `npm run simulate` to see the effect on pacing. `tests/pacing.test.ts` fails if the first ship gets too fast or too slow.
- Device features go through `platform/`. To ship natively, add a `capacitor.ts` implementing `Platform` (Preferences for storage, the Haptics plugin, app state events) and return it from `getPlatform()`.
- Saves: browser storage alone is not trusted (some embedded views drop it). As a Claude artifact the game also keeps a copy in the player's private artifact database (the artifact must declare `capabilities: { db: {}, user: {} }`); elsewhere it saves on the device only, and settings says which. The cloud copy is always read, as the store confirms it (never a cached copy, which can be empty right after an update), before it is written; however long that takes (where live updates aren't available the store answers with its periodic refresh, about 30 s), the game keeps waiting instead of giving up on the account for the session. The cloud is then followed live, because the game open in another tab or device writes the same document: a copy that saves more progress, or replaces the save on purpose, wins, and the others switch to it instead of writing over it. An import or restore waits for the account and only reloads once the save is kept somewhere. The game starts from the save with the most progress, not the newest, so a new game started while the real save was out of reach can't replace it; only a deliberate reset, import or restore can, and saves from before it stop counting on every device. A save with more progress is never replaced without leaving a backup that settings can restore, and a save from a newer version is never written over.
- Changing the shape of the save: bump `SAVE_VERSION` in `core/save.ts` and add a migration from the previous version. Old saves are upgraded on load; unreadable saves fall back to a new game instead of crashing.
