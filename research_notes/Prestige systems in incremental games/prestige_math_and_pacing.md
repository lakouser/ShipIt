# Prestige (reset) systems in incremental games: mathematics and pacing

**Research method and source reliability (read first).** This session's network allowed GitHub but blocked most web hosts: blog.kongregate.com, the Fandom wikis, gamedeveloper.com and gdcvault returned DNS failures to WebFetch. Two tiers of evidence follow:
- **Tier A (primary, high confidence):** formulas read directly from the source code of open-source games, cloned from GitHub in November 2026. These are Antimatter Dimensions, Synergism, Trimps, Kittens Game, The Modding Tree (the engine behind The Prestige Tree), and a GitHub mirror of Cookie Clicker's `main.js`. Links point to the file and line.
- **Tier B (secondary, medium to low confidence):** formulas and quotes seen only through web-search result summaries of pages that could not be opened. These include the Kongregate/Pecorella articles, fan wikis, Steam threads and calculator sites. Each is marked "(via search summary)". Check them before relying on them.

---

## 1. Formulas that convert run progress into prestige currency

### Takeaway
Almost every major game uses a power law with a small exponent, `gain = floor((X / threshold)^k)`. The exponent k is usually 1/2 or 1/3, and drops to 0.01–0.03 or even 1/308 for deep layers. A few games use an inverse-triangular formula (≈ square root), a "1 per N units" count of something that is already logarithmic in currency (Clicker Heroes), or a linear surplus over a threshold (Kittens). The key structural choice is **what X measures**: the current run (AD, Synergism, Ship It), the lifetime total (Cookie Clicker, AdVenture Capitalist), or drops collected during the run (Trimps).

### Cited Findings

**Cookie Clicker (lifetime-based cube root). Tier A.**
- Code: `Game.HCfactor=3; Game.HowMuchPrestige=function(cookies){return Math.pow(cookies/1000000000000,1/Game.HCfactor);}`. So **prestige level = floor(cbrt(all-time cookies baked / 1e12))**. The inverse `HowManyCookiesReset(chips) = chips^3 × 1e12` is also in the code — [main.js L4185–4193](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L4185)
- The input is cumulative: `Game.prestige=Math.floor(Game.HowMuchPrestige(Game.cookiesReset))`, and on ascend `HowMuchPrestige(Game.cookiesReset+cookiesForfeited)`. New levels from a run are therefore `floor(cbrt((lifetime+run)/1e12)) − current level` — [main.js L3483, L4199](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L4199)
- Resulting numbers: level 1 at 1e12 cookies, level 100 at 1e18, level 1,000 at 1e21. The marginal cost of the next level is ≈ 3P² × 1e12 (derived from the formula above).
- A code comment shows an older version had a different formula (`if (version<1.05) {Game.heavenlyChipsEarned=Game.HowMuchPrestige(...)}`), but the old formula is not in the current file — [main.js L3254](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L3254)

**AdVenture Capitalist (lifetime-based square root). Tier B.**
- Pecorella's Part III gives **angels = 150 × sqrt(lifetime earnings / 1e15)** (via search summary) — [The Math of Idle Games, Part III (Game Developer)](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii); mirror at [sirpinski.com](https://www.sirpinski.com/the-math-of-idle-games-part-iii/)
- Players report thresholds of 44.444B lifetime earnings for the 1st angel, 177.78B for the 2nd and 400B for the 3rd, consistent with 150·sqrt(L/1e15) (via search summary of Steam threads; the specific thread was not confirmed) — [Steam AdCap discussions](https://steamcommunity.com/app/346900/discussions/0/364039531219683031)
- Pecorella was lead producer of the mobile version (via search summary) — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)

