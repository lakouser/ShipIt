# Ship It: the current prestige ("Ship") system, measured

Scope: codebase analysis of /home/user/ShipIt at commit f69340c (branch claude/keen-lamport-lxzeqa), plus simulator runs. Every formula cites `file:line`. Every measurement quotes either the official simulator (`npm run simulate`, which runs `tests/pacing.test.ts`) or my instrumented copy of the same bot.

Measurement setup:
- **Official runs:** `SIM_MINUTES=480 npm run simulate` (4 taps/s) and `SIM_TAPS=1 SIM_MINUTES=480 npm run simulate`. Raw output is in `/tmp/claude-0/-home-user-ShipIt/2f3cf838-2fba-5b0e-b5b4-598383e07f78/scratchpad/sim480_t4.txt` and `.../scratchpad/sim480_t1.txt`.
- **Instrumented runs:** `/tmp/claude-0/-home-user-ShipIt/2f3cf838-2fba-5b0e-b5b4-598383e07f78/scratchpad/sim/longsim.ts` is a line-for-line copy of the bot in `tests/sim.ts`, with the same seeds (7 and 1007), plus per-release logging and alternative ship policies. I ran it with vitest from the scratchpad, importing the repo's `src/` by absolute path.
- **Validation:** for the default policy, the copy reproduces the official ship minutes exactly: 5.4, 10.39, 16.62, 27.87, 44.52, 65.9, 86.95, 110.77, 132.5, 152.22, 174.89, 206.57, 247.99, 307.84, 398.14, with the same final perks.
- **Where outputs are:** `.../scratchpad/sim/` holds the JSON and TXT outputs (`out_<policy>_t<taps>_m<minutes>.json`, `v*.txt`, `p_*.txt`, `q_*.json`). `.../scratchpad/analysis.py` computes the closed-form tables.
- **Time units:** "minutes" means simulated minutes of continuous active play. The simulator never goes offline.
- **Repository state:** no tracked files were changed. `npm install` bumped the version field in `package-lock.json`, and I reverted that with `git checkout`.

---

## Q1. How does "Ship" (prestige) work end to end: what resets, what persists, and what does the player see before and after?

### Takeaway
Shipping is a single-layer prestige that converts lines written this release into permanent stars, using `floor(cbrt(thisRelease / 2M))`. It wipes lines, packages, the active sprint and the backlog, and it rolls the release milestone. Everything else carries over, including the unbounded TODO-quest bonuses, scripts and active timed effects.

Stars do two jobs at once:
- Each earned star adds a permanent +10% to all output, even after it is spent.
- Stars are also the currency for 10 "dotfiles" perks, and those cost 419 stars in total.

The player sees a GitHub-PR-themed Ship tab with a diff preview and a two-click confirm, then a "git merge" splash.

### Cited Findings

