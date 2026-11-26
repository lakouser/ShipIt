# Ship It v0.4.2: current gameplay systems, economy and pacing (codebase audit)

Scope and method. Everything below describes the checkout at `/home/user/ShipIt` (branch `claude/gracious-bohr-7v5qzj`, `package.json` version 0.4.2; no remote branch is ahead of it). Sources are the repo, the earlier prestige report and notes, and the user's "Incremental Bible" doc. Nothing in the repo was changed. I did not launch the UI or compare against the live artifact.

Simulation sources used throughout (all deterministic, seed 7, 4 taps/s unless stated, continuous play with no time away):

- **SIM-OFFICIAL**: the repo's own bot, `SIM_MINUTES=720 vitest run tests/pacing.test.ts --silent=false` ([tests/sim.ts](/home/user/ShipIt/tests/sim.ts), [tests/pacing.test.ts](/home/user/ShipIt/tests/pacing.test.ts)). My instrumented copy of that bot reproduces its raise and major times to the hundredth of a minute. Raw output: `/tmp/claude-0/-home-user-ShipIt/a1f094cc-986a-5e46-a892-ae0f59437254/scratchpad/sim720_verbose.log` and `/tmp/claude-0/-home-user-ShipIt/a1f094cc-986a-5e46-a892-ae0f59437254/scratchpad/audit/out_official_720.json`.
- **SIM-VARIANTS**: the same bot with one behaviour changed at a time (script: `/tmp/claude-0/-home-user-ShipIt/a1f094cc-986a-5e46-a892-ae0f59437254/scratchpad/audit/audit.test.ts`, outputs `out_*.json` in the same folder). The scratchpad is session-specific and may be cleared, so every number I rely on is copied into these notes.
- The official bot taps steadily, buys best value, squashes 80% of bugs, takes coffee and conflicts, runs scripts at once, starts "relaxed" sprints, ships at +75% stars, buys the cheapest perk, raises rounds as they open and cuts a major at +50% XP. It **never** picks a fork, hires, fights a boss, answers mail, refactors, changes project or starts a challenge ([tests/sim.ts:80-123](/home/user/ShipIt/tests/sim.ts#L80); final stats of SIM-OFFICIAL: `forksChosen 0, hires 0, bossesBeaten 0, mailAnswered 0, refactors 0, projectsShipped ["webapp"], challengesDone []`).

Test results: `npm test` passed (11 files, 124 tests, 58.6 s). `npm run simulate` (240 min) and `SIM_MINUTES=720 npm run simulate` passed their 3 tests each. With output redirected, neither printed the report the README promises; adding `--silent=false` to the vitest call printed it.

---

## 1. What systems exist, when does each unlock, and how do they interact?

### Takeaway
The game has about 20 interlocking systems, and all of them except funding, major versions, skills and challenges are on screen within the first ten minutes of play. Three nested resets exist (ship → funding round → major version); the market, team, quest bonuses, achievements, workflows, equity, XP and skills sit outside all resets.

### Cited Findings

**System inventory, with unlock condition and the minute the official bot reaches it (SIM-OFFICIAL)**

| System | What it is (numbers) | Unlock condition | Bot minute |
|---|---|---|---|
| Tapping, flow, crits | 1 line per tap base; flow +0.06 per tap, drains 0.5/s after 0.4 s idle, x2 at full (up to x3 with `flow.conf`); crit x5 | Start | 0 |
| Packages (pkgs) | 22: 10 typing, 12 automation; price x1.15 per copy; 16 at start, 4 more at Seed, 2 more at Series A | Start; next tier shows once the previous is owned or 40% of its price is written | 0 |
| Scripts (~/bin) | 4 timed boosts (turbo x2 tap 60 s, nightly x2 auto 120 s, autotype 4 taps/s 45 s, sudo +15% crit 45 s); player starts with 1 turbo.sh | Start | 0 |
| Bugs | Every 28–50 s, on screen 9.4 s; pays 15 s of automation + 10 taps; an escape adds 4 debt | 15 s after load | 0.25 |
| Sprints | 3 tickets (20/40/75 s; cooldowns 60/150/420 s; reward 1.6/2.2/3 x target; script chance 25/50/100%) | 750 lifetime lines | 0.12 |
| TODO.md | 3 tasks from 10 templates; reward +2% tap or auto, +5% bug or sprint (permanent, uncapped), or a script (15%); refill 45 s | 2,000 lifetime lines | 0.22 |
| Mail and man pages | 9 story mails, 10 choice mails (2 options each), 9 man pages | 5,000 lifetime lines; first choice mail 2 min later, then every 5–9 min, max 3 waiting | 0.38 |
| Incidents | Every 70–150 s: coffee 45% (x3 everything 20 s), outage 30% (30 taps in 10 s, pays 60 s of output), merge conflict 25% (pick 1 of 2, pays 30 s) | 500 lifetime lines | 1.5 |
| Tech debt | +3/min, +3/min per running timed effect; free to 10, then automation loses up to 50% at 100; refactor costs 1 s of automation per point | 25,000 lifetime lines | first over 10 at 20.8 |
| Team | Applicant every 240 s after a hire or pass; 7 traits, 5 roles, 3 seats (+3 with headcount); hire costs 90 s of output, +50% per dev already hired | 100,000 lifetime lines | 1.74 |
| Forks | Every 25 copies of a package: pick 1 of 2 (major rewrite x2; plugin x1.4 and +8% to all of its kind; LTS x1.5 and half price) | 25 copies of one package | about 0.7 (first 25-stack) |
| Ship (prestige 1) | Stars = floor(2·cbrt(lines shipped this run / 2M)); min 2M lines; +10% output per star, spent or not; resets lines, packages, forks, debt, sprints | Tab at 200K lines this release | tab 2.54, first ship 7.4 |
| Market | Review 1–5 per release, users, 15 rivals, +5% output per rival behind, churn after 45 quiet minutes, rival launches | First ship | 7.41; first rival launch 17.4 |
| Projects | 6 release types with rule changes | Release 2: cli, enterprise; release 3: game, startup; release 4: os | 7.4 / 19.1 / 34.3 |
| Boss incidents | 4 bosses, 3–4 timed stages (mash 25–45 taps or pick 1 of 3); win pays 240 s of output, 2 scripts, −20 debt; a failed stage +10 debt; ignoring is free | 1M lifetime lines, then 4 min; every 7–12 min | 9.43 |
| dotfiles | 11 perks bought with stars; 10 capped (419 stars in total), `.zshrc` uncapped (x1.1, cost 10·2^n) | First star | 7.4 |
| Workflows | deps.yml (2 ships), dev-deps.yml (4), scripts.yml (6), release.yml (15; ships at +50/75/100/200%) | Total releases shipped | 19.1 / 56.5 / 117 / 200.9 |
| Funding (prestige 2) | 5 rounds at 150 / 2K / 60K / 1.5M / 20M stars; x3 output each; equity for 5 company perks; resets stars, dotfiles, releases | 150 stars | 176 / 225 / 257 / 304 / 350 |
| Major versions (prestige 3) | XP = floor(cbrt(stars banked / 200K)); +50% stars per XP; 4 skills | Tab at Series A, usable at Series B | tab 224.6, first major 271.2 |
| Challenge releases | 5 one-time restricted releases with permanent rewards | First major, and 2B lines shipped this run | not used by the bot |
| Career, achievements, streak | 9 titles; 93 achievements (+1% output each); daily bonus of 600 s of automation | Start | — |

Sources: [content.ts:23-46](/home/user/ShipIt/src/core/content.ts#L23) (packages), [content.ts:59-68](/home/user/ShipIt/src/core/content.ts#L59) (flow, crit), [content.ts:87-94](/home/user/ShipIt/src/core/content.ts#L87) (scripts), [content.ts:114-126](/home/user/ShipIt/src/core/content.ts#L114) (dotfiles), [content.ts:158-162](/home/user/ShipIt/src/core/content.ts#L158) (sprints), [content.ts:175-199](/home/user/ShipIt/src/core/content.ts#L175) (bugs, incidents), [content.ts:203-252](/home/user/ShipIt/src/core/content.ts#L203) (ship, milestone, offline, quests, streak), [content.ts:269-276](/home/user/ShipIt/src/core/content.ts#L269) (forks), [content.ts:280-300](/home/user/ShipIt/src/core/content.ts#L280) (debt), [content.ts:327-334](/home/user/ShipIt/src/core/content.ts#L327) (projects), [content.ts:340-391](/home/user/ShipIt/src/core/content.ts#L340) (team), [content.ts:406-454](/home/user/ShipIt/src/core/content.ts#L406) (bosses), [content.ts:458-496](/home/user/ShipIt/src/core/content.ts#L458) (funding, company perks), [content.ts:500-519](/home/user/ShipIt/src/core/content.ts#L500) (mail, unlocks), [content.ts:535-548](/home/user/ShipIt/src/core/content.ts#L535) (workflows), [content.ts:552-562](/home/user/ShipIt/src/core/content.ts#L552) (career), [content.ts:566-645](/home/user/ShipIt/src/core/content.ts#L566) (majors, skills, challenges), [content.ts:649-704](/home/user/ShipIt/src/core/content.ts#L649) (market, rivals), [game.ts:559-573](/home/user/ShipIt/src/core/game.ts#L559) (tab unlock checks), [state.ts newGame](/home/user/ShipIt/src/core/state.ts) (starts with `scripts: { turbo: 1 }`). Bot minutes: SIM-OFFICIAL `firsts`, `raises`, `majors`.

**How output is built**
- Everything written is multiplied by: stars (1 + 0.1·stars), `.zshrc` (1.1^level), the 10x skill and challenge rewards (`mods.allMul`), chart rank (1 + 0.05 per rival behind), achievements (1 + 0.01 each), funding (3^round) and coffee. — [economy.ts:123-131](/home/user/ShipIt/src/core/economy.ts#L123)
- Taps add `.vimrc`, challenge tap reward, TODO tap bonus, plugin forks, project and turbo; automation adds `team.yml`, TODO auto bonus, plugin forks, developers on features, project, nightly, then the debt penalty. — [economy.ts:133-155](/home/user/ShipIt/src/core/economy.ts#L133)
- "Typical output" (automation plus 4 assumed taps a second) is the yardstick for sprint targets, incident and boss rewards, hire cost and mail effects, so all of them scale with the player's current output. — [economy.ts:266-268](/home/user/ShipIt/src/core/economy.ts#L266), [sprints.ts:34](/home/user/ShipIt/src/core/sprints.ts#L34), [incidents.ts:46-48](/home/user/ShipIt/src/core/incidents.ts#L46), [bosses.ts:36-38](/home/user/ShipIt/src/core/bosses.ts#L36), [team.ts:24-28](/home/user/ShipIt/src/core/team.ts#L24), [mail.ts:306](/home/user/ShipIt/src/core/mail.ts#L306)

**The three resets and what each keeps**
- Ship: clears lines, this-release lines, debt, forks, packages (except `bootstrap.sh` copies), the active sprint and backlog; makes a new milestone. Stars, dotfiles, team, quest bonuses, scripts and running effects stay. — [ship.ts:144-158](/home/user/ShipIt/src/core/ship.ts#L144)
- Funding round: also zeroes stars, stars spent, dotfiles, the release counter, the project (back to web app) and the star curve (`shipped`); grants equity floor(2·log10(stars) − 1) and +1 round. — [funding.ts:14](/home/user/ShipIt/src/core/funding.ts#L14), [funding.ts:26-41](/home/user/ShipIt/src/core/funding.ts#L26)
- Major version: banks stars held plus the release in progress, grants XP, sets stars to 25 per head-start level, clears dotfiles unless muscle memory is owned, restarts the release counter, project and star curve. Funding, equity, XP, skills, achievements, workflows, challenge rewards, team and users stay. — [major.ts:53-74](/home/user/ShipIt/src/core/major.ts#L53)
- The market "never resets with a release or a major version". — [market.ts:7-11](/home/user/ShipIt/src/core/market.ts#L7)

**Cross-system links that already exist**
- Debt ties together timed effects (+3/min each), escaped bugs (+4), squashed bugs (−1), merged sprints (−2), bosses (+10 / −20), 10x developers (+1/min), refactoring developers (−1.5/min each), the platform-team company perk (−20% per level), projects (startup x3, OS x2) and seven mail options. — [debt.ts:20-29](/home/user/ShipIt/src/core/debt.ts#L20), [content.ts:280-300](/home/user/ShipIt/src/core/content.ts#L280), [mail.ts:128-299](/home/user/ShipIt/src/core/mail.ts#L128)
- A release's review is 2.5 + up to 1.5 for size (a release that doubles stars gets it all) ± up to 1 for polish (0.3 per sprint to 0.9, 0.1 per bug to 0.5, 0.25 per incident to 0.5, −0.2 per escaped bug to −1). New users = 10·cbrt(lines)·(review/3)². — [market.ts:31-40](/home/user/ShipIt/src/core/market.ts#L31), [market.ts:47-48](/home/user/ShipIt/src/core/market.ts#L47)
- The release milestone (beat the run's last release by 1.5x in lines, 30 + 10 per release packages, 2–6 sprints) adds 25% to that ship's stars. — [quests.ts:180-196](/home/user/ShipIt/src/core/quests.ts#L180)
- Team roles feed four other systems: features (+10% automation), sprints (+20% sprint reward), on-call (−15% taps on outages and boss mash stages, cap 60%), bug duty (auto-squash 20%, +15% reward), refactoring (−1.5 debt/min). — [content.ts:340-346](/home/user/ShipIt/src/core/content.ts#L340), [content.ts:374-391](/home/user/ShipIt/src/core/content.ts#L374)
- Passing a rival for the first time drops 2 scripts; shipping inside a rival's 5-minute launch warning gives x1.5 new users, otherwise the rival gains 5%. — [market.ts:178-211](/home/user/ShipIt/src/core/market.ts#L178), [content.ts:670-672](/home/user/ShipIt/src/core/content.ts#L670)

### Inferences
- (Judgment) The design is wide rather than deep: many small systems each give a multiplier or a lump of "seconds of typical output". Only projects, challenges, debt and the ship-timing rule change how the player plays; the rest change how much they earn.
- (Judgment) Because nearly every reward is expressed in seconds of current output, no active system ever becomes obsolete, and none ever becomes more interesting either: a sprint at hour 10 is the same decision as at minute 2.

### Gaps
- I did not run the app, so the order in which a human notices each system (as opposed to when its condition is met) is not observed.
- The bot minutes are for one seed and a bot that ignores six systems; see section 2 for how much that matters.

---

## 2. What does the progression timeline look like, and where are the stretches with nothing new?

### Takeaway
With the repo's bot, the first ship lands at 7.4 minutes, Seed at about 2 h 56 min, the first major at 4 h 31 min and the IPO at 5 h 50 min, matching the README. But that bot skips forks, projects, the team, bosses, mail and challenges and starts only half the sprints available; bots that use those systems reach the IPO in 1.7 to 4.6 hours. In every version, all tabs but one open in the first 8 minutes, the first run (before Seed) is the longest stretch with no new mechanic, and nothing new unlocks after the first major.

### Cited Findings

**Official bot timeline (SIM-OFFICIAL, 4 taps/s)**

| Phase | Minutes | Releases | Release length | What is new in the phase | What the player does |
|---|---|---|---|---|---|
| Onboarding | 0–7.4 | 1 | 7.4 min | Sprints, TODO, mail, incidents, team tab, ship tab, forks | Tap, buy the first 6–7 packages, run sprints, squash bugs |
| Bootstrapped | 7.4–176 | 7 more (8 in all) | 11.7, 15.3, 22.2, 28.9, 31.5, 33.2, 26.1 min | Market, projects (by 34 min), bosses (9.4 min), deps.yml (19), dev-deps.yml (56.5), scripts.yml (117); package tiers pair 40, macro 52.5, gen 78.7, llm 95.6, k8s 132, neural 141.6, agents 172 | Same loop; one ship every 12–33 min; spend 1–143 stars on dotfiles |
| Seed | 176–225 | 12 | 1.3–6 min (median 4.5) | Company perks, release.yml (200.9), 3 of the 4 Seed packages (208–223 min), all 10 capped dotfiles maxed (214.9), `.zshrc` | Re-climb in minutes; from 201 min the game ships itself |
| Series A | 225–257 | 18 (17 auto) | 0.2–7.2 min (median 1.3) | Major tab (teaser), the last 3 packages (hivemind 238.5, simverse 241, entropy 242.9) | Mostly watching |
| Series B | 257–304 | 61 across 3 runs | median 6–16 s | Major versions (first at 271.2), skills, challenges | Cut majors by hand; buy skills |
| Series C | 304–350 | 65 across 3 runs | median 4–7 s | Nothing | Same |
| IPO and after | 350–720 | 215 | median 4–5 s; the last 1–3 of each major take 8–47 min | Nothing | A major every 21–80 min |

Source: SIM-OFFICIAL (`releases`, `firsts`, `raises`, `majors`); README pacing line at [README.md:55](/home/user/ShipIt/README.md#L55).

- Stars before Seed go 2, 4, 9, 18, 36, 70, 137, 266: each release roughly doubles the total, as the +75% ship rule and the cube-root curve imply. — SIM-OFFICIAL `releases`; [ship.ts:17-22](/home/user/ShipIt/src/core/ship.ts#L17)
- From Series B on, the whole 22-package ladder is re-bought within about 10 seconds of a reset (time from release start to owning the top automation package: 0.16–0.17 min in every later run). — SIM-OFFICIAL `releases[].ladderMin`
- Longest waits between "new things" (a tab, package tier, workflow, round or first major) in the official run: 45.9 min before the IPO, 33.2 min before Series C, 30.4 min (neural → agents), 24.6 min (Seed → release.yml), 22.2 min (dev-deps → gen), 21.4 min (llm → scripts.yml). — computed from SIM-OFFICIAL `firsts`
- After the third ship at 34 min (the OS project) until Seed at 176 min, the only new items are 7 package tiers and 2 workflows: about 140 minutes with no new mechanic. — SIM-OFFICIAL `firsts`; [content.ts:327-334](/home/user/ShipIt/src/core/content.ts#L327)

**How much the bot's blind spots change the timeline (SIM-VARIANTS, 4 taps/s unless stated)**

| Variant (one change from the official bot) | First ship | Seed | First major | IPO |
|---|---|---|---|---|
| Official bot | 7.4 | 176 | 271 | 350 |
| Starts every sprint that is off cooldown and "relaxed" | 6.6 | 113 | 171 | 221 |
| Never starts a sprint | 9.1 | not reached in 300 min (72 stars at 282) | — | — |
| Always picks the "major rewrite" fork | 6.7 | 115 | 184 | 212 |
| Always picks the other fork (plugin / LTS) | 5.3 | 98 | 146 | 170 |
| Always ships as Startup MVP when offered | 7.4 | 85 | 140 | 204 |
| Always ships as CLI tool when offered | 7.4 | 44 | 76 | 173 |
| Always ships as Enterprise suite when offered | 7.4 | 152 | 239 | 278 |
| 1 tap per second | 17.5 | 550 | 703 | not reached in 720 min |
| "Engaged": all sprints, forks, startup project, hires, bosses, mail, refactors, challenges | 3.9 | 43 | 67 | 102 |

Source: SIM-VARIANTS outputs `out_base_720.json`, `out_nosprints_300.json`, `out_forkmajor_300.json`, `out_forkalt_300.json`, `out_startup_300.json`, `out_cli_300.json`, `out_enterprise_300.json`, `out_slow1_720.json`, `out_engaged_720.json`.

- The official bot picks the first backlog slot that reads "relaxed" without checking its cooldown ([tests/sim.ts:91-94](/home/user/ShipIt/tests/sim.ts#L91)), and the game refuses a ticket that is still cooling down ([sprints.ts:78-84](/home/user/ShipIt/src/core/sprints.ts#L78)). It merged 946 sprints in 720 min; the variant that skips cooling slots merged 1,874 and reached every milestone about 37% sooner.
- In the engaged run the bot reached #1 in the chart at 159 min, finished all 5 challenges by about 96 min, cut 48 majors in 12 hours, and held 82 of 93 achievements from minute 234 on. — `out_engaged_720.json`
- `tests/pacing.test.ts` asserts the first major lands between 180 and 480 minutes for the official bot ([tests/pacing.test.ts:37-46](/home/user/ShipIt/tests/pacing.test.ts#L37)); the all-sprints variant lands it at 171.

### Inferences
- (Judgment) The README pacing figures describe a floor, not typical play. A player who uses sprints fully and picks forks is likely 1.5–2x faster than the README says; one who also picks the CLI or Startup project is faster still. The pacing tests do not see any of this because the bot does not use those systems.
- (Judgment) The reveal schedule is front-loaded then empty: 8 of 9 tabs by minute 7.4, then one new mechanic at Seed (company perks), one at Series B (majors, skills, challenges), and none after. Between 34 min and Seed, and after the first major, the only novelty is a bigger package or number.
- (Judgment) From Seed onward release lengths collapse to seconds and release.yml ships them, so "ship a release", the game's central verb, stops being a player action about 3.5 hours in (official bot) or 50 minutes in (engaged bot).

### Gaps
- One seed, no human data, no time away in any run. The earlier report made the same caveat.
- I did not measure a mixed player (for example forks picked for the first two hours only), which is probably closest to a real person.
- The CLI-project result (Seed at 44 min) assumes 4 taps a second sustained with no automation; I did not test lower tap rates on that project.

---

## 3. Which systems are shallow or one-dimensional?

### Takeaway
Most content is linear: packages, dotfiles, company perks, skills, rounds, titles and achievements are bought or reached in a fixed order with no exclusion, and every pool is exhausted by about the IPO. The real decisions are which project to ship, when to ship or cut a major, which fork to take, and how to staff five roles. Of those, forks are a real choice per pick but arrive by the thousand with no automation.

### Cited Findings

| System | Count | Decision or linear purchase? | Evidence |
|---|---|---|---|
| Packages | 22 (10 tap, 12 auto); each tier costs 16–30x the last for 5–6x the output | Linear. No package has a special effect; deps.yml and dev-deps.yml buy "best value first" from 2 and 4 releases | [content.ts:23-46](/home/user/ShipIt/src/core/content.ts#L23), [workflows.ts:25-47](/home/user/ShipIt/src/core/workflows.ts#L25) |
| Forks | 3 kinds, 2 offered per pick (even picks: major or plugin; odd picks: major or LTS) | A real choice: always-major reached the IPO at 212 min, always-the-other at 170 min. But the engaged bot made 213,851 picks in 12 h and no workflow makes them | [content.ts:269-276](/home/user/ShipIt/src/core/content.ts#L269); SIM-VARIANTS; [upgrades.ts:60-71](/home/user/ShipIt/src/ui/panels/upgrades.ts#L60) (one picker per package) |
| dotfiles | 11 perks, 3 branches; 10 capped at 419 stars in total; `.zshrc` uncapped | Order only. All 10 capped perks are owned at 215 min in the Seed run, 11 min after Series A, and within 0.2–1.7 min of every later reset | [content.ts:114-126](/home/user/ShipIt/src/core/content.ts#L114); SIM-OFFICIAL `firsts` |
| Company perks | 5 perks, 37 equity to max all | None by the IPO: the five rounds grant at least 3+5+8+11+13 = 40 equity. All maxed the second the IPO is raised (350.3 min) | [content.ts:488-494](/home/user/ShipIt/src/core/content.ts#L488), [funding.ts:14](/home/user/ShipIt/src/core/funding.ts#L14); SIM-OFFICIAL |
| Skills | 4: 10x (uncapped, x2 per level, cost 2^n), pairing 4, head start 4, muscle memory 1; 23 XP buys every capped level | Order only. All capped levels owned at 41 XP (v9.0, 533 min); after that every XP goes to 10x | [content.ts:606-611](/home/user/ShipIt/src/core/content.ts#L606); SIM-OFFICIAL |
| Challenges | 5, each one-time | Decisions while they last; the engaged bot cleared 4 in 26 min and the fifth in the next major. No repeat, no record, no scaling | [content.ts:632-645](/home/user/ShipIt/src/core/content.ts#L632), [major.ts:123-128](/home/user/ShipIt/src/core/major.ts#L123) |
| Projects | 6 (web app plus 5 with rules) | A real choice, re-made every ship. release.yml re-ships "the same project", and each new run starts as web app | [content.ts:327-334](/home/user/ShipIt/src/core/content.ts#L327), [game.ts:437-441](/home/user/ShipIt/src/core/game.ts#L437) |
| Team | 7 traits, 5 roles, 3–6 seats, 26 names, 8 faces | Some choice: 4 traits are x2.5 in one role, 3 are flat. No levels, no pay, no events; applicant trait is uniform random | [content.ts:340-391](/home/user/ShipIt/src/core/content.ts#L340), [team.ts:10-14](/home/user/ShipIt/src/core/team.ts#L10) |
| Bosses | 4 kinds, 13 stages in all, two stage types (mash 25–45 taps in 10–14 s; pick 1 of 3 in 14 s) | Execution, not decision. Engaging is optional and free to skip; difficulty never rises | [content.ts:406-454](/home/user/ShipIt/src/core/content.ts#L406), [bosses.ts:51-69](/home/user/ShipIt/src/core/bosses.ts#L51) |
| Incidents | 3 kinds | Reaction only | [content.ts:189-199](/home/user/ShipIt/src/core/content.ts#L189) |
| Sprints | 3 tiers, 12 ticket titles | One choice: start now or not. Only one sprint can run at a time; missing a deadline costs nothing | [content.ts:158-171](/home/user/ShipIt/src/core/content.ts#L158), [sprints.ts:78-84](/home/user/ShipIt/src/core/sprints.ts#L78) |
| TODO tasks | 10 templates | None; tasks complete through normal play (441 done in 12 h) | [quests.ts:41-116](/home/user/ShipIt/src/core/quests.ts#L41); SIM-OFFICIAL |
| Choice mail | 10 mails, 2 options each, repeating at random | Small trade-offs (lines now vs debt, a script vs a permanent +2–3%). Effects are 20–60 s of output or 5–20 debt | [mail.ts:128-299](/home/user/ShipIt/src/core/mail.ts#L128) |
| Story mail, man pages | 9 and 9 | Lore. The last story mail needs Series A at most; the last man page unlocks at Series A | [mail.ts:35-125](/home/user/ShipIt/src/core/mail.ts#L35), [man.ts:14-119](/home/user/ShipIt/src/core/man.ts#L14) |
| Rivals | 15 fictional companies, 5K to 1e15 users, growing 25–100% of base per real day | Scenery plus one timing choice (ship inside a launch window). Rivals have no behaviour beyond growth and launches | [content.ts:688-704](/home/user/ShipIt/src/core/content.ts#L688), [market.ts:91-95](/home/user/ShipIt/src/core/market.ts#L91) |
| Workflows | 4 on/off switches; release.yml has 4 thresholds | One setting | [content.ts:535-548](/home/user/ShipIt/src/core/content.ts#L535) |
| Scripts | 4 | When to run them; scripts.yml (6 releases) runs them for you | [content.ts:87-94](/home/user/ShipIt/src/core/content.ts#L87), [workflows.ts:50-60](/home/user/ShipIt/src/core/workflows.ts#L50) |
| Achievements | 93 (87 listed, 6 secret), +1% each | Checklist. The official bot holds 44 at 2 h, 62 at 5 h, 66 at 8 h, 67 at 12 h; the engaged bot 75 at 2 h and 82 from 3 h 54 min on | [achievements.ts:27-130](/home/user/ShipIt/src/core/achievements.ts#L27); SIM `achTimeline` |
| Career titles | 9, top at 25M stars earned | Checklist; "cto" at 343.5 min, before the IPO | [content.ts:552-562](/home/user/ShipIt/src/core/content.ts#L552); SIM-OFFICIAL |
| Languages | 4, one per round, cycling | Cosmetic; no rule differs by language | [content.ts:461-468](/home/user/ShipIt/src/core/content.ts#L461), [economy.ts:81](/home/user/ShipIt/src/core/economy.ts#L81) |

- Project choice has a measurable best answer for an active player: CLI tool (no automation, x4 per tap, +50% stars) reached Seed at 44 min against 176 for web app and 152 for enterprise at 4 taps/s. — SIM-VARIANTS
- No system has exclusive branches or limited loadout slots: every perk, skill and company perk can be owned at once, and nothing is ever re-specced. — [perks.ts:19-40](/home/user/ShipIt/src/core/perks.ts#L19), [funding.ts:57-64](/home/user/ShipIt/src/core/funding.ts#L57), [major.ts:90-97](/home/user/ShipIt/src/core/major.ts#L90)
- TODO rewards are permanent, additive and uncapped: after 12 h the official bot holds +196% tap, +180% automation, +485% bug reward and +460% sprint reward from them. — [quests.ts:141-144](/home/user/ShipIt/src/core/quests.ts#L141); SIM-OFFICIAL `final.questBonus`

### Inferences
- (Judgment) The only "build" in the game is the project plus team roles. Packages, dotfiles, company perks and skills are all "buy everything, cheapest first", which is exactly what the bot does without loss.
- (Judgment) Forks are the game's AdVenture-Capitalist-style plateau breaker and its most frequent real choice, but the volume makes them unplayable by hand late on: with 500–1,100 copies of each of 22 packages per release and releases lasting seconds, a release offers hundreds of picks. A player past Seed will either ignore forks (losing large multipliers) or want them automated.
- (Judgment) Company perks and capped skills stop being a choice at the exact moment the player has finished collecting the currency, so equity and XP feel like a shopping list. Equity has no use at all after 37 points.
- (Judgment) Bosses, incidents and bugs are three sizes of the same tap test. None scales in difficulty, adds a rule, or asks for preparation.

### Gaps
- Whether plugin/LTS forks beat major rewrites for a human depends on how evenly they spread purchases; I tested only two fixed policies with a greedy buyer.
- I did not test team compositions or the Game engine and OS projects in the simulator.

---

## 4. What happens in the endgame after the IPO?

### Takeaway
After the IPO nothing new unlocks. The loop is: release.yml ships about 21–31 releases per major, most in seconds; the last one to three take minutes to tens of minutes; the player cuts a major by hand, buys another level of 10x engineering, and repeats, with gaps growing from about 20 minutes to 1–2 hours. There is no goal, ending, record or further layer.

### Cited Findings
- The game states the end of funding in one line: "the company is public. there are no more rounds to raise: only quarters to beat." No mechanic called quarters exists. — [ship.ts panel:141-142](/home/user/ShipIt/src/ui/panels/ship.ts#L141)
- Major versions are described in code as "the endless reset" and in the README as "the reset that never runs out". — [content.ts:564-573](/home/user/ShipIt/src/core/content.ts#L564), [README.md:44](/home/user/ShipIt/README.md#L44)
- Time between majors, official bot: 23.5, 16.0, 28.8, 32.0, 21.3, 28.3, 47.7, 64.6, 80.4, 79.8 min (v1.0 to v11.0). All-sprints variant: 13–39 min up to v11.0, then 45, 84 and 140 min. XP per major grows about 1.5x (1, 2, 3, 5, 8, 12, 18, 27, 41, 62, 93). — SIM-OFFICIAL and `out_base_720.json` `majors`
- Inside one post-IPO major (official bot): 23–31 releases, median length 4–5 s, 18–28 of them shipped by release.yml, the longest single release 8–47 min. — SIM-OFFICIAL, segments after 350 min
- What is left to buy after the IPO: `.zshrc` levels (x1.1, cost doubling; level 34 at 12 h), 10x engineering levels (x2, cost doubling; level 6 at 12 h), and nothing else once pairing, head start and muscle memory are owned at 41 XP. — [content.ts:125](/home/user/ShipIt/src/core/content.ts#L125), [content.ts:607](/home/user/ShipIt/src/core/content.ts#L607); SIM-OFFICIAL `final`
- What is left to reach: achievements "Reach v10.0" (614 min official, 347 min all-sprints), "Top three" and "Number one" in the chart, 3- and 7-day streaks. The official bot is #4 of 16 at 12 h with 12 rivals passed; the engaged bot is #1 at 159 min. — [achievements.ts:88-106](/home/user/ShipIt/src/core/achievements.ts#L88); SIM outputs
- Actions with no automation in the endgame: cutting a major, buying skills and `.zshrc`, picking forks, picking a project after each reset (release.yml keeps the current project, and every reset returns it to web app), starting challenges, and all tap events. — [game.ts:312-322](/home/user/ShipIt/src/core/game.ts#L312), [game.ts:437-441](/home/user/ShipIt/src/core/game.ts#L437), [major.ts:66](/home/user/ShipIt/src/core/major.ts#L66), [content.ts:535-540](/home/user/ShipIt/src/core/content.ts#L535)
- Stars, XP, banked stars and users are plain JavaScript numbers, while lines are `Decimal`s. The engaged bot held 1.2e33 stars at 12 h, past the 9e15 limit of exact integers. — [state.ts GameState](/home/user/ShipIt/src/core/state.ts) (`stars: number`, `xp: number`, `banked: number`), [ship.ts:17-22](/home/user/ShipIt/src/core/ship.ts#L17); `out_engaged_720.json`
- The pacing test only requires that majors "keep coming": at least 4 in 600 minutes, each gap shorter than the climb to the first. — [tests/pacing.test.ts:37-46](/home/user/ShipIt/tests/pacing.test.ts#L37)

### Inferences
- (Judgment) The third layer added an endless multiplier but not a new verb. A post-IPO session is: glance, wait for the +50% XP mark, press "cut major", buy 10x, leave. The earlier report's own test ("a second layer should add a verb, not a multiplier") is only partly met: challenges are the verb, and they are finished within about two majors.
- (Judgment) The market is the one system with a natural finish line (#1 of 16) and it is reachable in 3–12+ hours depending on play, after which rank cannot improve and the +75% bonus is fixed.
- (Judgment) Because all permanent state lives outside the market and the story ends at Series A (last mail, last man page), the narrative is over about a third of the way to the IPO.
- (Judgment) Star counts above 9e15 are a latent precision risk for star arithmetic (spending, +75% thresholds) in long engaged saves; I did not find a failing case.

### Gaps
- I ran 12 simulated hours. How gaps between majors behave over days (they were still lengthening at 12 h) is not measured.
- I did not check how the UI formats very large star and XP values.

---

## 5. What is the balance between active and idle play?

### Takeaway
For the first three to four hours Ship It plays as an active clicker: at 4 taps a second, taps alone write 39–70% of all lines, sprints are the largest single income source, and a ship leaves nothing running unless the player taps. Automation takes over only once the package ladder is complete (around Series B), after which taps write under 10%. Time away pays 25% of automation for 7 hours by default and is computed as one lump from the rate at the moment of return.

### Cited Findings

**Measured tap share (lines actually written by the player's own taps over each 10-minute window, official bot)**
- 39–70% in every window from minute 10 to minute 240 (first run, Seed and early Series A); 16–19% at 260–280 min; 5–10% from 290 to 580 min; 3–5% after that. The all-sprints variant falls to 1–3% after 270 min. — SIM-OFFICIAL and `out_base_720.json` `samples[].tapShare10m`

**Tap rate and sprints set the pace of the first run**
- 1 tap/s instead of 4: first ship at 17.5 min instead of 7.4; Seed at 550 min instead of 176. — `out_slow1_720.json`
- No sprints: 72 stars after 282 min, where the official bot has raised Seed (150 stars) at 176 min. — `out_nosprints_300.json`
- A merged sprint pays its target times 1.6 / 2.2 / 3, where the target is 14 / 44 / 112.5 s of typical output, so one 75-second ticket pays 337.5 s of output. That reward is then multiplied by `retro.md` (up to x2), the uncapped TODO sprint bonus (+460% after 12 h), developers on sprints, the Game engine project (x3) and the Solo dev reward (x2). — [content.ts:158-162](/home/user/ShipIt/src/core/content.ts#L158), [sprints.ts:24-44](/home/user/ShipIt/src/core/sprints.ts#L24)
- Sprint targets assume 4 taps a second; a ticket is labelled relaxed up to 3.5 taps/s needed, tight to 6, crunch above. — [content.ts:163-165](/home/user/ShipIt/src/core/content.ts#L163), [sprints.ts:67-76](/home/user/ShipIt/src/core/sprints.ts#L67)

**What happens with no input while the game is open**
- A bot that stops tapping at minute 30 takes 106 minutes for its next release (active: about 15), sits at 100 debt (automation halved) because bugs escape (+4 each) and nobody refactors, and after that ship writes 0 lines a second for the remaining 10 hours: a ship clears every package and nothing produces until the player taps or owns `bootstrap.sh`. — `out_idle30_720.json`; [ship.ts:144-153](/home/user/ShipIt/src/core/ship.ts#L144), [bugs.ts:13-20](/home/user/ShipIt/src/core/bugs.ts#L13)
- Idle automation arrives in steps by releases shipped: deps.yml at 2, dev-deps.yml at 4, scripts.yml at 6, release.yml at 15. Sprints, bugs, incidents, bosses, mail, hiring, forks, refactors and majors are never automated by a workflow ("Bugs and coffee are left to the team"). — [content.ts:534-540](/home/user/ShipIt/src/core/content.ts#L534)
- Partial bug automation: `oncall.yml` 10% per level (5 levels) plus 20% per developer on bug duty (x2.5 for a tester). — [bugs.ts:23-30](/home/user/ShipIt/src/core/bugs.ts#L23)
- Users start leaving after 45 quiet minutes of play, 1% a minute, up to half, and a 4★+ release wins back half of those lost. — [content.ts:654-666](/home/user/ShipIt/src/core/content.ts#L654), [market.ts:77-83](/home/user/ShipIt/src/core/market.ts#L77)

**Offline rules**
- A gap over 60 s counts as time away. Lines = automation per second at the moment of return × seconds (capped) × rate. Base rate 25%, cap 7 h; `crontab` adds +10% and +1 h per level (5 levels), runway +10% and +2 h per level (3 levels), so the maximum is 105% for 18 hours. — [content.ts:229-235](/home/user/ShipIt/src/core/content.ts#L229), [game.ts:455-468](/home/user/ShipIt/src/core/game.ts#L455), [content.ts:122](/home/user/ShipIt/src/core/content.ts#L122), [content.ts:491](/home/user/ShipIt/src/core/content.ts#L491)
- Nothing is simulated while away: no purchases, no ships, no debt, no bugs. The lump lands in spendable lines and in the current release; release.yml can then ship once on the next tick. — [game.ts:498-515](/home/user/ShipIt/src/core/game.ts#L498), [game.ts:550](/home/user/ShipIt/src/core/game.ts#L550)
- Time away counts at 35% toward user churn and alone can cost at most a quarter of users. Rivals keep growing by real days. — [market.ts:62-71](/home/user/ShipIt/src/core/market.ts#L62), [market.ts:91-95](/home/user/ShipIt/src/core/market.ts#L91)
- The first session of a calendar day pays 600 s of automation, plus turbo.sh every 3rd day and sudo.sh every 7th. — [streak.ts:28-42](/home/user/ShipIt/src/core/streak.ts#L28)

**The returning player's first minute (from code, not observed)**
- A welcome-back splash counts up the lines written while away, the rate and duration, and the streak bonus; it shows nothing about users, rivals or releases. — [welcome.ts:26-47](/home/user/ShipIt/src/ui/welcome.ts#L26)
- On load, any bug, incident or boss in flight is cleared and the bug timer restarts. Sprint cooldowns, the applicant timer, mail and boss timers are absolute times, so all three tickets are ready, an applicant and up to 3 mails may be waiting, and a boss can be due. — [game.ts:137-151](/home/user/ShipIt/src/core/game.ts#L137), [sprints.ts:53-64](/home/user/ShipIt/src/core/sprints.ts#L53), [mail.ts:333-353](/home/user/ShipIt/src/core/mail.ts#L333)
- The duck's hint, when poked, points at one of: an incoming boss, a pending fork, high debt, a waiting applicant, unread mail, or a first ship. — [workspace.ts:131-148](/home/user/ShipIt/src/ui/workspace.ts#L131)

### Inferences
- (Judgment) The game has two different audiences in sequence: a hands-on clicker for the first hours, then a near-zero-input idle game. There is no middle mode where a few planned actions per check-in matter, which is what the Incremental Bible says later play should become ("act less, plan more").
- (Judgment) Offline progress is weak in the early and middle game for two reasons that compound: the 25% rate, and the fact that automation is half or less of income while the player is active. By the formulas, a player at hour 1 who leaves for 7 hours returns with under an hour of active-play income (0.25 × 7 h × an automation share of at most about half).
- (Judgment) In the late game the offline lump depends on luck: it uses automation at the moment of return, and with release.yml on, the save may sit seconds after an auto-ship with only bootstrap ducks installed. The same absence can be worth almost nothing or a great deal.
- (Judgment) Leaving the game open and untouched is worse than closing it in one respect (debt climbs to 100 and bugs escape) and better in another (100% or 50% of automation against 25%). The player has no clear signal about which to do.
- (Judgment) Sprint rewards scale with the uncapped TODO sprint bonus, so the gap between an attentive and an inattentive player widens over time instead of closing.

### Gaps
- No simulation included time away, so the offline inferences are derived from the formulas, not measured.
- I did not measure what share of income sprints, bugs, incidents and bosses each contribute, only the effect of removing sprints.

---

## 6. What theme material is used, and what obvious material is unused?

### Takeaway
The game already covers the daily texture of software work (packages, sprints, bugs, outages, merge conflicts, tech debt, CI, dotfiles, semver, on-call, funding, a PM and a mysterious Dave). What it barely touches is everything that faces outward or sits above the keyboard: customers and revenue, pricing, open source as a system, code review, tests and deploys as mechanics, tech-stack choice, hiring beyond a trait, conferences, hackathons, acquisitions, and AI tooling as more than package names.

### Cited Findings

**Used as mechanics**
- Packages named after developer tools, from a mechanical keyboard and rubber duck to a CI pipeline, container cluster, agent swarm and absurd late tiers (Dyson build farm, simulated universe). — [content.ts:23-46](/home/user/ShipIt/src/core/content.ts#L23)
- Package forks as "major rewrite", "plugin ecosystem", "LTS build"; refactoring as `git refactor`; dotfiles as the perk tree (`.vimrc`, `crontab`, `oncall.yml`, `retro.md`, `.zshrc`); `~/bin` scripts; `.github/workflows` as earned automation. — [content.ts:114-126](/home/user/ShipIt/src/core/content.ts#L114), [content.ts:269-273](/home/user/ShipIt/src/core/content.ts#L269), [content.ts:535-540](/home/user/ShipIt/src/core/content.ts#L535)
- Sprints with standup cooldowns and 12 ticket titles; bugs; coffee, outages and merge conflicts; four boss incidents (Friday deploy, DDoS, security audit, database migration). — [content.ts:167-171](/home/user/ShipIt/src/core/content.ts#L167), [content.ts:406-440](/home/user/ShipIt/src/core/content.ts#L406)
- Releases as pull requests with a `git log`, semver (v{major}.{minor}), GitHub stars as the prestige currency, funding rounds from Bootstrapped to IPO, equity, a cap table, career titles from intern to CTO. — [ship.ts panel:161-190](/home/user/ShipIt/src/ui/panels/ship.ts#L161), [content.ts:458](/home/user/ShipIt/src/core/content.ts#L458), [content.ts:552-562](/home/user/ShipIt/src/core/content.ts#L552)
- Six project types (web app, CLI tool, enterprise suite, game engine, startup MVP, operating system); a team with traits (senior, 10x, tester, SRE, scrum lead, tidy, generalist) and roles. — [content.ts:327-334](/home/user/ShipIt/src/core/content.ts#L327), [content.ts:361-369](/home/user/ShipIt/src/core/content.ts#L361)
- An app-store chart, reviews, users, 15 rival companies, a press feed with 7 outlets; a contribution heatmap and commit streak. — [content.ts:688-707](/home/user/ShipIt/src/core/content.ts#L688), [content.ts:246-252](/home/user/ShipIt/src/core/content.ts#L246)
- Challenge releases as branches: legacy codebase, CI is down, broken keyboard, solo dev, clean install. — [content.ts:632-638](/home/user/ShipIt/src/core/content.ts#L632)
- A CI pane that prints builds, lint, flaky tests (flakier with debt), and pod rollouts once the cluster is owned. — [workspace.ts:101-126](/home/user/ShipIt/src/ui/workspace.ts#L101)

**Used only as flavour text (one mail or one line each)**
- Open-source sponsorship, a bug bounty, a conference talk, a vendor licence against an open-source fork, blockchain hype, an investor demo, the logo, a meeting about meetings, the test suite, the intern and the production database. — [mail.ts:128-299](/home/user/ShipIt/src/core/mail.ts#L128)
- A story thread about "Dave", legacy code and the duck across 9 mails and 9 man pages, resolved at Series A. — [mail.ts:35-125](/home/user/ShipIt/src/core/mail.ts#L35), [man.ts:107-118](/home/user/ShipIt/src/core/man.ts#L107)
- The editor writes TypeScript, Rust, Go or Python by round; the rewrite has no rules attached. — [content.ts:461-468](/home/user/ShipIt/src/core/content.ts#L461)
- AI appears as three package names (autocomplete model, code generator, agent swarm) and one rival (Galaxy Brain AI). — [content.ts:29](/home/user/ShipIt/src/core/content.ts#L29), [content.ts:39-41](/home/user/ShipIt/src/core/content.ts#L39), [content.ts:701](/home/user/ShipIt/src/core/content.ts#L701)

**Not present as a mechanic anywhere in `src/core`** (checked by reading every core module listed in the assignment, and a keyword search for "hackathon" and "acqui/merger/buyout", which returned no hits)
- Money: revenue, pricing, paying customers, burn or runway as a resource (runway exists only as an offline perk name). Users have no effect except chart rank.
- Customers and support: support tickets, feature requests, churn reasons, enterprise deals, SLAs.
- Open source as a system: contributors, issues, pull requests from strangers, forks of your repo, licences, dependencies you maintain or depend on.
- Code review and quality gates: reviews, approvals, test coverage, a test suite you build, CI as something that can pass or fail a release.
- Deploys and operations: environments, staged rollouts, feature flags, rollbacks, uptime, an on-call rotation you schedule (on-call is one role checkbox).
- Tech stack: choosing a language, framework or database with trade-offs; migrations between them.
- People: salaries, morale, burnout, promotion, mentoring, layoffs, culture, remote work, interviews.
- Events: hackathons, conferences (beyond one mail), launches of your own, seasonal crunch, holidays.
- Company arc: acquisitions (acquiring a rival or being acquired), a board, quarterly targets, going public as more than a x3.
- AI tooling: prompts, agents you direct, model upgrades, hallucinated code, review of generated code.
- Security beyond one boss: CVEs in dependencies, supply-chain incidents, audits as preparation.

### Inferences
- (Judgment) The unused material clusters into three natural homes that the game already hints at: users who currently do nothing (customers, revenue, support), the cosmetic language swap (a real stack choice per run), and the empty post-IPO line "only quarters to beat" (a board, targets, acquisitions of the 15 rivals).
- (Judgment) Several existing mails read like the seed of a system (sponsorship, bug bounty, licence vs fork, the test suite). Promoting a mail topic into a mechanic would fit the current voice.
- (Judgment) Tests, CI and code review are shown (the CI pane) but have no rules. They are the cheapest on-theme way to give a release a quality dimension beyond the review score.

### Gaps
- I read flavour text in `src/core` and parts of `src/ui`; I did not read `src/ui/codegen.ts` (389 lines of generated code snippets) or `messages.ts` in full, so some one-line references may be missed.

---

## 7. What do the existing design documents already conclude?

### Takeaway
The prestige report's seven-step roadmap is almost entirely implemented in v0.4.2; what remains open is the part about variety (a stack choice per major, challenge rewards that grant automation, repeatable challenges, a scripting layer) and telemetry. The Incremental Bible's test for any addition is "does it add a decision, or only a bigger number?", and it lists five families of systems (active bonuses and banked rewards, scripting, mastery and loot, chosen difficulty and dailies, milestones, secrets and endings) of which Ship It has only pieces.

### Cited Findings

**Prestige report: recommendation status in v0.4.2** (report: [reports/Prestige systems in incremental games.md](/home/user/ShipIt/reports/Prestige%20systems%20in%20incremental%20games.md); its measurements: [ship_it_current_system.md](/home/user/ShipIt/research_notes/Prestige%20systems%20in%20incremental%20games/ship_it_current_system.md))

| # | Report recommendation | Status | Evidence in v0.4.2 |
|---|---|---|---|
| 1 | Test spam-shipping against the patient bot; evaluate the top-producer rule at minute 120; fix the README pacing line | Done | [tests/pacing.test.ts:29-34](/home/user/ShipIt/tests/pacing.test.ts#L29), [tests/pacing.test.ts:48-55](/home/user/ShipIt/tests/pacing.test.ts#L48), [README.md:55](/home/user/ShipIt/README.md#L55) |
| 2 | Stars from cumulative shipped lines, coefficient 2 | Done, per run (since the last round or major), not lifetime | [content.ts:203-220](/home/user/ShipIt/src/core/content.ts#L203), [ship.ts:31-35](/home/user/ShipIt/src/core/ship.ts#L31) |
| 3 | Legible ship panel: stars per minute now vs best, a +50% hint, the "x" effect, a release log | Done | [ship.ts panel:74-88](/home/user/ShipIt/src/ui/panels/ship.ts#L74), [ship.ts panel:109-117](/home/user/ShipIt/src/ui/panels/ship.ts#L109), [ship.ts panel:224-238](/home/user/ShipIt/src/ui/panels/ship.ts#L224) |
| 4 | A bigger (not earlier) first release: 2 stars plus a highlighted or free first dotfile | 2 stars done (first ship pays +2 at 7.4 min); I found no free or highlighted first perk in `perks.ts` or the ship panel | SIM-OFFICIAL; [perks.ts](/home/user/ShipIt/src/core/perks.ts) |
| 5 | Release-count automation ladder ending in auto-ship with a "+X% stars" trigger | Done for package buying, scripts and shipping (2, 4, 6, 15 releases). Not done: auto-start sprints, bug triage as a ladder reward | [content.ts:535-548](/home/user/ShipIt/src/core/content.ts#L535) |
| 6 | Uncapped doubling-cost star sink; milestones relative to the last release; achievements past v10 and 50★; career titles | Done (`.zshrc` at x1.1; milestone at 1.5x the last release for +25% stars; achievements to 1M stars, 100 releases, v10.0 major; 9 titles) | [content.ts:125](/home/user/ShipIt/src/core/content.ts#L125), [content.ts:222-227](/home/user/ShipIt/src/core/content.ts#L222), [achievements.ts:77-93](/home/user/ShipIt/src/core/achievements.ts#L77), [content.ts:552-562](/home/user/ShipIt/src/core/content.ts#L552) |
| 7a | Optional major-version layer themed on semver, teased by a locked tab, never resetting `lifetime` | Done (opens at Series B; tab a round early; minor digit now used) | [major.ts:12-15](/home/user/ShipIt/src/core/major.ts#L12), [major.ts:53-74](/home/user/ShipIt/src/core/major.ts#L53) |
| 7b | Challenge releases behind feature flags | Done as 5 one-time challenges. The report's table paid automation (package auto-buy, bug auto-triage, incident auto-resolve, start with tiers unlocked, a theme); the game pays permanent multipliers (−10% prices, x1.5 automation, x1.5 tap, x2 sprints and bugs, +25% stars) | [content.ts:632-638](/home/user/ShipIt/src/core/content.ts#L632) |
| 7c | A stack choice per major that reshapes the ladder (rust for taps and crits, python for cheap automation, go for sprints, js for many cheap tiers and twice the bugs) | Not done. Languages change with funding rounds and are cosmetic | [content.ts:461-468](/home/user/ShipIt/src/core/content.ts#L461), [economy.ts:81](/home/user/ShipIt/src/core/economy.ts#L81) |
| 7d | Repeatable challenges with a capped bonus that scales with completions (Kittens Game) | Not done; a finished challenge cannot be started again | [major.ts:123-128](/home/user/ShipIt/src/core/major.ts#L123) |
| 7e | Grow `~/bin` scripts into a small rule language ("the most on-theme idea here and also the most expensive") | Not done; scripts are 4 fixed boosts | [content.ts:87-94](/home/user/ShipIt/src/core/content.ts#L87) |
| 7f | An explicit keep list ("kept on release / kept on major / permanent") | Partly: each reset button has a text caveat listing what resets and stays; no per-item marking in the dotfiles tree that I found | [ship.ts panel:149](/home/user/ShipIt/src/ui/panels/ship.ts#L149), [ship.ts panel:185](/home/user/ShipIt/src/ui/panels/ship.ts#L185) |
| — | Log time-to-first-release and release cadence locally to check against real players | Partly: the release log keeps the last 10 releases with duration; nothing longer | [content.ts:218-219](/home/user/ShipIt/src/core/content.ts#L218) |

- The report's closing position was that a second layer "earns its cost only if it adds decisions", and that step 7 "may not be needed at all" if steps 1–6 hold players. — [reports/Prestige systems in incremental games.md](/home/user/ShipIt/reports/Prestige%20systems%20in%20incremental%20games.md) (roadmap section)
- The report's cumulative-curve prediction that spam shipping loses by 2x or more is enforced by a test: a 5-minute timer and ship-at-every-star must each earn under half the patient bot's stars over 240 minutes. — [tests/pacing.test.ts:48-55](/home/user/ShipIt/tests/pacing.test.ts#L48)
- Systems in v0.4.2 that the report did not propose: the market (reviews, users, rivals, press) and the per-run rather than lifetime star curve. — [README.md:47](/home/user/ShipIt/README.md#L47), [content.ts:205-209](/home/user/ShipIt/src/core/content.ts#L205)

**Incremental Bible: what I read**
I read it through the docs connector (doc "Incremental Bible", two tabs). Tab 1 (39,662 characters as text): everything from the title through "Open questions for Exfil" (all principle sections and the Exfil application); I did not read its closing Sources list. Tab "Sunday League to Dynasty" (32,403 characters): the application sections through "Open questions", with the longest table rows cut off at 2,600 characters; I did not read "Case studies: what we borrow" or its Sources. — [Incremental Bible](https://claude.ai/artifact/4PkJgggzc3P4McXMubdh6X)

**Bible principles that bear on gameplay expansion** — all from [Incremental Bible](https://claude.ai/artifact/4PkJgggzc3P4McXMubdh6X), section named in each line
- The test for every system: "does it add a decision for the player, or only a bigger number?" Content is "the parts of a game that engage the player": reading an effect and making a decision count; waiting on a timer, spam-clicking and "the twentieth copy of a repeatable purchase" do not. (More systems players like)
- Upgrades should change behaviour: each should change how something behaves instead of adding a flat percentage, be optional, and combine with something else to enable a new approach. (More systems players like)
- Paradigm shifts, points where the loop itself changes, are what stop a long game going stale; later layers "should add decisions, not clicks", because players act less and plan more as a game goes on. (Anatomy; More systems players like)
- Reveal, don't front-load; never let players feel done; gate systems behind milestones and show them locked; always show the next goal. (Anatomy; Numbers and pacing; Feedback and UI; Pitfalls)
- Give systems clocks of different lengths (20 minutes, 5 hours, 2 days) so hourly, daily and weekly check-ins each have something to collect. First prestige under an hour. (Numbers and pacing)
- Make it bumpy: a hard milestone with a new mechanic attached beats a smooth curve. Every solution should create the next problem, with more than one fix per bottleneck. (Variety systems; Anatomy)
- Keep the top layer open with three patterns: record-based permanent bonuses, repeatable purchases with rising cost, and a modifier on each new run. The reset must feel like a speed-up. (Prestige design)
- Automation is a reward for mastering a chore; "if players reach for auto-clickers, the design is wrong"; each reset should remove one chore from the next (reset milestones). (Automation and offline progress; Milestones, secrets and endings)
- Offline: compute it like online or let costs be the soft cap "rather than punishing absence with percentage cuts"; a generous daily-sized cap; the return should feel like a celebration with a clear report; pause or step through crises instead of applying them to a whole absence. (Automation and offline progress; Pitfalls)
- Variety tools: rule-changing challenges, record challenges, achievements that pay, factions or builds per run, respec trees, limited slots, rule changes on reset, announced events. (Variety systems)
- Five families the Bible says late games need: (1) active play and banked rewards (random timed bonus, stacking buffs, banked harvest, a daily-clock currency, a bonus for holding, stored time), kept optional; (2) scripting and planning as play (late-game scripting, rule parts as unlocks, saved plans compared side by side), grown "one readable piece at a time"; (3) mastery, collections and loot (per-item mastery, loot with few slots and lock-in, heirlooms, expeditions with a length choice, crafting); (4) chosen difficulty and dailies (stackable handicaps, seeded daily, positional synergies, timed goals with rare rewards); (5) milestones, secrets and endings ("An ending is a feature. Endless play can follow it"). (More systems players like)
- Respect for the player: plateaus where they can step away, clear endings, no compulsion loops, no unrecoverable states. (Why incrementals are fun; Pitfalls)

**How the user has applied the Bible to two other games** (useful as a pattern for Ship It recommendations) — [Incremental Bible](https://claude.ai/artifact/4PkJgggzc3P4McXMubdh6X), "Applying it to Exfil" and the "Sunday League to Dynasty" tab
- Both games were given a campaign with an ending, then endless play with dials (chosen difficulty) and a daily.
- Additions are listed smallest first, each adding "one new decision", each able to ship alone; items that change the save format go last.
- Side systems are tuned to 10–20% of income so the core stays the core.
- Pacing is checked with a bot that reports the "longest wait for something new" per stage; a last hour with nothing new was treated as a defect and fixed with two late features.
- Flat-percentage upgrades were audited and rewritten to change behaviour, and every upgrade was made visible on screen.
- Recurring "outside the box" moves: your old self as the rival; first-time prompts that become automation rules; an analyst that proposes one change for the player to approve; named combos when short bonuses overlap; a late change of seat (raider to warden, manager to owner).

### Inferences
- (Judgment) Bible principle against Ship It as it stands:

| Bible principle | In Ship It v0.4.2 | My reading |
|---|---|---|
| Achievements that pay | 93 at +1% each | Present |
| Repeatable purchase with rising cost | `.zshrc`, 10x engineering | Present, but both are plain multipliers |
| Rule-changing challenges | 5, one-time | Present, exhausted in about two majors; no record version |
| Random timed bonus and stacking buffs | Coffee (x3, 20 s) multiplies with scripts; each running effect adds debt | Present; stacking is not named or surfaced as a goal |
| Reset milestones | Workflows by releases shipped | Present for ships; none for rounds or majors |
| Secret achievements | 6 | Present |
| Automation as a reward | Workflows | Present, but challenges do not pay automation and forks, majors and sprints have none |
| Reveal, don't front-load | 8 of 9 tabs by minute 7.4 | Against the principle |
| Clocks of different lengths | Seconds to minutes (sprints, bugs, incidents, bosses, mail) and a daily streak | Nothing between 12 minutes and a day |
| Offline like online, generous cap | 25% for 7 h, lump at the return rate | Against the principle at base values |
| Builds, limited slots, respec | None; everything can be owned at once | Missing |
| Scripting and planning | None | Missing (the theme invites it) |
| Mastery, loot, expeditions | None | Missing |
| Chosen difficulty, dailies | None beyond the 5 challenges | Missing |
| An ending | None; the IPO is a x3 and a sentence | Missing |
| Paradigm shift in the endless phase | None; majors repeat the same loop faster | Missing |

- (Judgment) Applying the Bible's own content test to Ship It: packages, dotfiles, company perks, capped skills, career titles, TODO tasks and most achievements are "a bigger number"; projects, fork picks, team roles, challenges, ship and major timing, mail choices and the rival launch window are decisions. The decision set is fully revealed by about minute 35, except challenges.
- (Judgment) The open items from the prestige report (stack choice per major, automation as challenge rewards, repeatable challenges, a script rule language) and the Bible's missing families point the same way: the game needs per-run variety and a planning layer more than another multiplier.

### Gaps
- I did not read the Bible's Sources lists or the football tab's last two sections, and some long table rows in the football tab were truncated, so a few applied features there may be missing from the summary above.
- The other four prestige research notes were skimmed by their takeaways only; I relied on the report for their conclusions.
- "Highlighted first dotfile" (report step 4) and the per-item keep list (7f) are UI questions I checked only by searching two files; a UI audit should confirm.