**Antimatter Dimensions (per-run, effectively logarithmic, three nested layers). Tier A.**
- **Infinity Points** after Break Infinity: `IP = floor(10^(log10(maxAM_thisInfinity)/div − 0.75) × totalIPMult)`, with `div = min(308, Achievement 103, Time Study 111)`. Equivalent to **IP ≈ AM^(1/308) / 10^0.75**. Before Break Infinity, a crunch gives a fixed `308/div` = 1 IP × multipliers — [src/game.js L89–123](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L89)
- **Eternity Points:** `EP = floor(5^(log10(maxIP_thisEternity + gainedIP)/308 − 0.7) × totalEPMult)`. This is ≈ IP^(log10(5)/308) ≈ IP^0.00227. The first EP needs `10^(308 × 0.7)` IP, clamped to at least Number.MAX_VALUE (1.8e308) — [src/game.js L138–159](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L138)
- **Reality Machines:** `RM = floor(1000^(log10(EP)/4000 − 1) × mult)`. A linear patch `27/4000·log10(EP) − 26` applies when 1 ≤ RM < 10, so early RM gains are not tiny. Before Reality is unlocked, log10(EP) above 6000 is reduced by 75% and capped at 8000. RM is hard-capped at 1e1000, and excess converts to a new currency (Imaginary Machines) — [src/core/machines.js L1–35](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/machines.js#L19)
- During challenges the gain is raised to a power (Teresa ^0.55, V ^0.5) to cut it — [src/game.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L109)

**Synergism (per-run power laws with an upgradable exponent). Tier A.**
- Diamonds (prestige): `floor((coinsThisPrestige / 1e12)^(0.5 + challenge5Completions/100))`. The exponent rises from 0.5 as the player completes challenges — [src/Synergism.ts L2998–3008](https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Synergism.ts#L2998)
- Mythos (transcension): `floor((coinsThisTranscension / 1e100)^0.03)` — [Synergism.ts L3026–3030](https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Synergism.ts#L3026)
- Particles (reincarnation): `floor((transcendShards / 1e300)^0.01)` — [Synergism.ts L3041–3047](https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Synergism.ts#L3041)

**The Modding Tree / The Prestige Tree (the template most hobby incrementals use). Tier A.**
- "Normal" layer: `gain = floor(((baseAmount/requires)^exponent × gainMult)^gainExp)`. Default `exponent: 0.5` ("Prestige currency exponent") — [js/game.js L10–30](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/game.js#L10), [js/layers.js L15](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/layers.js#L15)
- Built-in softcap: past `softcap` (default e1e7), `gain = gain^softcapPower × softcap^(1−softcapPower)`, with default softcapPower 0.5 — [js/game.js](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/game.js#L27), [js/technical/layerSupport.js L188–189](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/technical/layerSupport.js#L188)
- "Static" layer (one point per rising threshold): the n-th point costs `requires × base^(n^exponent / gainExp) × gainMult`, so each point costs exponentially more — [js/game.js L52–59](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/game.js#L52)

**Trimps (helium dropped during the run, banked on portal). Tier A.**
- `rewardResource("helium", base, level)`: `lvl = max(0, 1.35 × round((level − 1900)/100))`, then `amt = base × (1.23^sqrt(lvl) + lvl)`. After that come multipliers from Looting perks, `(1 + totalSquaredReward/1000)`, spire rows and others — [main.js L4151–4241](https://github.com/Trimps/Trimps.github.io/blob/master/main.js#L4151)
- Base amount: Blimp kills give base 1 (×3 in the Domination challenge). Improbability at zone 59+ gives base 5, raised to 10 once Corruption starts (1 in Universe 2) — [config.js L8865–8869, L9289–9301](https://github.com/Trimps/Trimps.github.io/blob/master/config.js#L8865)

**Kittens Game (linear surplus over a threshold, plus inverse-triangular karma). Tier A.**
- Paragon on reset: `if (kittens > 70) paragonPoints = kittens − 70` — [game.js L5547–5549](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js#L5547)
- Karma: `karmaKittens += kittens − 35` when kittens > 35 (kittens doubled under Anarchy). Then `karma = getUnlimitedDR(karmaKittens, 5)` with `getUnlimitedDR(v, stripe) = (sqrt(1 + 8·v/stripe) − 1)/2`, the inverse triangular number. Karma n therefore needs 5·n(n+1)/2 karma-kittens — [game.js L5471–5480, L5892–5897, L6255](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js#L5892)

**Realm Grinder (triangular, ≈ square root). Tier B.**
- Wiki: "Gems to Coins Formula: n(n+1)·5E11 where n is gems", i.e. n gems need 1e12 × n(n+1)/2 coins (via search summary) — [Realm Grinder wiki: Abdication](https://realm-grinder.fandom.com/wiki/Abdication). Inverting gives gems = floor((sqrt(1 + 8·coins/1e12) − 1)/2) ≈ sqrt(2·coins/1e12).

**Clicker Heroes ("1 per N", where N counts logarithmic purchases). Tier B.**
- "For every 2000 hero levels across all heroes, you get a single Hero Soul for your next ascension" (via search summary) — [Clicker Heroes wiki: Hero Souls](https://clickerheroes.fandom.com/wiki/Hero_Souls); same rate in [Coolmath guide](https://www.coolmathgames.com/clicker-heroes-tips-tricks-guide)
- Primal boss souls (formula label uncertain on the wiki page): `floor((((level − 100)/5 + 4)/5)^1.3 × bonus)` (via search summary) — [Hero Souls wiki](https://clickerheroes.fandom.com/wiki/Hero_Souls)
- Pecorella's GDC Europe 2016 slides note Clicker Heroes gives "one prestige currency for every 2000 generators owned" (via search summary) — [Quest for Progress slides (GDC Vault PDF)](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)

**Egg, Inc. Tier B, low confidence.**
- A community calculator models new Soul Eggs ≈ (farm value / 1,000,000)^0.21 × Soul-Food/Prestige-Bonus/boost multipliers (via search summary; not an official source) — [everycalculators Egg Inc prestige calculator](https://everycalculators.com/egg-inc-prestige-calculator.html)

**General template claim (low-quality source).**
- One overview article says `prestigeCurrency = lifetimeEarnings^exponent × multiplier`, with exponents "typically between 0.5 and 0.8" (via search summary; generic Medium post) — [Medium: Clicker Games architecture](https://medium.com/@tommcfly2025/clicker-games-a-technical-exploration-of-incremental-system-architecture-b6d842e6963e)

### Inferences
- **Three families of input variable, with different incentives:**
  1. *Per-run* (AD, Synergism, The Modding Tree, Ship It): each reset's gain is independent, so the same reset point always pays the same amount. Repeated minimum-threshold resets stay viable forever unless something else prevents them.
  2. *Lifetime-cumulative* (Cookie Clicker, AdCap): total = f(lifetime), so the same reset point pays less each time (f′ falls). This automatically lengthens runs as the player progresses and makes spam-resetting self-defeating.
  3. *Max-ever / record-based* (Pecorella's sqrt-of-max example, §4): a reset pays nothing unless the player beats their record.
- How much more progress doubles the gain: sqrt needs 4× more, cbrt 8×, exponent 0.21 about 27×, Synergism Mythos (0.03) about 10^10×, AD IP (1/308) about 10^92.7×. Very small exponents make the gain effectively log(X). That only works because X grows exponentially (AD's antimatter grows at double-exponential speed).
- Ship It's `floor(cbrt(lines_run / 2e6))` belongs to the per-run, cube-root family. Thresholds: 1★ at 2M lines, 2★ at 16M, 3★ at 54M, 5★ at 250M, 10★ at 2B, 20★ at 16B, 50★ at 250B, 100★ at 2T. Because it is per-run, the 1-star reset at 2M lines is always available and becomes faster as the multiplier grows (see §3, §7).
- Triangular formulas (Realm Grinder, Kittens karma) behave like sqrt(2x) but give an integer schedule (1, 3, 6, 10…) that is easy to explain as "each next point costs one more unit than the last".

### Gaps
- Not verified this session (wikis and gamedeveloper.com blocked; recall not used as evidence): Clicker Heroes post-1.0 / Transcendence (Ancient Souls) formula; Realm Grinder base %/gem; NGU Idle rebirth formulas; Idle Champions (it uses favor and blacksmith contracts, not a single conversion formula); Exponential Idle. A Fandom search snippet gave `⌊a(l−1)e^(a(l−1)/200)+1⌋` "where l is the level being bought" on an Exponential Idle "Instructions" page ([source](https://exponential-idle.fandom.com/wiki/Instructions)). It is unclear which game or mechanic this describes, so it is excluded.
- Egg Inc's official Soul Egg gain formula was not found from a reliable source. Only a calculator approximation exists.
- Cookie Clicker's pre-v2.0 heavenly chip formula (widely recalled as triangular, with 1e12 × n(n+1)/2 cookies per n chips and +2% each) could not be confirmed from a source in this session.

---

## 2. How the prestige bonus is applied, and additive vs multiplicative consequences

### Takeaway
The dominant pattern is **additive-linear per point** (Cookie Clicker +1%, AdCap +2%, Egg Inc Soul Eggs +10%, Kittens paragon +1% with a cap). It is often combined with a **spend shop** (Cookie Clicker heavenly chips, AD Infinity Point upgrades, Trimps perks). True compounding per point is used only where currency gain is decoupled from boosted output, as with Egg Inc Prophecy Eggs. Additive-linear bonuses give polynomial long-term growth and a steadily shrinking per-point feel (+1 point = +0.1/(1+0.1S) relative). Multiplicative per-point bonuses fed back into a root-of-output formula run away.

### Cited Findings
- **Cookie Clicker:** `mult += prestige × 0.01 × heavenlyPower × GetHeavenlyMultiplier()`, with `heavenlyPower = 1` ("how many CpS percents a single heavenly chip gives"). That is +1% CpS per prestige level, added to the multiplier and scaled by a "potential" percentage that heavenly upgrades unlock (UI: "at %1% of its potential (+%2% CpS)") — [main.js L5147, L5175, L7188](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L5175)
- Cookie Clicker separates the passive bonus from the spendable currency. Ascension grants "%1 prestige levels (+%2% CpS) and %3 heavenly chips to spend". Spending chips in the heavenly shop does not lower prestige level or its CpS bonus — [main.js L16959](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L16959)
- **AdVenture Capitalist:** each angel boosts earnings by 2% (via search summary of a fan guide/Steam). Angels can also be sacrificed for angel upgrades, so spending reduces the passive bonus — [Steam AdCap discussion](https://steamcommunity.com/app/346900/discussions/0/530646080848417973)
- **Egg, Inc.:** Earnings Bonus ≈ Soul Eggs × per-SE bonus (base 10%) × (per-PE factor)^(Prophecy Eggs). The PE factor is 1.05 raised by research; the wiki notes the PE multiplier "grows very quickly because it compounds" (via search summary) — [Egg Inc wiki: Earnings Bonus/Eggs of Prophecy](https://egg-inc.fandom.com/wiki/Earnings_Bonus/Eggs_of_Prophecy); [wamohdog prestige guide](https://wamohdog.com/prestige-guide/). Sources disagree on the PE factor before artifacts: 1.05 plus research (wiki) vs "1.05–1.10" ([jzr blog](https://jzr.uz/blog/egg-inc-mystical-eggs-math)).
- **Kittens Game paragon:** production bonus = `getLimitedDR(paragon × 0.01 × ratio, 2 × ratio)`, i.e. +1% production per paragon, linear up to 75% of the 200% limit (150 paragon). Beyond that, `(1 − delta/(excess + delta)) × delta` with delta = 25% of the limit approaches but never reaches 200%. Storage is +10% per 100 paragon, uncapped linear. Karma gives +1% happiness each — [js/prestige.js L554–580](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/prestige.js#L554); [game.js L2726–2745](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js#L2726)
- **Antimatter Dimensions:** IP is mainly spent (Infinity upgrades, autobuyers, Break Infinity upgrades). The prestige formulas themselves carry multipliers (`totalIPMult`, `totalEPMult` products of upgrades and studies), so the "bonus" often boosts the next layer's gain rather than raw production — [src/game.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L124)
- **Synergism** uses an exponent-type bonus: challenge completions raise the diamond gain exponent itself (0.5 + completions/100) — [Synergism.ts L2999](https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Synergism.ts#L2999)
- **Trimps** helium is spent on perks such as Looting, Looting II and Greed that multiply future helium and production. Looting adds `amt × level × modifier`, Looting II multiplies by `(1 + level × modifier)` — [main.js L4228–4229](https://github.com/Trimps/Trimps.github.io/blob/master/main.js#L4228)

### Inferences (derivations; not from a source)
- **Feel of additive-linear bonuses.** With output multiplier M = 1 + b·S, the next point raises output by b/(1 + bS). For Ship It (b = 0.1): star 1 = +10%, at S=5 +6.7%, S=10 +5%, S=20 +3.3%, S=40 +2%, S=90 +1%. A rough threshold where "+1 point" stops being felt is around a 2–3% marginal gain, about 30–50 stars for b = 0.1. Cookie Clicker (b = 0.01) reaches that by about 30–50 levels, but players get dozens to hundreds of levels per ascension. The meaningful unit becomes a full run's gain, not one point.
- **Long-run growth with additive bonus plus a cube-root formula (Ship It's structure).** Assume equal-length runs where lines ∝ M. Then stars per run s ∝ (1+0.1S)^(1/3), so dS/dn ∝ (1+0.1S)^(1/3), which gives (1+0.1S)^(2/3) ∝ n. So **S and M grow ∝ n^1.5**, stars per run ∝ n^0.5, and run-over-run production gain ≈ 1.5/n: about +15% at run 10 and +5% at run 30. Growth is polynomial, and each run feels more like the last.
- **Multiplicative per-point bonus with the same formula.** With M = 1.1^S, dS/dn ∝ 1.1^(S/3) = e^(0.0318·S), whose solution blows up after finitely many runs (S = −ln(1 − c·n)/b). Pure compounding per point on a root-of-output currency is unstable. Games that compound either (a) make the currency nearly log of output (AD's 1/308 exponent), (b) earn the compounding currency from a separate source that the bonus does not boost (Egg Inc PEs come from contracts and milestones), or (c) soft-cap the bonus (Kittens getLimitedDR).
- Middle grounds for Ship It: a shallow convex additive curve such as M = 1 + 0.1·S^1.2; a separate multiplicative track bought in the perk shop with rising costs; or an upgradable exponent (Synergism-style cbrt → x^0.36 → x^0.4) delivered through the perk tree.
- **Spend vs keep.** If spending stars on perks also removes their +10%, players face a "spend vs hoard" tax (as with AdCap angel sacrifices). Cookie Clicker avoids this by giving a passive level count and a separate spendable pool. Whether Ship It's perk spending lowers the passive bonus determines which model it uses. That should be a deliberate choice.

### Gaps
- I found no published, sourced rule for when a linear "+X% per point" bonus stops feeling meaningful. The 2–3% marginal threshold above is my inference.
- AdCap's +2% per angel comes only from fan sources via search summaries, and the angel-upgrade spending model was not verified.

---

## 3. Optimal reset timing

### Takeaway
The standard myopic rule is to **reset at the peak of (prestige gain) / (run time + overhead)**, where the instantaneous gain rate falls to the average rate. Antimatter Dimensions shows exactly this as "Current IP/min" vs "Peak IP/min". Community rules of thumb are "reset when the gain would roughly double your current total" (AdCap) or "when the gain is a significant percentage of your total" (Egg Inc). For a power-law formula gain ∝ X^k, the optimum comes when the run's output elasticity d ln X / d ln t falls to 1/k: 3 for a cube root, 2 for a square root.

### Cited Findings
- AD computes `currentIPRate = gainedIP / max(0.0005, thisInfinityRealTime.totalMinutes)` and displays "Current: X IP/min", "Peak: Y IP/min at Z IP". This tells the player the best reset point already passed and how much IP they had at the peak — [BigCrunchButton.vue L84–90, L137–141](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/components/ui-modes/prestige-header/BigCrunchButton.vue#L84)
- AD's crunch autobuyer has three modes: AMOUNT (`gainedIP ≥ amount`), TIME (`thisInfinityRealTime > time`) and X_HIGHEST (`gainedIP ≥ highestPrevPrestige × xHighest`), i.e. "reset when this run's gain is X times the best previous gain" — [big-crunch-autobuyer.js L110–121](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/autobuyers/big-crunch-autobuyer.js#L110)
- AdCap community heuristic: reset once the angel count would roughly double; another poster says "reset whenever you want, it really doesn't matter" (via search summary) — [Steam AdCap discussions](https://steamcommunity.com/app/346900/discussions/0/618458030681519409)
- Egg Inc: "many experienced players prestige when the Soul Eggs they are about to collect are a significant percentage increase over their current total" (via search summary) — [wamohdog prestige guide](https://wamohdog.com/prestige-guide/)
- Pecorella: with sqrt of max currency earned, "if you reset at the same point you will earn literally no more prestige currency". Doubling needs about 4× the previous run's earnings under sqrt, or about 8× under cube root (via search summary) — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- Wikipedia: deciding the optimal timing and method of a reset is part of the strategic depth of incremental games (via search summary) — [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game)
- Kittens Game ships a function to preview a reset's *marginal* bonus: "Storage scales linearly with paragon, but production is diminishing, so the gain must be the delta of the curve" — [js/prestige.js getResetBonusBreakdown](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/prestige.js#L585)

### Inferences (derivations)
- **The elasticity rule.** Gain G(t) = (L(t)/c)^k. Then rate G/(t+t0) peaks where k·(d ln L/d ln t) = 1 + t0/t, i.e. d ln L / d ln t = (1/k)(1 + t0/t). For k = 1/3 with negligible overhead: reset when lines are growing slower than t³ locally. Equivalently, **reset when the current lines-doubling time exceeds ln2·t/3 ≈ 0.23 × elapsed run time** (≈ 0.35 × run time for sqrt).
- If within-run lines grow like t^p with p < 1/k (p < 3 for Ship It), the rate falls monotonically. The optimum is then "reset at the first star", the 5-minute-spam problem. If p > 3 early (exponential early game), longer runs pay off until growth slows. Lower exponents (cbrt vs sqrt) push the optimum earlier relative to the growth curve, and per-run formulas keep the 1-star reset available forever.
- **Bonus type and reset frequency.** With additive bonus, each star's value falls (≈1/S), while the time to reach 2M lines also falls (∝ 1/M under linear production). Short-reset spam therefore gets cheaper over time unless the threshold, overhead or formula changes. Lifetime-cumulative formulas (Cookie Clicker), a per-reset fixed overhead such as rebuying, or scaling the threshold with stars owned all lengthen optimal runs.
- The rate-maximizing rule is myopic. Because currency also speeds up future runs, the long-horizon optimum is somewhat earlier than peak rate when the bonus is large relative to the current total, and close to peak rate later. The "double your total" heuristic is a practical approximation for the early game.

### Gaps
- Pecorella's actual derivation in Part III could not be read. Search summaries confirmed only the 4×/8× doubling statements and the "same point → no gain" remark.
- No sourced closed-form derivation of optimal reset timing that includes compounding was found (one search summary explicitly reported none). The derivations above are mine.
- I found no rigorous public Kongregate analysis of reset timing beyond the article statements above.

---

## 4. Anthony Pecorella (Kongregate): "The Math of Idle Games" and GDC talks

### Takeaway
Part III is the prestige installment. It covers prestige loops and real-world examples, and how to vary them to keep things interesting. It notes that most prestige formulas use fractional exponents (square or cube root), not true logarithms, so prestige growth can still be very large. Clicker Heroes is the exception with a real log-type effect. Doubling prestige currency needs 4× (sqrt) or 8× (cbrt) the previous earnings.

### Cited Findings
- Part III covers "prestige loops", "analyzing the design behind real-world examples and how to vary them to keep things interesting for the player"; a GameAnalytics version says Part III looks at "prestige cycles and balance" (via search summary) — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii); [GameAnalytics author page](https://gameanalytics.com/author/anthony-pecorella)
- Quote (via search summary): "Most prestiges are a fractional exponent (e.g. a square or cube root) rather than a mathematical log function, so growth is still very large in some cases." — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- Quote (via search summary): "Clicker Heroes is an exception that really does have a log-type effect." — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- AdCap formula p = 150·√(c_L/10^15) with c_L = lifetime earnings. Doubling requires about 4× earnings, and the cube-root lifetime variant about 8× (via search summary) — [Game Developer Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii); [sirpinski.com mirror](https://www.sirpinski.com/the-math-of-idle-games-part-iii/)
- GDC Europe 2016 talk "Quest for Progress – The Math and Design of Idle Games" (slides PDF and SlideShare). It notes Clicker Heroes gives 1 prestige currency per 2000 generators owned (via search summary) — [GDC Vault PDF](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf); [SlideShare](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)
- A secondary write-up agrees: in Clicker Heroes, prestige depends on the number of purchases, whose prices multiply, so prestige "grows slowest of all" (via search summary) — [badduck.team: Idle game math, the easy way](https://badduck.team/articles/math-of-idle-games/)
- Parts I and II exist at [Game Developer Part I](https://gamedeveloper.com/design/the-math-of-idle-games-part-i) and [Part II](https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii); their content could not be retrieved.

### Inferences
- Pecorella's framing explains why prestige "works" in the genre. Within-run costs are exponential, so within-run progress is roughly logarithmic in time. A root-of-currency prestige then turns that into a multiplier that grows polynomially in currency, which still lets each new run reach further. Clicker Heroes' log-of-log structure is the slow-growth extreme.

### Gaps
- Part I and II specifics (exponential cost base, typically 1.07–1.15 per purchase in the AdCap model, and polynomial vs exponential production discussion) could not be verified this session.
- Pecorella's GDC 2015 talk on idle game mechanics and monetization was not retrieved.
- Published first-prestige or run-length targets from Kongregate were not found.

---

## 5. Keeping later runs from feeling like repeats; target run lengths

### Takeaway
Published hard numbers for target run lengths were not found. The mechanisms in code are clear, though:
- automate early content after resets (AD autobuyers whose triggers include "X times highest");
- add new layers that slow down the old currency (Synergism's 0.03/0.01 exponents, AD's nested 1/308 layers);
- raise the formula exponent through upgrades or challenges;
- add challenges that cut gain by a power (AD ^0.55/^0.5; Synergism challenge exponents 0.01/1e-4);
- use soft caps or asymptotes so one currency can't carry the game forever (Kittens getLimitedDR, the Modding Tree softcap).

### Cited Findings
- AD autobuyers let players fully automate crunches by amount, time, or a multiple of their best previous gain. Repeated early runs become hands-off — [big-crunch-autobuyer.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/autobuyers/big-crunch-autobuyer.js#L110)
- AD fixes the first-layer gain at 1 IP (×mults) until the player buys Break Infinity. Early runs are about reaching 1.8e308 fast (speed), not about amount. The open-ended formula unlocks later — [src/game.js L102–104](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L102)
- AD challenges raise gain to fractional powers (Teresa ^0.55, V ^0.5, Laitela "dilated"), creating runs that play differently — [src/game.js L109–116](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js#L109)
- Synergism challenge 5 completions raise the prestige exponent by 0.01 each. Its in-challenge exponents drop to 0.01 (Transcension challenge 5) or 1e-4 (Reincarnation challenge 10) — [Synergism.ts L2999–3005](https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Synergism.ts#L2999)
- The Modding Tree's "passiveGeneration" shows "You are gaining X <resource> per second": a later-game pattern where a layer's currency is generated passively, without resets — [components.js L249](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/components.js#L249)
- AD's RM formula adds a linear patch so the first Realities give 1–10 RM instead of rounding to 1. Gains in the first runs of a new layer feel meaningful — [machines.js L28–29](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/machines.js#L28)

### Inferences
- With Ship It's structure, the run-over-run production gain shrinks like ≈1.5/n (§2). This is the mathematical root of the "same run again" feeling. Remedies:
  1. make milestone perks change *how* the early game plays (auto-buy, starting resources, skip tiers), not just its speed;
  2. ensure each run reaches new content (a new tier or upgrade) roughly every 1–3 runs;
  3. add a second layer or challenges before marginal stars drop below a few percent (around 30–50 stars at +10% additive).
- A starting-resources perk (lines on reset), like AD's speed-focused early layer, turns the first minutes of a run into a visible speedrun. That is the "each run is faster through early content" feel.

### Gaps
- No sourced, published targets were found for first prestige time (Ship It's ~6 min) or subsequent run lengths (e.g. "run 2 should be X% shorter"). No GDC/blog source with such numbers could be retrieved; a Kongregate source may exist but was not reachable.

---

## 6. How games show projected prestige gains

### Takeaway
Three readouts recur:
1. **gain now** ("+N on reset");
2. **distance to the next point** ("Next at X" / "N more cookies for the next level");
3. **rate** ("current vs peak per minute").

Some games add the effect of the gain ("+X% CpS") or the *marginal* bonus the pending points add on a diminishing curve.

### Cited Findings
- Cookie Clicker ascend tooltip: "Ascending now would grant you %1 prestige levels (+%2% CpS) and %3 heavenly chips to spend." and "You need %1 more cookies for the next level." A persistent "+N" counter (`ascendNumber`) appears near the legacy button — [main.js L16959–16970](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L16959)
- Cookie Clicker stats show "Prestige level: N at X% of its potential (+Y% CpS)" — [main.js L7188](https://github.com/ozh/cookieclicker/blob/gh-pages/main.js#L7188)
- The Modding Tree's default prestige button reads "Reset for +N <resource>". While gain < 100 and owned < 1000 it adds "Next at X <baseResource>", computed by inverting the gain formula (`getNextAt`) — [js/technical/displays.js L5](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/technical/displays.js#L5); [js/game.js L38–63](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/game.js#L38)
- AD's Big Crunch button shows gained IP, "Current: X IP/min", "Peak: Y IP/min at Z IP". It shows the rate only below a threshold and colors the IP number above it, using `log10(gainedIP)/log10(currentIP)` as a ratio for coloring — [BigCrunchButton.vue L29, L53, L84–141](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/components/ui-modes/prestige-header/BigCrunchButton.vue#L29)
- Kittens Game computes a reset preview of marginal production, storage and happiness bonuses as deltas on the diminishing-returns curve — [js/prestige.js getResetBonusBreakdown](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/prestige.js#L585)

### Inferences
- For Ship It, the minimum set mirrors Cookie Clicker and the Modding Tree: "+N★ (+X% output)" and "next ★ at Y lines" (inverse: next star at 2e6·(s+1)³ lines). Because the formula is per-run with a floor, a stars/min readout (current vs peak, AD-style) directly tells players when to reset under the elasticity rule in §3.
- Showing the effect as a relative change ("+N★ = ×1.25 output") rather than an absolute "+10% each" keeps the preview honest once additive bonuses are diluted.

### Gaps
- No sourced UX research (A/B tests, retention data) on which preview format performs best.

---

## 7. Problems: currency inflation, diminishing-returns walls, 5-minute reset tedium, softcaps

### Takeaway
Games handle runaway or inflating currencies with power softcaps (the Modding Tree: gain^0.5 past a threshold), asymptotic caps (Kittens: bonus → 200%), hard caps that spawn new currencies (AD: RM capped at 1e1000 → Imaginary Machines), steep exponents on later layers, and gain powers inside challenges. They handle reset tedium by automating resets (AD autobuyers) and by making the prestige currency passive (the Modding Tree passiveGeneration).

### Cited Findings
- Modding Tree softcap: past `softcap` (default e1e7), `gain = gain^0.5 × softcap^0.5` — [js/game.js L27](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/game.js#L27); [layerSupport.js L188–189](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/technical/layerSupport.js#L188)
- Kittens asymptotic cap: first 75% of the limit is linear; then `(1 − delta/(excess+delta)) × delta` approaches but never reaches the last 25% — [game.js L2726–2745](https://github.com/nuclear-unicorn/kittensgame/blob/master/game.js#L2726)
- AD pre-Reality EP softcap: log10(EP) above 6000 reduced by 75%, capped at 8000. RM hard cap 1e1000, with overflow feeding Imaginary Machines whose cap is `(log10(RM) − 1000)² × max(log10(RM) − 100000, 1)^0.2` — [machines.js L19–43](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/machines.js#L19)
- AD crunch autobuyer (amount, time or X × highest) automates frequent resets — [big-crunch-autobuyer.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/autobuyers/big-crunch-autobuyer.js#L110)
- Modding Tree passive generation shows "You are gaining X per second" for a layer's currency without resetting — [components.js L249](https://github.com/Acamaeda/The-Modding-Tree/blob/master/js/components.js#L249)
- Egg Inc's 0.21-exponent model (community calculator) is described as creating "diminishing returns on Soul Eggs as farm value increases, making optimal prestige timing crucial" (via search summary, low confidence) — [everycalculators](https://everycalculators.com/egg-inc-prestige-calculator.html)

### Inferences
- **The "mandatory every 5 minutes" risk in Ship It.** The formula is per-run and floor-quantized, the first star comes at 2M lines (~6 min on run 1), and each star makes reaching 2M lines faster. A 1-star reset therefore keeps getting cheaper. If within-run lines grow slower than t³ after the first few minutes, spam-resetting at 1–2 stars is optimal. Options:
  1. switch to a lifetime-cumulative formula, `stars_total = floor(cbrt(lifetime_lines/2e6))`, which self-lengthens runs (Cookie Clicker / AdCap model);
  2. scale the threshold with stars owned;
  3. add a meaningful per-reset overhead or a minimum-gain gate (e.g. reset requires ≥ current stars × some %);
  4. offer an auto-prestige perk, AD-style, so frequent resets don't need clicking.
- **Dilution wall.** Under additive +10%, star 50 adds only +1.7%. This is a soft wall in feel, even though stars per run keep rising. A cap or asymptote (Kittens) only helps if an alternative sink or layer exists by then.
- **Floor quantization early.** At 1–3 stars per run, `floor` discards up to about half of a run's value: 1.99 → 1 star. Showing fractional progress ("1.82★ — next at 16M lines") or carrying over fractional progress reduces the "wasted run" feeling. AD's linear RM patch for 1–10 RM is a precedent for special-casing small early gains.

### Gaps
- I found no sourced data on player drop-off from overly frequent mandatory resets, or on softcap acceptance. The community dislikes "softcap" stacking (a common r/incremental_games theme), but no source was retrieved this session.