**Unlock and entry points**
- The Ship tab unlocks when lines this release reach 200,000, or when the player has any stars. — [src/core/content.ts:227](/home/user/ShipIt/src/core/content.ts#L227), [src/core/game.ts:301](/home/user/ShipIt/src/core/game.ts#L301)
- The UI calls `Game.ship()`, which calls `ship(state, now, rng)` and emits `{type:'shipped', result, totalStars}`. — [src/core/game.ts:202-206](/home/user/ShipIt/src/core/game.ts#L202), [src/core/game.ts:40](/home/user/ShipIt/src/core/game.ts#L40)

**What `ship()` does** ([src/core/ship.ts:32-48](/home/user/ShipIt/src/core/ship.ts#L32))
- It returns `null` when fewer than 1 star is available (line 34).
- `stars += gained` and `release++` (lines 36-37).
- `lines = 0` and `thisRelease = 0` (lines 38-39).
- `owned = {}`, or `{kb: 5·L, duck: 5·L}` when `bootstrap.sh` is at level L (lines 41-42).
- `sprint = null` and `lastSprint = null` (lines 43-44). An in-progress sprint is dropped without its reward.
- `backlog = makeBacklog(s, now, rng)` (line 45). `keepCooldowns` is not passed, so every sprint slot's standup cooldown resets to "ready now" ([src/core/sprints.ts:39-42](/home/user/ShipIt/src/core/sprints.ts#L39)).
- `milestone = makeMilestone(s)` for the new release (line 46).

**What persists** (fields of `GameState` that `ship()` does not touch; [src/core/state.ts:97-137](/home/user/ShipIt/src/core/state.ts#L97), [src/core/ship.ts:32-48](/home/user/ShipIt/src/core/ship.ts#L32))
- `lifetime`, `stars`, `starsSpent`, `perks` and `achievements`.
- `questBonus`, the permanent fractions from TODO tasks.
- The open `quests`, `scripts` (the ~/bin inventory) and `effects`. Running timed boosts keep running across a ship.
- `stats`, `streak`, `unlocked`, `flags`, the bug and incident timers, and `settings`.
- The in-memory flow meter (`Game.flow`), which is not saved at all. — [src/core/game.ts:68-69](/home/user/ShipIt/src/core/game.ts#L68)

**Before shipping (Ship tab)** ([src/ui/panels/ship.ts:51-137](/home/user/ShipIt/src/ui/panels/ship.ts#L51))
- Header text `gh pr view release/v{next}` and the title "Release v{next}.0".
- "lines this release", with a bar toward the next star threshold: "next ★ at X" (lines 92-98).
- A `config/release.ts` diff that previews `stars` and `outputBonus`:
  - `outputBonus` is printed as `stars*0.1` with two decimals, for example `0.70` (lines 11, 64-69, 100-102).
  - The preview always adds at least 1 star: `s.stars + Math.max(1, stars)` (line 100).
- The caveat: "shipping resets lines and packages. stars, dotfiles, achievements and TODO bonuses carry over. each star adds 10% to all output, even after you spend it." (line 70)
- The button:
  - Shows "needs X more lines" while disabled.
  - Otherwise shows "merge & ship v{n}.0 → +k stars".
  - The first click arms it ("confirm: merge and reset lines?"), and a second click within 4 s ships. — [src/ui/panels/ship.ts:125-136](/home/user/ShipIt/src/ui/panels/ship.ts#L125), [src/ui/panels/index.ts:11](/home/user/ShipIt/src/ui/panels/index.ts#L11), [src/ui/panels/index.ts:135-143](/home/user/ShipIt/src/ui/panels/index.ts#L135)
- The same tab holds the `~/dotfiles` perk tree (levels, `N★` costs, "needs X level Y" locks) and a neofetch-style block (release, stars and +%, lifetime lines, loc/s, taps, sprints, bugs, uptime). — [src/ui/panels/ship.ts:32-49](/home/user/ShipIt/src/ui/panels/ship.ts#L32), [src/ui/panels/ship.ts:74-87](/home/user/ShipIt/src/ui/panels/ship.ts#L74)
- The tab button shows a tmux-style "bell" whenever at least 1 star is available. — [src/ui/app.ts:232](/home/user/ShipIt/src/ui/app.ts#L232)

**After shipping**
- The game saves and flushes to the cloud, re-renders panels, and sets `dialogOpen`, which only pauses bug and incident spawns; production keeps ticking. — [src/ui/app.ts:212-221](/home/user/ShipIt/src/ui/app.ts#L212)
- The log line reads "shipped v{n}.0, +k stars, output +X%". — [src/ui/messages.ts:75-76](/home/user/ShipIt/src/ui/messages.ts#L75)
- The full-screen "git merge" splash ([src/ui/merge.ts:31-97](/home/user/ShipIt/src/ui/merge.ts#L31)):
  - The line count drains to 0 over about 1 s.
  - Log rows print: "N lines merged", "upgrades reset", "tagged v{n}.0".
  - The star count pops from old to new, labelled "stars · output +X%".
  - Tap to skip, tap again to close.
- The header star count bounces. The header always shows "release v{n}.0 · S stars", with S unformatted. — [src/ui/app.ts:219](/home/user/ShipIt/src/ui/app.ts#L219), [src/ui/header.ts:49](/home/user/ShipIt/src/ui/header.ts#L49)

**Tests that pin this behaviour**
- 1,999,999 lines gives no ship. 16M lines gives 2 stars, `owned={}`, lines 0, release 2, and perTap 1.2 (1 × 1.2 for 2 stars). — [tests/game.test.ts:296-315](/home/user/ShipIt/tests/game.test.ts#L296)
- Bootstrap level 2 gives `{kb:10, duck:10}`. — [tests/game.test.ts:317-324](/home/user/ShipIt/tests/game.test.ts#L317)

### Inferences
- Bootstrap, the reset backlog and the persistent scripts and effects make the reset cheap; only the package counts are really lost. Q4 and Q6 show this matters a lot.
- There is no second layer, no reset of perks, achievements or quest bonuses, and no "challenge" variant. Releases are the only reset.

### Gaps
- No UI or browser run was done. The presentation details above come from reading the code, not from screenshots.

---

## Q2. What are the exact formulas: star gain, star bonus and how it combines, perk costs and caps, the total to max all perks, and the maximum perk multiplier?

### Takeaway
- **Star gain:** `floor(cbrt(thisRelease / 2,000,000) + 1e-9)`.
- **Star bonus:** an additive `1 + 0.1·stars` term inside `globalMultiplier`. That term multiplies with achievements (1 + 0.01 each), coffee, the per-kind perks, quest bonuses and scripts.
- **Perks:** level costs are linear, `base + step·level`. Maxing all 10 perks costs exactly 419 stars.
- **Perk ceiling:**
  - Taps: ×3.5 from `.vimrc`, about ×1.5 at full flow, and about ×1.6 expected from crits, for roughly ×8.4.
  - Automation: ×3.5 from `team.yml`.
  - Prices: −30% from `cache.conf`.

### Cited Findings

**Star gain**
- `starsAvailable = Math.floor(Math.cbrt(thisRelease/linesPerStar) + 1e-9)`, with `linesPerStar = 2_000_000`. The source comment reads "1 star at 2M, 2 at 16M, 10 at 2B". — [src/core/ship.ts:10-13](/home/user/ShipIt/src/core/ship.ts#L10), [src/core/content.ts:191-196](/home/user/ShipIt/src/core/content.ts#L191)
- Inverse: `linesForStars(n) = 2M·n³`. — [src/core/ship.ts:16](/home/user/ShipIt/src/core/ship.ts#L16)
- `thisRelease` counts every credited line ([src/core/economy.ts:84-89](/home/user/ShipIt/src/core/economy.ts#L84)):
  - taps, automation, sprint rewards, bug and incident rewards;
  - offline credit ([src/core/game.ts:227-229](/home/user/ShipIt/src/core/game.ts#L227));
  - the daily streak bonus ([src/core/streak.ts:34-35](/home/user/ShipIt/src/core/streak.ts#L34)).
- Closed-form table (`analysis.py`):

| Lines in one release | Stars | Single-ship bonus |
|---|---|---|
| 2.0e6 | 1 | +10% |
| 1.6e7 | 2 | +20% |
| 2.0e9 | 10 | +100% |
| 2.0e12 | 100 | +1,000% |
| 1.47e14 | 419 | — |
| 2.0e15 | 1,000 | — |
| 2.0e18 | 10,000 | — |

- Because cbrt is concave, splitting the same L lines into k equal releases yields k^(2/3) times the stars: ×1.59 for k=2, ×4.0 for k=8, ×21.5 for k=100. — `analysis.py` output

**Milestone stars (second source of stars)**
- Each release has a milestone worth `1 + floor(r/3)` stars. It is awarded once all three tasks are met during that release, and the stars are added to `s.stars`, so they count toward both the bonus and perk spending. — [src/core/quests.ts:176-188](/home/user/ShipIt/src/core/quests.ts#L176), [src/core/quests.ts:206-214](/home/user/ShipIt/src/core/quests.ts#L206)
- The three tasks:
  - `thisRelease ≥ 2M·8·r²` (that is, 16M·r²);
  - `totalOwned ≥ 30 + 15(r−1)`;
  - `≥ 2 + floor(r/2)` sprints merged since the milestone was created.
- Examples: r=1 gives 1★ for 16M lines, 30 packages and 2 sprints. r=10 gives 4★ for 1.6e9 lines, 165 packages and 7 sprints. r=21 gives 8★ for 7.06e9 lines, 330 packages and 12 sprints. — `analysis.py` output

**Bonus formula and how it combines** ([src/core/economy.ts:19-37](/home/user/ShipIt/src/core/economy.ts#L19))
- `globalMultiplier = (1 + 0.1·stars) × (1 + 0.01·achievements) × Π allMul(effects)`.
- `tapMultiplier = global × (1 + 0.25·vimrc) × (1 + questBonus.tap) × Π tapMul`.
- `autoMultiplier = global × (1 + 0.25·team) × (1 + questBonus.auto) × Π autoMul`.
- Per-upgrade output = `output × 2^floor(n/25) × kindMultiplier` ([src/core/economy.ts:12](/home/user/ShipIt/src/core/economy.ts#L12), [src/core/economy.ts:43-60](/home/user/ShipIt/src/core/economy.ts#L43)). Taps add `BASE_TAP = 1`, then flow (up to `1 + 1 + 0.25·flowLevel`) and crit (×5) on top ([src/core/game.ts:107-138](/home/user/ShipIt/src/core/game.ts#L107)).
- Stars are additive with one another (linear in count) and multiplicative with every other source.
- The bonus counts all stars ever earned, spent or not: the bonus uses `s.stars`, while spending raises `s.starsSpent`. — [src/core/state.ts:105-107](/home/user/ShipIt/src/core/state.ts#L105), [src/core/perks.ts:9](/home/user/ShipIt/src/core/perks.ts#L9), [src/core/perks.ts:26](/home/user/ShipIt/src/core/perks.ts#L26), [tests/game.test.ts:96-108](/home/user/ShipIt/tests/game.test.ts#L96)
- Marginal value of one more star = `0.1/(1+0.1S)`: 9.1% at S=1, 0.91% at S=100, 0.23% at S=419, 0.015% at S=6,559, 0.0016% at S=61,696. — `analysis.py` output

**Perks** (cost for level n+1 = `baseCost + costStep·n`, buying needs prerequisites; [src/core/content.ts:98](/home/user/ShipIt/src/core/content.ts#L98), [src/core/content.ts:104-129](/home/user/ShipIt/src/core/content.ts#L104), [src/core/perks.ts:11-30](/home/user/ShipIt/src/core/perks.ts#L11))

| perk (file) | effect per level | max | level costs | total ★ | requires |
|---|---|---|---|---|---|
| vimrc (.vimrc) | +25% lines per tap | 10 | 1..10 | 55 | – |
| keybindings (keybindings.json) | +3% crit chance (crit ×5) | 5 | 2..6 | 20 | vimrc 1 |
| flow (flow.conf) | +25% at full flow | 4 | 3,5,7,9 | 24 | vimrc 2 |
| team (team.yml) | +25% automation | 10 | 1..10 | 55 | – |
| oncall (oncall.yml) | +10% chance a bug squashes itself | 5 | 2..6 | 20 | team 1 |
| retro (retro.md) | +20% sprint rewards | 5 | 2,4,6,8,10 | 30 | team 2 |
| cache (cache.conf) | packages −2% price | 15 | 1..15 | 120 | – |
| cron (crontab) | +10% offline rate, +1 h cap | 5 | 2,4,6,8,10 | 30 | cache 1 |
| timeouts (timeouts.conf) | +10% sprint time | 5 | 2..6 | 20 | cache 1 |
| bootstrap (bootstrap.sh) | start with +5 kb and +5 duck | 5 | 3,6,9,12,15 | 45 | cache 3 |
| **all** | | | | **419** | |

The totals are computed in `analysis.py`.

**Maximum perk effects**
- Taps: `.vimrc` ×3.5 ([src/core/economy.ts:27](/home/user/ShipIt/src/core/economy.ts#L27)). `flow.conf` raises full flow from ×2 to ×3, which is ×1.5 relative ([src/core/game.ts:107-109](/home/user/ShipIt/src/core/game.ts#L107), [src/core/content.ts:57-58](/home/user/ShipIt/src/core/content.ts#L57)). `keybindings` gives a 15% crit chance, an expected ×1.6 ([src/core/economy.ts:63-64](/home/user/ShipIt/src/core/economy.ts#L63)). The combined tap ceiling is about ×8.4 expected.
- Automation: `team.yml` ×3.5 ([src/core/economy.ts:34](/home/user/ShipIt/src/core/economy.ts#L34)).
- Prices: `cache.conf` ×0.70, about ×1.43 purchasing power ([src/core/economy.ts:67-71](/home/user/ShipIt/src/core/economy.ts#L67)).
- Offline: `crontab` raises the rate from 25% to 75% and the cap from 2 h to 7 h ([src/core/game.ts:220-226](/home/user/ShipIt/src/core/game.ts#L220)).
- Sprints: `retro` ×2 rewards and `timeouts` ×1.5 time ([src/core/sprints.ts:24-26](/home/user/ShipIt/src/core/sprints.ts#L24)).
- Bugs: `oncall` makes 50% of bugs squash themselves ([src/core/bugs.ts:20-26](/home/user/ShipIt/src/core/bugs.ts#L20)).
- Restart: `bootstrap` gives 25 keyboards and 25 ducks, exactly one doubling each, because `DOUBLING_STEP = 25` ([src/core/content.ts:45](/home/user/ShipIt/src/core/content.ts#L45)).

**Other permanent multipliers that survive a ship**
- Achievements add +1% each, 56 in total ([src/core/content.ts:47](/home/user/ShipIt/src/core/content.ts#L47), [README.md:38](/home/user/ShipIt/README.md#L38)).
- TODO tasks add +2% tap or auto, or +5% bug or sprint reward, each additive and unbounded. A finished slot refills every 45 s ([src/core/content.ts:206-213](/home/user/ShipIt/src/core/content.ts#L206), [src/core/quests.ts:141-144](/home/user/ShipIt/src/core/quests.ts#L141)).
  - After 8 h at 4 taps/s the bot had 322 tasks done and `questBonus` of tap +128%, auto +118%, bug +370% and sprint +340%.
  - After 48 h: tap +464%, auto +434%.
  - Source: instrumented `current` block in `v480_t4.txt` and the `out_bot75_t4_m2880.json` output.

### Inferences
- Stars give a multiplier linear in S, and S per ship grows as cbrt(lines). So one ship's contribution to output scales as about L^(1/3).
- Stars are the only part of the multiplier that keeps scaling. Perks cap at fixed values, achievements cap at +56%, and quest bonuses grow only linearly in play time.

### Gaps
- None for the formulas: all were read directly from source. The `oncall` roll is `rng() < 0.1·oncallLevel` ([src/core/bugs.ts:21](/home/user/ShipIt/src/core/bugs.ts#L21)).

---

## Q3. What does pacing look like over a long session (ship times, stars per ship, run lengths, output growth, when perks max out, when the top producer arrives)?

### Takeaway
The sim bot ships whenever available stars ≥ 75% of current stars ([tests/sim.ts:85-87](/home/user/ShipIt/tests/sim.ts#L85)). Under that rule, each release multiplies stars by about 1.75 and lines by about 5.4. Pacing at 4 taps/s:
- Runs last 5–11 min for releases 1–4, then about 20 min for releases 5–11.
- From release 12 on (about 3 h in), runs grow about 1.3–1.5× per release: 32, 41, 60, 90, 133, 170, 235, 368, 533 and 702 min.
- All perks are maxed at 2.9 h (6.1 h at 1 tap/s).
- The first quantum compiler (the last producer, 1.8T base cost) is affordable at 2.8 h (5.9 h at 1 tap/s).
- From about 4 h on, quantum is reached within about 1 minute of every run, so the rest of each multi-hour run has no new content.

### Cited Findings

**Official simulator, `SIM_MINUTES=480 npm run simulate` (4 taps/s)** — `scratchpad/sim480_t4.txt`
- Ships at minutes 5.4, 10.39, 16.62, 27.87, 44.52, 65.9, 86.95, 110.77, 132.5, 152.22, 174.89, 206.57, 247.99, 307.84 and 398.14.
- Total stars after each of those ships: 1, 2, 4, 7, 16, 34, 65, 119, 216, 389, 688, 1213, 2132, 3740 and 6559.
- Tabs unlock at sprints 0.12 min, todo 0.22 min, ship 2.39 min.
- End state: finalPerSecond 2.89T, finalPerTap 279.87B, lifetime 164.32Qa, 47 achievements, 322 quests, 12 milestones, topUpgrade "quantum", every perk at max.
- The test reports a failure at 480 min: `expected [ 'quantum', 'agents', 'neural' ] to not include 'quantum'` (see Q6).

**Official simulator, `SIM_TAPS=1 SIM_MINUTES=480 npm run simulate`** — `scratchpad/sim480_t1.txt`
- Ships at minutes 11.45, 24.62, 46.09, 67.24, 118.5, 164.17, 210.59, 264.22, 301.94, 334.94, 364.57, 403.9 and 445.35.
- Total stars after each: 1, 2, 4, 7, 16, 34, 65, 119, 216, 385, 683, 1204 and 2116.
- Tabs unlock at sprints 0.49 min, todo 0.96 min, ship 4.34 min.
- End state: finalPerSecond 747.53B, lifetime 5.70Qa, topUpgrade quantum, every perk at max.
- The same assertion failure is reported.

**Per-release table, instrumented bot, 4 taps/s, 48 h** — `scratchpad/sim/out_bot75_t4_m2880.json`, `q_bot75_t4.json`. Abbreviations: ms = milestone stars; base auto peak = automation output with no timed effects, just before the ship; norm = base auto peak ÷ the star multiplier going into the run; ag. / qu. = minutes into the run when the first agent swarm / quantum compiler was owned.

| rel | start min | len min | lines | ship ★ | ms | total ★ | ★ mult | base auto peak | norm | ag. | qu. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 5.4 | 2.01M | 1 | 0 | 1 | 1.1 | 1,371 | 1.37e3 | – | – |
| 2 | 5.4 | 4.98 | 2.00M | 1 | 0 | 2 | 1.2 | 1,542 | 1.40e3 | – | – |
| 3 | 10.39 | 6.23 | 16.01M | 2 | 0 | 4 | 1.4 | 8,205 | 6.84e3 | – | – |
| 4 | 16.62 | 11.25 | 54.52M | 3 | 0 | 7 | 1.7 | 16,483 | 1.18e4 | – | – |
| 5 | 27.87 | 16.65 | 687.43M | 7 | 2 | 16 | 2.6 | 147,592 | 8.68e4 | – | – |
| 6 | 44.52 | 21.38 | 6.86B | 15 | 3 | 34 | 4.4 | 747,267 | 2.87e5 | – | – |
| 7 | 65.9 | 21.05 | 45.84B | 28 | 3 | 65 | 7.5 | 5.02M | 1.14e6 | – | – |
| 8 | 86.95 | 23.82 | 265.48B | 51 | 3 | 119 | 12.9 | 28.08M | 3.74e6 | – | – |
| 9 | 110.77 | 21.73 | 1.62T | 93 | 4 | 216 | 22.6 | 128.37M | 9.95e6 | – | – |
| 10 | 132.5 | 19.72 | 9.69T | 169 | 4 | 389 | 39.9 | 1.14B | 5.04e7 | 7.58 | – |
| 11 | 152.22 | 22.67 | 51.39T | 295 | 4 | 688 | 69.8 | 4.31B | 1.08e8 | 2.2 | 16.23 |
| 12 | 174.89 | 31.68 | 281.23T | 520 | 5 | 1,213 | 122.3 | 24.60B | 3.52e8 | 0.65 | 4.4 |
| 13 | 206.57 | 41.42 | 1.53Qa | 914 | 5 | 2,132 | 214.2 | 105.83B | 8.65e8 | 1.1 | 3.3 |
| 14 | 247.99 | 59.85 | 8.24Qa | 1,603 | 5 | 3,740 | 375 | 350.46B | 1.64e9 | 0.55 | 1.12 |
| 15 | 307.84 | 90.3 | 44.53Qa | 2,813 | 6 | 6,559 | 656.9 | 845.08B | 2.25e9 | 0.25 | 1.1 |
| 16 | 398.14 | 132.82 | 239.44Qa | 4,928 | 6 | 11,493 | 1,150 | 4.12T | 6.27e9 | 0.2 | 0.85 |
| 17 | 530.95 | 170.13 | 1.28Qi | 8,625 | 6 | 20,124 | 2,013 | 10.44T | 9.08e9 | 0.18 | 0.3 |
| 18 | 701.09 | 235.27 | 6.90Qi | 15,110 | 7 | 35,241 | 3,525 | 48.32T | 2.40e10 | 0.18 | 0.25 |
| 19 | 936.35 | 368.15 | 36.97Qi | 26,441 | 7 | 61,689 | 6,170 | 113.79T | 3.23e10 | 0.18 | 0.25 |
| 20 | 1304.5 | 533.48 | 198.15Qi | 46,272 | 7 | 107,968 | 10,797 | 504.46T | 8.18e10 | – | – |
| 21 | 1837.99 | 701.57 | 1.06Sx | 80,983 | 8 | 188,959 | 18,897 | 1.13Qa | 1.05e11 | – | – |

- At the 48 h mark, release 22 was 340 min old, with 80,431 stars available against the 141,726 the bot's rule requires.
- The ratio of lines to the previous release settles at 5.35–5.47 from release 11 on. That is the 1.75³ ≈ 5.36 forced by the 75% rule.
- Relative star growth, ln(S_after/S_before) per minute of run:

| Releases | Growth per minute |
|---|---|
| 2–3 | 11–14% |
| 4–11 | 2.5–5% |
| 12 | 1.79% |
| 13 | 1.36% |
| 14 | 0.94% |
| 15 | 0.62% |
| 16 | 0.42% |
| 17 | 0.33% |
| 18 | 0.24% |
| 19 | 0.15% |
| 20 | 0.10% |
| 21 | 0.08% |

Source: derived from `out_bot75_t4_m2880.json` with a scratch Python script.

**Per-release, 1 tap/s, 24 h** — `scratchpad/sim/out_bot75_t1_m1440.json`, `q_bot75_t1.json`

| Release | Run length (min) |
|---|---|
| 1 | 11.45 |
| 2 | 13.17 |
| 3 | 21.47 |
| 4 | 21.15 |
| 5 | 51.27 |
| 6 | 45.67 |
| 7 | 46.42 |
| 8 | 53.63 |
| 9 | 37.72 |
| 10 | 33.0 |
| 11 | 29.63 |
| 12 | 39.33 |
| 13 | 41.45 |
| 14 | 58.32 |
| 15 | 94.62 |
| 16 | 119.98 |
| 17 | 213.05 |
| 18 | 348.52 |

- Release 18 ended at minute 1,279.84 with 35,165 stars; at 4 taps it ended at 936.35 with 35,241.
- From release 12 on, 1-tap run lengths almost match 4-tap ones. Tapping speed stops mattering for prestige pacing after about 6 h at 1 tap/s, or about 3 h at 4 taps/s.

**Perk max-out times (instrumented)**

| Perk | 4 taps/s (min) | 1 tap/s (min) |
|---|---|---|
| keybindings | 132.5 | 301.94 |
| oncall | 132.52 | 301.95 |
| vimrc | 152.22 | 334.94 |
| team | 152.22 | — |
| retro | 152.24 | — |
| cron | 152.24 | — |
| timeouts | 152.24 | — |
| flow | 152.24 | — |
| bootstrap | 152.25 | — |
| cache | 174.9 | — |
| **all maxed** | **174.9 (2.9 h)** | **364.6 (6.1 h)** |

- Unspent stars at 4 taps/s: 274 after release 11, then 6,146 at 6.6 h, 61,277 at 21.7 h, and 188,548 at 42 h.
- Sources: `v480_t4.txt`, `v1440_t1.txt`, `out_bot75_t4_m2880.json` (`unspent` column).

**Producers (instrumented, first owned, 4 taps/s)**

| Producer | First owned (min) |
|---|---|
| intern | 0.25 |
| vim | 0.64 |
| mon | 1.5 |
| lint | 2.39 |
| snip, ci | 13.74 |
| pair | 33.52 |
| macro | 34.65 |
| gen | 56.94 |
| llm | 62.59 |
| k8s | 86.95 |
| neural | 97.04 |
| agents | 140.09 |
| quantum | 168.45 |

- **First quantum affordable:** 168.45 min (2.8 h, during release 11) at 4 taps/s; 351.3 min (5.9 h) at 1 tap/s. — `v1440_t4.txt`, `v1440_t1.txt` (`firstQuantumAffordableAt`)
- **Time to quantum inside each run (4 taps/s):** 16.2 min in release 11, 4.4 in release 12, 3.3 in release 13, 1.1 in releases 14–15, 0.85 in release 16, then 0.25–0.3 min (15–18 s) from release 17 on. Those later runs last 2.8–6 h. — `q_bot75_t4.json`
- **Packages at the 48 h mark:** quantum 116, agents 139 … kb 287, duck 292. The bot keeps buying copies of the same 16 producers, and every 25 copies doubles one of them. — `out_bot75_t4_m2880.json` (`current.owned`)

**Achievements tied to prestige** ([src/core/achievements.ts:75-83](/home/user/ShipIt/src/core/achievements.ts#L75))
- All of them are done by about 2.2 h at 4 taps/s: ship (v2), semver (v5), lts (v10), stars10, stars50, ricing, perfect and roadmap.
- Derived from the run table: v5 at 27.87 min, 16 stars at 44.52, 65 stars at 86.95, v10 and the first maxed perk at 132.5.
- The bot ends with 47/56 achievements.

### Inferences
- **Run-length phases under the official bot:**
  - Flat, about 20 min per release, while each run unlocks a new producer tier (releases 5–11).
  - Lengthening about ×1.4 per release once quantum is reached (release 12 on).
  - The late lengthening fits stars growing about t^1.4–1.6. Stars ×1.75 per release while run time grows ×1.3–1.56.
- **About "4 h":** releases 11–14 run from about 2.5 h to 5 h of play. That is when the three "flattening" signals appear together: perks maxed, top producer reached, and runs starting to lengthen.

### Gaps
- The bot buys greedily on base output per line and ignores doublings and multipliers ([tests/sim.ts:70-83](/home/user/ShipIt/tests/sim.ts#L70)), so absolute times are bot-specific.
- No offline or idle-session model is included. The `crontab` effects were not measured.

---

## Q4. How does the bonus curve behave: cbrt stars with a linear +10% bonus, compared with in-run producer growth? Do releases get faster or slower?

### Takeaway
One ship's prestige multiplier grows as about 0.1·cbrt(L/2M), roughly L^(1/3). Inside a run, once the producer ladder is exhausted, output grows only about L^0.2: each 25-copy doubling costs ×32.9. Two things follow:
- Under the official "wait for +75% stars" rule, releases get slower after about 3 h.
- The formula strongly rewards shipping often. Splitting a release into k pieces gives k^(2/3) times the stars, and the reset barely costs anything once the multiplier is large.
  - Fixed 1–5 min ship cadences earn 57–114× more stars in 24 h than the official bot.
  - The fixed 1-minute cadence goes from release 1 to v1417.

### Cited Findings

**In-run growth**
- Prices grow ×1.15 per copy ([src/core/content.ts:43](/home/user/ShipIt/src/core/content.ts#L43)). Every 25 copies doubles that package ([src/core/content.ts:45](/home/user/ShipIt/src/core/content.ts#L45), [src/core/economy.ts:12](/home/user/ShipIt/src/core/economy.ts#L12)). `1.15^25 = 32.92`, so each doubling costs about 33× the line spend. The output elasticity from doublings is `ln2/(25·ln1.15) = 0.198`. — `analysis.py` output
- Tier ratios, base cost × and output × to the next tier ([src/core/content.ts:21-38](/home/user/ShipIt/src/core/content.ts#L21); `analysis.py` output):
  - Automation: 16/6, 18.75/5.83, 20/5.71, 23.3/6, 24.3/5.83, 25.9/5.71, 27.3/5.75, 30/5.65.
  - Typing: 16/5, 18.75/5.6, 20/5.71, 23.3/5.62, 25.7/5.56, 27.8/5.6.
  - The README sums this up as "Each tier costs ~20x the last for ~6x the output" ([README.md:28](/home/user/ShipIt/README.md#L28)).
- Quantum copies (with cache.conf at max), cumulative cost → base output ([src/core/economy.ts:69-71](/home/user/ShipIt/src/core/economy.ts#L69); `analysis.py` output):

| Copies | Cumulative cost | Base output |
|---|---|---|
| 1 | 1.26e12 | 1.3e6 |
| 25 | 2.68e14 | 6.5e7 |
| 50 | 9.09e15 | 2.6e8 |
| 100 | 9.86e18 | 2.08e9 |
| 150 | 1.07e22 | 1.25e10 |

  Each further ×1,000 in spend buys only about ×4–6 output.
- Measured: the star-normalized peak automation (base auto peak ÷ star multiplier) grew only ×1.3–2.7 per release from release 14 on, while lines per release grew ×5.4 (table in Q3).

**Prestige growth**
- Under the bot, stars ×1.75 per release while lines ×5.4, which is the cbrt relationship (Q3 table).
- Since the bonus is `1 + 0.1·S`, output from stars also grows about ×1.75 per release.

**Ship-policy experiments** (instrumented, 4 taps/s, 24 h; my own policies, not the official sim) — `scratchpad/sim/out_<policy>_t4_m1440.json`

| ship policy | ships in 24 h | ★ at 2 h | ★ at 4 h | ★ at 8 h | ★ at 12 h | ★ at 24 h | all perks maxed (min) | first quantum affordable (min) |
|---|---|---|---|---|---|---|---|---|
| bot75 (official: avail ≥ 0.75·stars) | 19 | 119 | 1,213 | 6,559 | 20,124 | 61,696 | 174.9 | 168.45 |
| x2 (avail ≥ stars) | 15 | 46 | 832 | 6,734 | 13,484 | 26,986 | 224.8 | 208.04 |
| every 30 min | 47 | 67 | 913 | 15,501 | 66,278 | 567,877 | 210.1 | 220.87 |
| every 20 min | 71 | 111 | 2,223 | 28,886 | 105,476 | 904,246 | 180.07 | 187.6 |
| every 10 min | 143 | 224 | 6,133 | 71,570 | 241,874 | 1,815,380 | 140.05 | 149.94 |
| every 5 min | 287 | 285 | 11,384 | 136,889 | 489,463 | 3,522,699 | 125.44 | 139.77 |
| every 2 min | 714 | 746 | 23,946 | 276,043 | 943,389 | 6,577,669 | 109.05 | 132.14 |
| every 1 min | 1,416 | 1,624 | 41,477 | 376,972 | 1,147,644 | 7,004,030 | 99.47 | 135.17 |
| as soon as 1★ available | 81,478 | 3,117 | 10,780 | 29,313 | 56,096 | 176,347 | 78.55 | never (top producer at end: duck) |

- The 1-minute cadence by the numbers (`out_timer1_t4_m1440.json`):
  - It reaches quantum inside a 1-minute run from about release 151 (173 min).
  - Release 1001 (minute 1,023): 7,215 stars per ship from 751Qa lines.
  - Release 1416: 11,787 stars per ship, a ×700,404 star multiplier, and base automation of 25.83Qa/s. The bot75 run had 220T/s at 24 h.
  - It never completes a milestone after release 1, because sprint and package targets cannot be met in short runs.
- The 5-minute cadence (`q_timer5_t4.json`): quantum is bought 2.2 min into release 31 and 15 s into each run from release 61 on.

**Why frequent shipping wins**
- cbrt concavity: splitting gives k^(2/3) more stars (above).
- Each run is quick to rebuild:
  - The star multiplier applies from the first second.
  - The first star needs only 2M lines, which took 0.02–0.03 min (1–2 s) into each late run (`firstStarAtMin` column in the instrumented output).
  - Bootstrap gives a free doubling of kb and duck.
  - Ship resets sprint cooldowns ([src/core/ship.ts:45](/home/user/ShipIt/src/core/ship.ts#L45)).
  - Active effects persist.
- Fixed-cadence growth fits about S ∝ t^2.6 (timer1: 1.148M stars at 12 h, 7.0M at 24 h, ratio 6.1). bot75 fits about t^1.6 (20,124 at 12 h, 61,696 at 24 h, ratio 3.07). — `out_timer1_t4_m1440.json`, `out_bot75_t4_m1440.json`

### Inferences
- **Faster, slower or flat?**
  - Under the official bot, releases are flat at about 20 min while new tiers unlock (up to about 2.9 h at 4 taps/s), then get steadily slower, about ×1.3–1.56 per release.
  - Under any fixed cadence, run length is constant by construction, but stars per ship keep rising (timer1: 87 at 2 h, 1,117 at 5.4 h, 11,787 at 24 h).
- **Concavity:** concave star gain combined with an uncapped linear bonus does not produce diminishing returns in practice. It produces exponential-then-polynomial growth with no ceiling, and makes "prestige spam" the dominant strategy.
- **No reason to wait:** the 75% threshold in `tests/sim.ts` is a modelling assumption ("players usually wait for a meaningful jump"; [tests/sim.ts:86](/home/user/ShipIt/tests/sim.ts#L86)). The game rewards the opposite.
- **Pacing may be understated:** the current pacing claims and tests describe the slower policy. A min-maxing player outpaces them by about two orders of magnitude in stars within a day.

### Gaps
- The cadence experiments assume ships cost no real time. The UI needs two clicks within 4 s plus a skippable splash of about 2.5 s. Production keeps ticking during the splash, since only spawns pause ([src/ui/app.ts:216](/home/user/ShipIt/src/ui/app.ts#L216), [src/core/game.ts:49-51](/home/user/ShipIt/src/core/game.ts#L49)). So I would expect a 1–2 min human cadence to come close to these numbers, but this was not measured with a human.
- I did not search for the true optimal policy. My "rate" and "lograte" heuristics, which ship when stars per minute peaks locally, collapsed into 3 s runs and got 1.47–1.48M stars in 24 h. That is worse than the 1-minute cadence, so the optimum is around a 1–2 min cadence at this stage.

---

## Q5. Which prestige-adjacent systems could serve as hooks?

### Takeaway
Several systems already touch releases: the per-release milestone in TODO.md, release-number achievements, `bootstrap.sh`, the sprint backlog reset on ship, persistent scripts and effects, the streak, and the "v{n}.0" version label. All are thin and stop scaling early. The milestone's quadratic targets and small star payouts become irrelevant by about release 8, and the minor version digit is always ".0".

### Cited Findings

**Release milestone (TODO.md, "## v{r}.0 milestone +k stars")**
- Formula: see Q2. — [src/core/quests.ts:176-214](/home/user/ShipIt/src/core/quests.ts#L176), [src/ui/panels/todo.ts:41-48](/home/user/ShipIt/src/ui/panels/todo.ts#L41)
- The game creates it at construction if missing or stale, and re-creates it on each ship. — [src/core/game.ts:82](/home/user/ShipIt/src/core/game.ts#L82), [src/core/ship.ts:46](/home/user/ShipIt/src/core/ship.ts#L46)
- The game checks it every tick. — [src/core/game.ts:282-283](/home/user/ShipIt/src/core/game.ts#L282)
- Completion logs "v{r}.0 milestone complete, +k stars". — [src/ui/messages.ts:69-70](/home/user/ShipIt/src/ui/messages.ts#L69)
- Under bot75 over 24 h: 15 of 19 milestones done, worth 70 stars in total against 61,619 ship stars (0.11%). Release 15's lines target was 3.6e9 against 4.45e16 actually written. — `out_bot75_t4_m1440.json`; targets from `analysis.py`
- Under fixed cadences of 5 min or less: 0 milestones completed. — `out_timer*_t4_m1440.json`

**Achievements**
- Release and star achievements stop at v10, 50 stars and "max one perk" ([src/core/achievements.ts:77-83](/home/user/ShipIt/src/core/achievements.ts#L77)). The bot clears them by about 2.2 h at 4 taps/s (Q3).
- Lifetime-line achievements stop at 1T, "heat", which the bot passed between minute 120 (554.46B) and minute 130 (1.54T) ([src/core/achievements.ts:36](/home/user/ShipIt/src/core/achievements.ts#L36); timeline in `sim480_t4.txt`).
- Rate achievements stop at 1M/s, "lightsout" ([src/core/achievements.ts:42](/home/user/ShipIt/src/core/achievements.ts#L42)).
- Each achievement is +1% global output ([src/core/economy.ts:21](/home/user/ShipIt/src/core/economy.ts#L21)).

**Commit streak**
- The first session each day pays `max(200, 600 s of automation)` lines, plus turbo.sh every 3rd day and sudo.sh every 7th. These lines also count toward `thisRelease`. — [src/core/streak.ts:28-39](/home/user/ShipIt/src/core/streak.ts#L28), [src/core/content.ts:215-221](/home/user/ShipIt/src/core/content.ts#L215)
- Achievements standup (3 days) and green (7 days). — [src/core/achievements.ts:84-85](/home/user/ShipIt/src/core/achievements.ts#L84)
- The streak has no link to releases or stars.

**`bootstrap.sh`**
- At most 25 kb and 25 duck at the start of each release. — [src/core/ship.ts:40-42](/home/user/ShipIt/src/core/ship.ts#L40), [src/core/content.ts:114](/home/user/ShipIt/src/core/content.ts#L114)
- That is 50 base lines per tap or per second before multipliers. Its value fades quickly: first stars arrive 1–2 s into late runs anyway.

**Sprints**
- Ship regenerates the backlog with all cooldowns cleared ([src/core/ship.ts:45](/home/user/ShipIt/src/core/ship.ts#L45), [src/core/sprints.ts:39-42](/home/user/ShipIt/src/core/sprints.ts#L39)). Tier cooldowns are 60, 150 and 420 s ([src/core/content.ts:146-150](/home/user/ShipIt/src/core/content.ts#L146)).
- Ticket targets and rewards scale with current output ([src/core/sprints.ts:22-36](/home/user/ShipIt/src/core/sprints.ts#L22)).
- The `retro` and `timeouts` perks modify sprints.

**~/bin scripts and timed effects**
- The inventory and running effects persist across a ship ([src/core/ship.ts:32-48](/home/user/ShipIt/src/core/ship.ts#L32) does not touch them; [src/core/effects.ts:25-32](/home/user/ShipIt/src/core/effects.ts#L25)).
- Effects available: turbo ×2 tap for 60 s, nightly ×2 auto for 120 s, autotype 4 taps/s for 45 s, sudo +15% crit for 45 s, coffee ×3 all for 20 s. — [src/core/content.ts:79-85](/home/user/ShipIt/src/core/content.ts#L79)

**Version number**
- `release` starts at 1 ([src/core/state.ts:110](/home/user/ShipIt/src/core/state.ts#L110)) and goes up 1 per ship ([src/core/ship.ts:37](/home/user/ShipIt/src/core/ship.ts#L37)).
- It is always shown as `v{release}.0` in the header, the PR title, the merge splash, the milestone, the log and the save-loaded message ([src/ui/header.ts:49](/home/user/ShipIt/src/ui/header.ts#L49), [src/ui/panels/ship.ts:55-58](/home/user/ShipIt/src/ui/panels/ship.ts#L55), [src/ui/merge.ts:35](/home/user/ShipIt/src/ui/merge.ts#L35), [src/ui/app.ts:121](/home/user/ShipIt/src/ui/app.ts#L121)).
- The minor and patch digits are never used.
- `release` also scales TODO "tap N times" targets by `1 + 0.25·(release−1)`. — [src/core/quests.ts:39](/home/user/ShipIt/src/core/quests.ts#L39), [src/core/quests.ts:45](/home/user/ShipIt/src/core/quests.ts#L45)

**TODO quest bonuses**
- Permanent and unbounded (Q2); they survive ships and are not tied to releases. — [src/core/quests.ts:141-172](/home/user/ShipIt/src/core/quests.ts#L141)

**Offline (`crontab`)**
- 25% of automation for up to 2 h by default. It credits `thisRelease`, so offline time also builds the next ship. — [src/core/content.ts:198-204](/home/user/ShipIt/src/core/content.ts#L198), [src/core/game.ts:220-231](/home/user/ShipIt/src/core/game.ts#L220)

**Dev tools**
- Dev mode has a "stars" action that adds 5 stars. — [src/core/dev.ts](/home/user/ShipIt/src/core/dev.ts) (`case 'stars': s.stars += 5`)

### Inferences
- The milestone is the only per-release objective. Its lines target grows quadratically (16M·r²) while actual release output grows exponentially, so it becomes a free bonus or a no-op. Under frequent shipping its sprint and package targets become unreachable.
- Nothing rewards a release by its number beyond v10, and the ".0" minor version is unused presentation space.

### Gaps
- No design docs or TODO comments in the repo describe planned prestige features (searched README, source and tests). The only design statements are the README table and code comments.

---

## Q6. Which tests and save-format rules constrain any change to prestige?

### Takeaway
Six tests and rules bound a prestige change:
- **Pacing test bounds:** `tests/pacing.test.ts` requires sprints < 2 min, todo < 4 min, first ship between minute 5 and 35, at least 3 ships in 120 min, and no top-3 producer at the end of a ≥120-min run.
  - The first-ship bound has only 0.4 min of slack at 4 taps/s: the first ship lands at 5.4 min.
  - The top-producer check makes any `SIM_MINUTES ≥ 240` printed run report a failure.
- **Ship unit tests** pin the 2M-lines first star and the 16M → 2 stars cube rule.
- **Save version:** the save format is at `SAVE_VERSION = 2`, with a migration chain.
- **Unknown perks dropped:** perk ids not in `PERKS` are dropped on load.
- **Integer stars:** stars, starsSpent and release are parsed as integers.
- **Lifetime as progress:** cloud and device save arbitration measures progress by `lifetime`, so any new layer that resets `lifetime` would be treated as lost progress.

### Cited Findings

**`tests/pacing.test.ts`** — [tests/pacing.test.ts:11-33](/home/user/ShipIt/tests/pacing.test.ts#L11)
- Options: `SIM_MINUTES` (default 120), `SIM_TAPS` (default 4), and verbose output when `SIM_MINUTES` is set.
- Assertions:
  - `unlocks.sprints < 2` and `unlocks.todo < 4`.
  - `ships.length > 0`.
  - `5 < ships[0].minute < 35`.
  - When minutes ≥ 120: `ships.length ≥ 3` and `topUpgrade ∉ {quantum, agents, neural}`.
- `npm run simulate` defaults to 240 minutes ([package.json](/home/user/ShipIt/package.json), `"simulate": "SIM_MINUTES=${SIM_MINUTES:-240} vitest run tests/pacing.test.ts"`). The bot owns agents by 140 min and quantum by 168 min (Q3), so a plain `npm run simulate` already trips the top-producer assertion. Verified: `npm run simulate` gives `× plays 240 minutes at 4 taps/s within bounds` with `AssertionError: expected [ 'quantum', 'agents', 'neural' ] to not include 'quantum'`. Both 480-min runs report the same failure.
- Measured margins:
  - The default 120-min test passes at 4 taps/s and at 1 tap/s: `npx vitest run tests/pacing.test.ts` gives "1 passed", and the same with `SIM_TAPS=1`.
  - First ship at 5.4 min at 4 taps/s against the > 5 bound; 11.45 min at 1 tap/s.
  - Agents first owned at 140.09 min, against the 120-min end-of-test check.
- `README.md:44` says "at 4 taps a second the first ship lands around 6 minutes, then every 5–20 minutes; at 1 tap a second, around 14 minutes". The sim now gives 5.4 and 11.45 min, and runs reach 32–90+ min after release 11. The README is slightly stale. — [README.md:44](/home/user/ShipIt/README.md#L44)

**Unit tests**
- Ship thresholds and reset ([tests/game.test.ts:296-315](/home/user/ShipIt/tests/game.test.ts#L296)).
- Bootstrap ([tests/game.test.ts:317-324](/home/user/ShipIt/tests/game.test.ts#L317)).
- Spending doesn't lower the bonus ([tests/game.test.ts:96-108](/home/user/ShipIt/tests/game.test.ts#L96)).
- Milestone awards stars ([tests/game.test.ts:270-279](/home/user/ShipIt/tests/game.test.ts#L270)).
- 5 stars → ×1.5 automation ([tests/economy.test.ts:58-72](/home/user/ShipIt/tests/economy.test.ts#L58)).
- Save round-trip of stars, starsSpent, perks, release and milestone ([tests/save.test.ts:12-48](/home/user/ShipIt/tests/save.test.ts#L12)).
- `hl` colours "+3 stars" and "+30%" ([tests/hl.test.ts:29](/home/user/ShipIt/tests/hl.test.ts#L29)).

**Save format**
- `SAVE_VERSION = 2`. `MIGRATIONS[n]` turns a vN save into vN+1; the only one is 1→2. — [src/core/save.ts:19](/home/user/ShipIt/src/core/save.ts#L19), [src/core/save.ts:26-36](/home/user/ShipIt/src/core/save.ts#L26)
- Saves newer than `SAVE_VERSION` are rejected, and a missing migration makes the load fail. — [src/core/save.ts:158-164](/home/user/ShipIt/src/core/save.ts#L158)
- `deserialize` rebuilds the state field by field from `newGame()` defaults ([src/core/save.ts:166-202](/home/user/ShipIt/src/core/save.ts#L166)):
  - Unknown raw fields are dropped.
  - `stars` and `starsSpent` go through `int()`, which floors and requires a finite number. — lines 78, 180-181
  - `perks` is filtered to known `PERKS` ids. — line 182
  - `release` is at least 1. — line 183
  - The milestone task kind is limited to `lines`, `owned` or `sprints`. — lines 118-124
- So any new prestige field needs both a parse line here and a version bump with a migration, per the README rule. — [README.md:86](/home/user/ShipIt/README.md#L86)

**Save arbitration**
- `src/platform/saves.ts` compares saves only by `savedAt`, `lifetime` and `release`.
- A save with lower `lifetime` than the one it replaces is kept as a backup. "Best of two" picks the higher `lifetime`.
- Source: [src/platform/saves.ts:14-19](/home/user/ShipIt/src/platform/saves.ts#L14), [src/platform/saves.ts:76](/home/user/ShipIt/src/platform/saves.ts#L76), [src/platform/saves.ts:210](/home/user/ShipIt/src/platform/saves.ts#L210), [src/platform/saves.ts:228](/home/user/ShipIt/src/platform/saves.ts#L228), [src/platform/saves.ts:276-282](/home/user/ShipIt/src/platform/saves.ts#L276)
- The cloud body also stores `release` and `lifetime`. — [src/platform/saves.ts:321-325](/home/user/ShipIt/src/platform/saves.ts#L321)

**Number types**
- `stars` and `release` are plain JS numbers; lines are `Decimal`.
- `starsAvailable` converts with `.toNumber()` before `cbrt` ([src/core/ship.ts:12](/home/user/ShipIt/src/core/ship.ts#L12)), and the star term is built with `D(1 + 0.1*s.stars)` ([src/core/economy.ts:20](/home/user/ShipIt/src/core/economy.ts#L20)).

### Inferences
- **Test slack:** buffing early prestige will likely break `ships[0].minute > 5`. Making prestige faster in general will likely trip the top-producer check. Any redesign probably needs to update these bounds, and possibly the bot's ship rule in `tests/sim.ts:85-88`.
- **Save compatibility:** a second prestige layer that resets `lifetime` would conflict with the backup and newest-wins logic in `platform/saves.ts`. Keeping `lifetime` monotonic avoids that.
- **Number overflow (not reached in my runs):** once `thisRelease` passes about 1.8e308, `toNumber()` gives Infinity. Stars would become Infinity, and `int()` would load them back as 0. The largest `thisRelease` I observed was about 1.06e21 at 42 h.

### Gaps
- I did not check whether the README's "every 5–20 minutes" was accurate at some earlier commit; git history shows only 8 commits.

---

## Q7. What weaknesses show up over long play?

### Takeaway
Seven measured weaknesses stand out:
- The intended cadence of "wait for a big jump" is strongly dominated by shipping every 1–5 minutes.
- Perks max out at 419 stars, which takes 2.9 h at 4 taps/s, leaving a growing pile of unspendable stars.
- Content runs out around 3–4 h: quantum is reached within about 1 minute of each run, and runs lengthen ×1.4 per release under the official bot.
- Single stars become meaningless once there are hundreds to thousands of them.
- Milestones and prestige achievements stop scaling early.
- Tapping stops mattering for prestige pacing after the first few hours.
- The number formatting for stars is not built for the values that actually occur.

### Cited Findings
1. **Prestige spam is optimal.** Shipping on a fixed 1-minute timer earns 7,004,030 stars in 24 h, against 61,696 for the official bot rule (×114). A 5-minute timer earns 3,522,699 (×57); even 30 minutes earns 567,877 (×9.2). — Q4 table, `out_timer*_t4_m1440.json`
   - Cause: cbrt is concave, so splitting gives k^(2/3) more stars. The first star costs 2M lines, which a late run produces in 1–2 s. A ship resets the sprint cooldowns, and effects persist. — [src/core/ship.ts:12](/home/user/ShipIt/src/core/ship.ts#L12), [src/core/ship.ts:45](/home/user/ShipIt/src/core/ship.ts#L45)
2. **Perks max early, and stars then pile up.** All 419 stars' worth of perks are bought by minute 174.9 at 4 taps/s (364.6 at 1 tap/s; 99.5 under the 1-minute cadence). After that, unspent stars reach 6,146 at 6.6 h, 61,277 at 21.7 h and 188,548 at 42 h. The `~/dotfiles` "stars to spend" counter grows forever with nothing to buy. — `v480_t4.txt`, `out_bot75_t4_m2880.json`, [src/ui/panels/ship.ts:34](/home/user/ShipIt/src/ui/panels/ship.ts#L34)
3. **Content runs out.**
   - The last producer is first affordable at 2.8 h (4 taps/s) or 5.9 h (1 tap/s).
   - From release 14 (about 4.1 h at 4 taps/s) the whole 16-producer ladder is climbed in about 1 min, and from release 17 in 15–18 s.
   - Meanwhile runs last 1–12 h, spent buying more copies of the same packages, with a doubling every 25 copies at ×32.9 cost.
   - Source: Q3, `q_bot75_t4.json`.
4. **Releases slow down.** Under the official rule, run length goes 22.7 → 31.7 → 41.4 → 59.9 → 90.3 → 132.8 → 170.1 → 235.3 → 368.2 → 533.5 → 701.6 min for releases 11–21. Relative star growth per minute falls from about 3%/min (releases 7–11) to 0.08%/min (release 21). — `out_bot75_t4_m2880.json`
5. **Individual stars stop mattering.**
   - The marginal output gain per star is 0.91% at 100 stars, 0.1% at 1,000, and 0.015% at 6,559 (Q2).
   - The star achievements stop at 50 stars, and stars have no other use after the perks are maxed.
   - Only the ratio to current stars matters, so the UI's "+1 star" framing and the "needs X more lines for first star" bar lose meaning. Late-game "next ★ at" thresholds are nanoseconds apart in relative terms. — [src/ui/panels/ship.ts:94](/home/user/ShipIt/src/ui/panels/ship.ts#L94)
6. **Milestones and achievements don't scale.**
   - Milestone stars `1 + floor(r/3)` were 0.11% of stars over 24 h under the bot, and its lines target (16M·r²) is trivially passed.
   - Under fast cadences, milestones become impossible: they need `2 + floor(r/2)` sprints and `30 + 15(r−1)` packages within one release.
   - The release and star achievements end at v10 and 50 stars, cleared by about 2.2 h.
   - Source: Q5.
7. **Tapping stops mattering.** 1-tap/s and 4-tap/s runs converge from release about 12: run lengths 39.3 vs 31.7, 41.5 vs 41.4, 58.3 vs 59.9 min for releases 12–14. — `out_bot75_t1_m1440.json` vs `out_bot75_t4_m1440.json`
8. **Display issues at real values.**
   - The header and the neofetch block print raw star integers, for example "7004030 stars" under the 1-minute cadence. — [src/ui/header.ts:49](/home/user/ShipIt/src/ui/header.ts#L49), [src/ui/panels/ship.ts:79](/home/user/ShipIt/src/ui/panels/ship.ts#L79)
   - The diff shows `outputBonus = 700403.00`. — [src/ui/panels/ship.ts:11](/home/user/ShipIt/src/ui/panels/ship.ts#L11)
   - The release label reaches v1417.0 in 24 h under the 1-minute cadence.
9. **The pacing harness hides weakness 1.** The bot's 75% rule ([tests/sim.ts:86-87](/home/user/ShipIt/tests/sim.ts#L86)) is the only ship policy tested. The README pacing claims rest on it. — [README.md:44](/home/user/ShipIt/README.md#L44)
10. **Quest bonuses are an unplanned second permanent layer.** TODO tasks give additive, unbounded bonuses that persist across releases: tap +464% and auto +434% after 48 h at 4 taps/s. The Ship panel's caveat mentions them ("TODO bonuses carry over"), but they are not part of the prestige economy. — Q2, [src/ui/panels/ship.ts:70](/home/user/ShipIt/src/ui/panels/ship.ts#L70)

### Inferences
- Weaknesses 1–5 have one root cause: an uncapped linear star bonus combined with a concave, per-release star formula and a short, fixed producer ladder. With few permanent sinks, stars grow without bound while there is less and less to spend them on or unlock.
- These observations come from deterministic bots with one seed each (seeds 7 and 1007). Absolute minutes vary with play style, but the ordering of policies (cadence ≫ bot75) is large enough that seed noise would not change it.

### Gaps
- I ran no human playtest and checked no other seeds.
- I did not model offline play, which credits `thisRelease` at up to 75% for up to 7 h. It would favour long offline gaps followed by a ship, which these sims do not cover.
