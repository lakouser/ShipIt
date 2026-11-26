# Prestige systems in popular casual and mobile idle games

*Method note: this session's network blocked direct page fetches (every fandom.com wiki failed DNS, and the environment allows no general web hosts), so these notes were built from web-search result summaries only. Each claim cites the page the search engine attributed it to. Numbers from fan wikis and guides can be out of date. Verify any exact figure you intend to copy. The Cookie Clicker, AdCap, Egg Inc and Clicker Heroes pages on fandom.com, and the Game Developer/Kongregate "Math of Idle Games" articles, are the best pages to re-read once fetching works.*

---

## 1. How the major games handle prestige (mechanics by game)

### Takeaway
Nearly every large idle game uses the same core loop: reset the run, convert the run's (or lifetime) earnings into a slow-growing meta-currency through a strongly sub-linear formula, and grant a global multiplier. They differ in three ways. (a) Whether the prestige currency is also spent, and whether spending it reduces the passive bonus. (b) How many layers sit on top (Clicker Heroes transcendence, Leaf Blower crunches, Idle Slayer ultra ascension). (c) Whether the reset covers the whole game or only one sub-world (Idle Miner Tycoon mines, AdCap planets, Cell to Singularity simulations).

### Cited Findings

**Design theory (Kongregate / Anthony Pecorella)**
- Pecorella defines prestige as the player resetting the game in exchange for a production bonus, and compares it to "new game+". — [GDC Europe 2016 "Quest for Progress" slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- The prestige currency should grow at a slower order of magnitude than the primary currency. To achieve this, take a log or a fractional exponent such as a square root of earnings. — [Quest for Progress slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- His rule of thumb: reset when you would gain roughly +50% to +200% of your current prestige currency. — [Quest for Progress slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- Prestige formulas use either lifetime stats or since-reset stats. Realm Grinder uses peak earnings. Cookie Clicker and AdVenture Capitalist use lifetime earnings. Egg, Inc. uses earnings since the last reset. Clicker Heroes uses upgrades purchased since the last reset, so its prestige grows slowest of all. — [The Math of Idle Games, Part III (Kongregate)](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii); [Game Developer mirror](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)
- In a lifetime-earnings model like the ones described, doubling the prestige currency takes roughly 8x the previous run's earnings. That is cube-root behaviour, the same shape as Ship It's cbrt formula. Some games add systems to rein numbers in, such as AdCap's Mega Bucks and Realm Grinder's Reincarnations. — [Math of Idle Games Part III](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii)
- Part I says prestige lets the player get further through the cost curve before falling behind again, and calls it one of the crucial mechanics of modern idle games, popularized by Cookie Clicker. — [Math of Idle Games Part I (Game Developer)](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i); [Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)

**Cookie Clicker (Orteil/DashNet): ascension**
- Each prestige level gives +1% CpS, stacking additively. Heavenly chips are earned 1:1 with prestige levels gained on ascension and are spent on heavenly upgrades, which persist through all later ascensions. — [Cookie Clicker Wiki: Prestige](https://cookieclicker.wiki.gg/wiki/Prestige); [PocketGamer heavenly chips guide](https://www.pocketgamer.com/cookie-clicker/heavenly-chips-guide)
- Prestige level is commonly given as floor(cbrt(all-time cookies baked / 1 trillion)). That puts the first level at 1 trillion cookies and 10 levels at 1 quadrillion. Only a fan calculator confirmed this formula in my searches. — [west-games calculator](https://west-games.com/cookie-clicker-ascension-calculator/); a Steam thread also says the first prestige level needs a trillion cookies baked: [Steam: How long for first ascension?](https://steamcommunity.com/app/1454400/discussions/0/3203746811808483920/)
- The +1% per level is gated. Only the fraction of "prestige potential" unlocked by a chain of upgrades counts: Heavenly chip secret (5%, requires having ascended with at least 1 chip), then Heavenly cookie stand, Heavenly bakery and Heavenly confectionery, ending with Heavenly key (100%, base price 1.111 billion). A fresh ascension with 1,000 prestige levels and none of these upgrades gives no bonus at all. — [Cookie Clicker Wiki: Upgrades](https://cookieclicker.wiki.gg/wiki/Upgrades); [PocketGamer](https://www.pocketgamer.com/cookie-clicker/heavenly-chips-guide/)
- The ascension screen opens from the "Legacy" button under Info. The number beside it shows how many chips and prestige levels you would earn by ascending now. Legacy is the first heavenly upgrade and is available on the first ascension. — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension); [Appuals ascension guide](https://appuals.com/cookie-clicker-ascension-guide/)
- Ascension happens in two steps. You ascend into a heavenly screen, spend chips there, then press a big "Reincarnate" button. A cookie button next to Reincarnate selects a challenge mode. — [Cookie Clicker Wiki: Challenge Mode](https://cookieclicker.wiki.gg/wiki/Challenge_Mode)
- Example heavenly upgrade costs: Heavenly cookies 3 chips; Heavenly luck 77 chips (golden cookies appear 5% more often); Starter kit 50 chips (start each run with 10 cursors); Starter kitchen 5,000 chips (start with 5 grandmas); Season switcher 1,111 chips (trigger seasonal events at will). — [GitHub Cookie Clicker mobile wiki](https://github.com/ThexXTURBOXx/CookieClickerMobileWiki/blob/master/heavenly.md); [GamePretty permaslots guide](https://gamepretty.com/cookie-clicker-ascension-and-permaslots-guide/); [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension)
- Permanent upgrade slots carry one normal upgrade through every reset. Slot I costs 100 chips and slot V costs 50 billion. Slots cannot hold research, heavenly-chip or switch upgrades. Costs have changed between versions. — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension); [fandom Ascension page (via search)](https://cookieclicker.fandom.com/wiki/Ascension)
- The "Born Again" challenge mode starts a run in which prestige levels, heavenly upgrades, sugar lumps and building levels have no effect. It gates achievements such as Neverclick, Hardcore (1 billion baked with no upgrades), Speed baking I–III and True Neverclick. The mode resets to "None" on the next ascension, and unspent chips carry over. — [Cookie Clicker Wiki: Challenge Mode](https://cookieclicker.wiki.gg/wiki/Challenge_Mode); [Steam: Spending no heavenly chips](https://steamcommunity.com/app/1454400/discussions/0/766310215831444762/)

**AdVenture Capitalist (Hyper Hippo, formerly published with Kongregate): angel investors**
- Each angel investor adds +2% profit, and upgrades can raise that figure. Angels accrue from lifetime earnings but only activate when you reset. A reset wipes businesses, cash and upgrades and keeps angels. — [AdCap fandom: Angel Investors (via search)](https://adventure-capitalist.fandom.com/wiki/Angel_Investors); [gameplay.tips basic guide](https://gameplay.tips/guides/adventure-capitalist-basic-guide-angels-events-suits-badges.html); [AdCap fandom: Angel/Hard Reset](https://adventure-capitalist.fandom.com/wiki/Angel/Hard_Reset)
- Angel upgrades are bought by sacrificing angels. Spent angels stop giving their 2%, are not refunded, and the upgrades bought with them must be rebought after each reset. — [AdCap fandom: Angel Upgrades (via search)](https://adventure-capitalist.fandom.com/wiki/Angel_Upgrades); [Steam: Are angel upgrades permanent?](https://steamcommunity.com/app/346900/discussions/0/537405286646565793/)
- A forum reply says sacrificed angels still count in the lifetime-earnings formula for future angel gains, so spending slows future gains rather than erasing them. — [Steam: Angel Investors thread](https://steamcommunity.com/app/346900/discussions/0/618459405712024885/)
- Each planet (Earth, Moon, Mars) has its own businesses, money and angel system. Only gold and Mega Bucks are shared across planets. — [NamuWiki: AdVenture Capitalist](https://en.namu.wiki/w/AdVenture%20Capitalist) (fan source, low reliability)

**AdVenture Communist (Hyper Hippo)**
- Prestige is called "ranking up". After the first 3 missions the game prompts you to rank up to Rank 2, which resets resources, generators and comrades. In return you get a Silver Capsule with science and your first researcher (a permanent card-style upgrade). — [AdCom fandom: Motherland Walkthrough](https://adventurecommunist.fandom.com/wiki/Motherland_Walkthrough)
- The Help Center lists the max rank as 187 in the newest version, and ranks have been extended over time (rank 181 was added on 4 Dec 2024). — [AdCom Help Center](https://screenzilla.helpshift.com/hc/en/6-adventure-communist/section/25-gameplay-settings/?s=gameplay&f=what-is-the-max-rank); [AdCom fandom: Rank](https://adventurecommunist.fandom.com/wiki/Rank)

**Egg, Inc. (Auxbrain): soul eggs, prophecy eggs, epic research**
- Each Soul Egg adds 10% to earnings at base. The Soul Food epic research adds +1 percentage point per Soul Egg per level, to a max of 140 levels (150% per egg). Each Egg of Prophecy multiplies the Soul Egg bonus by 1.05, and the Prophecy Bonus research raises this to a max of 1.10. — [Gamezebo: How to Prestige in Egg, Inc.](https://www.gamezebo.com/2017/10/05/how-to-prestige-egg-inc-why-you-should/); [Egg Inc fandom: Earnings Bonus (via search)](https://egg-inc.fandom.com/wiki/Earnings_Bonus); [JZR mystical eggs math](https://jzr.uz/blog/egg-inc-mystical-eggs-math)
- Soul Eggs are based on earnings during the current farm run (since the last reset). The "Prestige Bonus" epic research increases Soul Eggs gained per prestige. — [Math of Idle Games Part III](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii); [wamohdog prestige guide](https://wamohdog.com/prestige-guide/); [Gamezebo](https://www.gamezebo.com/2017/10/05/how-to-prestige-egg-inc-why-you-should/)
- Prestige keeps the permit, Epic Research, the Hyperloop Station, Golden Eggs, Piggy Bank level, boosts, Mystical Eggs and owned Artifacts. Epic Research is bought with Golden Eggs, not Soul Eggs, so Soul Eggs are never spent. — [Egg Inc fandom: Prestige (via search)](https://egg-inc.fandom.com/wiki/Prestige); [Android Central tips](https://www.androidcentral.com/tips-and-tricks-egg-inc)
- Earnings Bonus (EB) sums the effect of Soul Eggs, Eggs of Prophecy, Eggs of Truth, Soul Food and Prophecy Bonus. Prestiging is the most common way to raise it. — [Egg Inc fandom: Earnings Bonus (via search)](https://egg-inc.fandom.com/wiki/Earnings_Bonus)
- After 100T Enlightenment eggs laid in total, players unlock the "Path of Virtue", a separate challenge mode. While on it, existing artifacts and ships in flight are locked away, and its Eggs of Truth only take effect after leaving the Path. — [Egg Inc fandom: Path of Virtue (via search)](https://egg-inc.fandom.com/wiki/Path_of_Virtue)

**Clicker Heroes 1 & 2 (Playsaurus)**
- CH1: each unspent Hero Soul gives +10% DPS. Souls are spent on Ancients, and spending removes that 10%. The Ancient Morgulis gives 11% per soul spent on it and always costs 1 soul per level, so players use it as an "unspendable bank" for spare souls. — [Steam: "You will lose 10% Hero Soul DPS for each Hero Soul spent"](https://steamcommunity.com/app/363970/discussions/0/617335934143190670/); [Clicker Heroes fandom: Morgulis (via search)](https://clickerheroes.fandom.com/wiki/Morgulis,_Ancient_of_Death); [Steam: Morgulis thread](https://steamcommunity.com/app/363970/discussions/0/487876474227205712/)
- CH1 Transcendence is a second layer, normally available after zone 300. It wipes Hero Souls, Ancients, Gilds and Relics in exchange for Ancient Souls, which are spent on 9 Outsiders whose levels persist. — [Clicker Heroes blog: Transcendence guide](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/); [Clicker Heroes blog: Ancient Souls](https://blog.clickerheroes.com/clicker-heroes-ancient-souls-master-the-ultimate-currency/)
- One Steam guide puts Ancient Souls at about 5 per order of magnitude of Hero Souls sacrificed, a strongly logarithmic curve. — [Kibble42's Clicker Heroes Guides (Steam)](https://steamcommunity.com/sharedfiles/filedetails/?id=2011778243)
- CH2: the original "Gilding" reset was scrapped in 2020 and replaced by Ascension, which keeps skill tree progress. Forced skill tree resets were removed, and players now choose when to respec. Node values were rebalanced "to prevent the feeling that you need to stay in an ascension for as long as possible." A Transcension layer was added later. Playsaurus pulled CH2 from sale in March 2024. — [Steam: CH2 Transcendence Update news](https://store.steampowered.com/news/app/629910/view/3458147022026473431); [playwanderer CH2 review](https://playwanderer.online/game-reviews/clicker-heroes-2)

**Idle Champions of the Forgotten Realms (Codename Entertainment)**
- Prestige is "resetting" or "completing" an adventure. Favor, gems and chests carry over. A manual reset returns you to the World Map to pick the same or a different adventure. Modron automation can auto-reset at a chosen area. — [Idle Champions fandom: Resets (via search)](https://idlechampions.fandom.com/wiki/Resets); [Steam: What exactly does reset mean?](https://steamcommunity.com/app/627690/discussions/0/1754654427602460562/)
- Favor is campaign-specific and is spent on Blessings. Most blessings are unique to a campaign, and some are global. Resetting blessings refunds most of the favor at a small loss (players report about 1%). — [Steam: about favor](https://steamcommunity.com/app/627690/discussions/0/3182362324974378599/); [Steam: When to buy blessings?](https://steamcommunity.com/app/627690/discussions/0/2283834583171050274/)
- The blessing "The Great Lords" gives +2% champion damage for each Patron Variant completed, across all campaigns. — [Idle Champions fandom: Turn of Fortune's Wheel (via search)](https://idlechampions.fandom.com/wiki/Turn_of_Fortune's_Wheel)

**Melvor Idle (Games by Malcs / Jagex)**
- The official wiki FAQ says no prestige system is coming: "The developer is not in favour of prestige systems and currently has no plans to add them." I found no stated reason. — [Melvor Idle Wiki FAQ](https://wiki.melvoridle.com/w/FAQ)
- A review site calls the lack of a reset the game's key structural difference: nothing wipes, and you never earn a multiplier by throwing progress away. It says this makes the game about slowly filling in a spreadsheet rather than optimizing a reset cycle. — [Cool Idle Games: Melvor Idle](https://coolidlegames.com/games/melvor-idle)

**Tap Titans 2 (Game Hive)**
- Prestige unlocks when the Main Hero reaches level 600. It pays out Relics, which buy and upgrade Artifacts. A prestige potion boosts relic gain, and entering a tournament forces a prestige with fewer relics. — [Tap Guides (2025)](https://tap-guides.com/2025/10/24/tap-titans-2-mastery-prestige-max-relics/); [MobiPicker beginner's guide](https://www.mobipicker.com/tap-titans-2-complete-beginners-guide-prestige-pets-equipments-clans-tournaments/)

**Idle Miner Tycoon (Kolibri Games)**
- Prestige resets a single mine, leaving other mines untouched, and gives that mine a much higher earnings multiplier. It costs Cash, and the price is shown in the pop-up. The official help center says each mine can be prestiged up to 6 times; a third-party guide says 5. — [Kolibri Help Center: How does Prestige work?](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/48-how-does-the-prestige-system-work/?p=all); [AppGamer guide](https://www.appgamer.com/idle-miner-tycoon/strategy-guide/what-is-prestige-in-super-miner-tycoon)
- Multipliers climb steeply across a mine's capped tiers, for example from about 4x to 162x for the Emerald Mine. — [Idle Miner Tycoon fandom: Prestige (via search)](https://idleminertycoon.fandom.com/wiki/Prestige)

**Idle Slayer (Pablo Leban)**
- The first ascension is possible once you have enough souls for 20 Slayer Points. SP are spent on a large ascension tree that also unlocks new dimensions (for example, Mystic Valley at 1,200 SP). Ultra Ascension is a deeper reset costing 2,000,000 SP on the tree, with payout based on lifetime SP. — [Idle Slayer fandom: Ascension (via search)](https://idleslayer.fandom.com/wiki/Ascension); [Idle Slayer fandom: Ultra Ascension (via search)](https://idleslayer.fandom.com/wiki/Ultra_Ascension)

**Leaf Blower Revolution**
- Layered resets: Prestige (leaves → Prestige Coins), then Big Leaf Crunch (wipes Prestige Coins, Flasks and most leaf upgrades for BLC Coins), then Ultra Leaf Crunch as the endgame layer. — [shapes.inc LBR prestige layers](https://shapes.inc/fandom/leaf-blower-revolution-idle-game/prestige-layers) (low-reliability aggregator); [Steam: prestige or big crunch?](https://steamcommunity.com/app/1468260/discussions/0/4993894146668104554/)

**Unnamed Space Idle**
- Prestige is introduced as the game's fifth feature. It resets most things for new weapons, shields and utilities. "Reinforce" is a stronger second tier with fixed large bonuses. — [Steam guide: USI guide to (almost) everything](https://steamcommunity.com/sharedfiles/filedetails/?id=3458553444); [Steam: Reinforce kinda ruined this game](https://steamcommunity.com/app/2471100/discussions/0/4694531860639863997/)

**Idle Planet Miner (Tech Tree Games)**
- Prestige is "selling the galaxy", allowed once Galaxy Value exceeds $10M. It pays credits on a log-like scale (about 10 credits at $10M, 30 at $100M, 60 at $1B), which buy mothership Rooms. Room prices rise with each purchase. A double-credits sale costs 100 Dark Matter. — [Idle Planet Miner fandom: Selling Galaxies (via search)](https://idle-planet-miner.fandom.com/wiki/Selling_Galaxies); [note.com summary](https://note.com/shiori_vtw/n/n5aa1a4db729b?hl=en); [Idle Planet Miner fandom: Rooms](https://idle-planet-miner.fandom.com/wiki/Rooms)

**Cell to Singularity (Computer Lunch)**
- The main simulation "reboots" for Metabits, spent in the Reality Engine. The November 2025 "Reality Reboot" split Metabits into Metabits plus Knowledge and moved the first prestige earlier, to Ideas rather than the Singularity. Mesozoic Valley has its own prestige from rank 50, capped at 10 prestiges, and keeps epic and rare trait cards. Rebooting one simulation does not reset the others. — [Cell to Singularity fandom: Help for Beginners (via search)](https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners); [fandom: Mesozoic Valley](https://cell-to-singularity.fandom.com/wiki/Mesozoic_Valley); [Steam announcements](https://store.steampowered.com/news/posts/?feed=steam_community_announcements&appids=977400&appgroupname=Cell+to+Singularity+-+Evolution+Never+Ends&enddate=1765987731)

### Inferences
- Ship It's star formula `floor(cbrt(lines_this_release / 2M))` is a since-reset formula, like Egg Inc's, with a cube-root curve like Cookie Clicker's. Each extra star costs disproportionately more lines in a release (1 star = 2M, 2 = 16M, 3 = 54M, 5 = 250M, 10 = 2B). That is the "8x to double" behaviour Kongregate describes, which pushes players toward frequent releases rather than one marathon release.
- A since-reset formula means re-shipping at the same size gives the same stars again, so there is never a "zero gain" release. Kongregate's warning about lifetime formulas, where resetting at the same point earns literally nothing, does not apply to Ship It.
- Ship It's "star still counts after spent" rule matches Cookie Clicker's split (prestige level gives the bonus, while separate 1:1 chips are spent) and Egg Inc's (Soul Eggs give the bonus, while epic research uses a different currency). It does not match AdCap, CH1 or Idle Champions, where spending eats the bonus.

### Gaps
- I could not read the Cookie Clicker, AdCap or Egg Inc primary wiki pages directly; network fetch was blocked. Exact formulas (AdCap angel formula, Egg Inc soul-egg formula, Cookie Clicker's cube root) come from secondary pages.
- I found no reliable primary documentation for Idle Champions' current favor formula or whether unspent favor still gives a damage bonus (only that it boosts gold find).
- I found no developer source explaining Melvor's anti-prestige stance beyond the FAQ line.

---

## 2. How the first prestige is introduced, and when

### Takeaway
The big games split into two camps. Mobile tycoons (AdCom, AdCap, Idle Miner Tycoon) introduce the reset early and explicitly: a prompt, a mission, or a per-zone unlock within the first session. Cookie Clicker and Clicker Heroes lock prestige behind a large threshold and leave first-timers to discover it, often days to weeks in, with community guides telling them to wait even longer. Several games moved the first prestige earlier over time, and some made it more legible (Cookie Clicker's live chip counter, Idle Planet Miner's credit preview).

### Cited Findings
- **AdVenture Communist** forces it as a tutorial step. After 3 missions the game prompts a rank-up to Rank 2, which resets everything and immediately pays a Silver Capsule and the first researcher, a tangible reward at the moment of loss. — [AdCom fandom: Motherland Walkthrough](https://adventurecommunist.fandom.com/wiki/Motherland_Walkthrough)
- **AdVenture Capitalist**: you can claim angels as soon as you have one. Guidance on the first reset ranges from 50–150 angels (fandom wiki) to 50–300 (an "official FAQ" quoted by a guide site), then reset each time the angel count doubles. — [Steam: Guide on Every Stage of the Game](https://steamcommunity.com/app/346900/discussions/0/618458030681519409); [AdCap fandom: Angel/Hard Reset](https://adventure-capitalist.fandom.com/wiki/Angel/Hard_Reset); [worldwiki.games](https://worldwiki.games/games/adventure-capitalist/guide/kogda-sbrasyvat-radi-angelov/)
- One AdCap player tip: reset when you wake up, so you have a few hours to get back to where you were. This shows the reset is felt as a temporary loss to recover from. — surfaced by search alongside [Steam: How to maximize profits [Beginners]](https://steamcommunity.com/sharedfiles/filedetails/?id=597710543); exact thread attribution unverified
- **Cookie Clicker**: the first prestige level needs 1 trillion cookies baked. Players report first ascensions after about 3 days, about 11 days, or 3–4 weeks. Common advice is to wait for at least 100–200 prestige levels first. — [Steam: How long for first ascension?](https://steamcommunity.com/app/1454400/discussions/0/3203746811808483920/); [Steam: When to ascend when starting out?](https://steamcommunity.com/app/1454400/discussions/0/3421061982937708980/); [Appuals guide](https://appuals.com/cookie-clicker-ascension-guide/)
- Cookie Clicker shows the payoff before you commit: the number beside the Legacy button shows the chips and prestige levels you would gain now. — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension)
- **Tap Titans 2**: prestige is locked until Main Hero level 600. Guides disagree on whether to prestige immediately or wait for the next artifact. — [Tap Guides](https://tap-guides.com/2025/10/24/tap-titans-2-mastery-prestige-max-relics/); [GameSkinny](https://www.gameskinny.com/tips/tips-and-tricks-a-guide-to-getting-started-in-tap-titans-2/)
- **Idle Miner Tycoon**: the option appears once a mine hits a production threshold, roughly when shafts, elevator and warehouse reach a certain level. — [AppGamer](https://www.appgamer.com/idle-miner-tycoon/strategy-guide/what-is-prestige-in-super-miner-tycoon)
- **Idle Slayer**: the first ascension is gated at 20 Slayer Points' worth of souls. — [Idle Slayer fandom: Ascension (via search)](https://idleslayer.fandom.com/wiki/Ascension)
- **Idle Planet Miner**: selling unlocks at $10M galaxy value. — [Idle Planet Miner fandom: Selling Galaxies (via search)](https://idle-planet-miner.fandom.com/wiki/Selling_Galaxies)
- **Cell to Singularity** moved its first prestige earlier, from the Singularity to Ideas, in the Nov 2025 Reality Reboot. — [Cell to Singularity fandom: Help for Beginners (via search)](https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners)
- **Unnamed Space Idle** unlocks prestige as its fifth major feature, layered on after other systems. — [USI Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3458553444)
- Players in small web idle games report resetting several times without knowing a bonus existed, an argument for explaining the bonus up front. — itch.io comment threads surfaced by search ([1](https://itch.io/post/9204091), [2](https://itch.io/post/13720718), [3](https://itch.io/post/15600710)); exact quote-to-thread mapping unverified
- One app-marketing write-up says moving a prestige button to a more prominent spot raised prestige engagement by over 28%. This is a single unaudited anecdote. — [Apptrove: How to make an idle game](https://apptrove.com/how-to-make-an-idle-game/)

### Inferences
- Patterns worth copying for Ship It:
  - A visible, always-on "stars if you ship now / lines to next star" readout, like Cookie Clicker's Legacy counter.
  - A first-release prompt that fires once the first star is reachable (2M lines).
  - An immediate, tangible reward on the first release, like AdCom's capsule and researcher, for example unlocking the dotfiles screen and auto-granting one free perk.
- Ship It's 2M-line threshold for a first star is cheap compared with Cookie Clicker's trillion. The cube root means the first release will usually pay only 1 star, so the first release should explain that stars add +10% forever even after being spent.

### Gaps
- I found no hard data, such as median minutes to first prestige, for AdCap, Egg Inc or Idle Miner Tycoon. Only community advice.
- I found no source describing Egg Inc's first-prestige tutorial or which egg/tier it unlocks at.

---

## 3. Theme and fiction: how the reset is justified

### Takeaway
Most big games pair the reset with a light metaphor that reframes loss as promotion or rebirth: angels or investors backing your next venture (AdCap), souls carried into a new life (Egg Inc soul eggs, Clicker Heroes hero souls), ascending to heaven and reincarnating (Cookie Clicker), the favor of patrons and gods (Idle Champions), selling your galaxy (Idle Planet Miner), rebooting a simulation (Cell to Singularity). The fiction is usually thin, and the community discusses mechanics far more than story. Framings that tie the reset to a natural end-of-cycle event in the theme read best (selling the galaxy, rebooting the sim, a rank-up promotion).

### Cited Findings
- Cell to Singularity writes the reset into the plot: its AI guide Semblance presents each prestige as a reboot of the simulated universe. — [Wikipedia: Cell to Singularity](https://en.wikipedia.org/wiki/Cell_to_Singularity)
- Trailer Park Boys: Greasy Money makes the reset a story event (characters get caught at the end of each cash cycle), so each prestige has narrative payoff. — [Mobile Free To Play: Top 7 Idle Game Mechanics](https://mobilefreetoplay.com/top-7-idle-game-mechanics/)
- Time-loop idle games such as Increlution build the reset into a ticking clock that forces a restart. — [AV Club on idle games (2022)](https://www.avclub.com/idle-games-have-gotten-amazing-in-2022-1848389796)
- Cookie Clicker's vocabulary is religious ascent and rebirth: "Ascend", "heavenly chips", "Legacy", "Reincarnate", "Born again". — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension); [Cookie Clicker Wiki: Challenge Mode](https://cookieclicker.wiki.gg/wiki/Challenge_Mode)
- AdCom frames prestige as career progression ("Rank up") instead of loss. — [AdCom fandom: Motherland Walkthrough](https://adventurecommunist.fandom.com/wiki/Motherland_Walkthrough)
- Idle Planet Miner frames prestige as a business transaction, "selling the galaxy", for credits spent on your mothership. — [Idle Planet Miner fandom: Selling Galaxies (via search)](https://idle-planet-miner.fandom.com/wiki/Selling_Galaxies)
- Egg Inc's community invented its own prestige identity, the "Farmer" rank ladder (Farmer I–III, Kilofarmer at 100K% EB, Megafarmer at 100M%, Gigafarmer around 1T%). These ranks are unofficial and not recognised in-game, but widely used. — [Egg Inc fandom: Earnings Bonus (via search)](https://egg-inc.fandom.com/wiki/Earnings_Bonus)
- Some popular prestige games skip fiction entirely and deepen a purely numerical core (Revolution Idle is the example given). — [Incremental Atlas: idle games with meaningful prestige](https://incrementalatlas.com/mechanics/idle-games-with-prestige/)

### Inferences
- "Ship a release" is a stronger in-fiction framing than most of these. A release really is the natural end of a development cycle, version numbers really do increment, and starting a new version on a fresh line count is believable. Ship It's v1.0 → v2.0 numbering already works like Egg Inc's farmer ranks or AdCom's rank: a public prestige counter.
- Patterns worth borrowing:
  - Name the reset screen as a ritual (Cookie Clicker's ascend → spend → Reincarnate maps cleanly to `git tag` → edit dotfiles → `git checkout -b v3.0`).
  - Give the meta-currency a theme-native name and a title ladder (for example Junior → Senior → Staff → Principal → Distinguished Engineer by lifetime stars), copying Egg Inc's community ranks officially.
  - Add an optional "changelog" flavor line per release.

### Gaps
- I found no source evaluating which framings players prefer, no survey or review roundup. The "praised framing" question is answered only by inference.
- I could not retrieve Cookie Clicker's or AdCap's in-game flavor text verbatim.

---

## 4. Spend-vs-keep tension (prestige currency as both passive bonus and spendable)

### Takeaway
Games where spending the prestige currency removes its passive bonus (AdCap angels, Clicker Heroes 1 souls, Idle Champions favor) produce recurring confusion ("Angel Sacrifice stupid?", "Why would you spend any angels?"), break-even maths, and in-game warning prompts at 1% of the balance. The design teaches players to hoard. Games that separate "bonus" from "spendable" (Cookie Clicker's prestige level vs heavenly chips, Egg Inc's Soul Eggs vs Golden-Egg epic research) avoid this. Ship It's "+10% per star earned, even after spent" is the separated model: spending is always strictly positive, which removes anxiety and analysis paralysis but also the hoarding decision.

### Cited Findings
- **AdCap**: angel upgrades cost angels, spent angels lose their bonus, and the upgrades must be rebought after every reset. — [AdCap fandom: Angel Upgrades (via search)](https://adventure-capitalist.fandom.com/wiki/Angel_Upgrades); [Steam: Angel upgrades perm or session?](https://steamcommunity.com/app/346900/discussions/0/618458030675394263/)
- AdCap's community break-even rule: an upgrade giving xA profit breaks even if you keep 1/A of your angels. The 10K-angel x3 sacrifice breaks even at about 14,950 angels. "Any upgrade that costs less than 1% of your total is always worth it." — [Steam: Are angel upgrades worth it?](https://steamcommunity.com/app/346900/discussions/0/620712999987396334/); [Steam: Question on angel upgrades](https://steamcommunity.com/app/346900/discussions/0/618459405724217902)
- AdCap shows a confirmation prompt when an angel upgrade costs over 1% of your angels, a UI patch for the tension. — [AdCap fandom: Angel Upgrades (via search)](https://adventure-capitalist.fandom.com/wiki/Angel_Upgrades)
- Steam thread titles show the confusion: "Angel Sacrifice stupid?", "Why would you spend any angels on 'Angel Upgrades'?", "WTF 'Upgrades'". — [Steam: Angel Sacrifice stupid?](https://steamcommunity.com/app/346900/discussions/0/487870763303586413/); [Steam: Why would you spend any angels…](https://steamcommunity.com/app/346900/discussions/0/618458030654763150/?insideModal=1); [Steam: WTF "Upgrades"](https://steamcommunity.com/app/346900/discussions/0/3035978213225565337/)
- Guides give conflicting thresholds for AdCap angel spending (spend up to 20% for x2 or 60% for x10; no more than 5% for x3; a 1% cap), which shows how hard the decision is to reason about. — [AdCap search summary of Touch Tap Play / gameplay.tips / glitchfreeguides](https://www.touchtapplay.com/adventure-capitalist-guide-to-angel-investors/); [gameplay.tips](https://gameplay.tips/guides/adventure-capitalist-basic-guide-angels-events-suits-badges.html); [glitchfreeguides](https://glitchfreeguides.com/adventure-capitalist-tips/)
- **Clicker Heroes 1**: each unspent Hero Soul is +10% DPS, so buying Ancients costs that bonus. The workaround Ancient Morgulis (11% per soul banked) became a de facto unspendable bank, and players who own it should keep no unspent souls. — [Steam: lose 10% per Hero Soul spent](https://steamcommunity.com/app/363970/discussions/0/617335934143190670/); [Clicker Heroes fandom: Morgulis (via search)](https://clickerheroes.fandom.com/wiki/Morgulis,_Ancient_of_Death)
- **Idle Champions**: the Blessings window has a "Warnings Enabled" checkbox that warns when a blessing costs more than 1% of total favor. Community rules: spend no more than 10% on global blessings and 1% on local ones, because kept favor earns gold find, which earns more favor. Blessings can be reset for a small loss. — [Steam: How effective are blessings?](https://steamcommunity.com/app/627690/discussions/0/3288067088119514875/); [Steam: When to buy blessings?](https://steamcommunity.com/app/627690/discussions/0/2283834583171050274/); [Steam: "Spending Favor"](https://steamcommunity.com/app/627690/discussions/0/1694914736008347119/)
- Idle Champions players time blessing purchases for right before a reset, so they keep the gold-find bonus during the run. — [Steam: When to buy blessings?](https://steamcommunity.com/app/627690/discussions/0/2283834583171050274/)
- **Egg Inc** avoids the tension: Soul Eggs are only a bonus, and permanent "epic research" (including Soul Food, which raises the per-egg bonus) is bought with Golden Eggs. — [Android Central](https://www.androidcentral.com/tips-and-tricks-egg-inc); [Gamezebo](https://www.gamezebo.com/2017/10/05/how-to-prestige-egg-inc-why-you-should/)
- **Cookie Clicker** keeps the passive bonus (prestige level) and the spendable currency (heavenly chips) as separate counters gained 1:1. — [Cookie Clicker Wiki: Prestige](https://cookieclicker.wiki.gg/wiki/Prestige); [PocketGamer](https://www.pocketgamer.com/cookie-clicker/heavenly-chips-guide)
- **War Clicks postmortem** (a large mobile idle game): when changing systems, the team carried over all past spent and earned Gold "so players wouldn't feel cheated", treating spent currency as still counting. — [Game Developer: From a prototype to one of the biggest idle games in 3 years](https://www.gamedeveloper.com/business/from-a-prototype-to-one-of-the-biggest-idle-games-in-3-years-postmortem)
- **CH2** removed forced skill-tree resets and rebalanced nodes specifically to remove the feeling that you must stay in a run as long as possible to get value. — [Steam: CH2 Transcendence Update](https://store.steampowered.com/news/app/629910/view/3458147022026473431)

### Inferences
- Ship It's rule (each star earned adds +10% forever, even when spent on dotfiles) is the Cookie Clicker / Egg Inc model folded into one currency. It removes the "should I spend?" trap that AdCap and Idle Champions had to patch with 1% warnings. The trade-off is that spending is always correct, so stars only create a choice about which perk to buy, not whether to buy. With 10 capped perks the choice set is small, so the perk ordering and caps carry the interest.
- To keep some strategic texture without the tension, Ship It could add a respec (free or cheap) like Idle Champions' blessing reset, or "unspent stars" flavor. Avoid any mechanic where spending reduces power. The community evidence suggests it mostly generates confusion and spreadsheet threads.
- The UI should state plainly "Spending stars never lowers your +10%/star bonus." AdCap's threads show players will otherwise assume spending is a sacrifice.

### Gaps
- I found no direct player-sentiment comparison of the "bonus survives spending" design against AdCap-style sacrifice. The comparison to Ship It's rule is inference.
- I could not confirm from a primary page that spending heavenly chips never reduces Cookie Clicker's prestige-level bonus, though the 1:1 two-counter design implies it.

---

## 5. Meta-layers that aren't classic resets (events, contracts, seasons, planets, collections, trees)

### Takeaway
The biggest mobile idles keep veterans engaged mostly with parallel fresh runs that don't touch the main save: AdCap and AdCom limited-time events and planets, Egg Inc contracts and co-ops, Idle Champions adventures and variants, Cookie Clicker challenge modes and seasons. Rewards from these runs flow back permanently to the main game. Collections (Egg Inc artifacts, AdCom researchers, Tap Titans artifacts, Cookie Clicker heavenly tree, Idle Slayer ascension tree) give the long-term meta goal. Deeper prestige layers (transcendence, crunches, ultra ascension) are the hardcore end.

### Cited Findings
- **AdCap events**: weekly events give access to a distinct world with special businesses, managers and upgrades. Points convert into rewards, and players liken them to temporary planets. — [INLINGO localization case study](https://inlingogames.com/portfolio/localization/localization-case-study-adventure-capitalist/); [NamuWiki](https://en.namu.wiki/w/AdVenture%20Capitalist)
- **Hyper Hippo** says it "went into overdrive building new content, like Limited Time Events, new planets, etc." and calls AdCap the catalyst for its "Player-First philosophy." — [PocketGamer interview with Rimmy Spanjer](https://www.pocketgamer.com/adventure-capitalist/adventure-capitalist-interview-hyper-hippo-discuss-how-its-least-favourite-idea/)
- **AdCom events**: event researchers can only be earned from event rank milestones. When the event ends they join the main (Motherland) researcher collection, so a temporary run feeds the permanent collection. — [AdCom fandom: Researcher](https://adventurecommunist.fandom.com/wiki/Researcher); [AdCom fandom: Event Rewards](https://adventurecommunist.fandom.com/wiki/Event_Rewards)
- **Egg Inc contracts**: co-op contracts pool every member's eggs toward shared goals. Top-tier completion rewards are the main source of Eggs of Prophecy. — [Egg Inc fandom: Contracts V1 (via search)](https://egg-inc.fandom.com/wiki/Contracts/Contracts_V1); [playwanderer Egg Inc review](https://playwanderer.online/game-reviews/egg-inc)
- Contracts v2 (update 1.26, 1 May 2023) added grades C/B/A/AA/AAA, assigned from Earnings Bonus and the last 30 days of contract history. Under v1, Elite contracts required 10T% EB. — [Egg Inc fandom: Contracts (via search)](https://egg-inc.fandom.com/wiki/Contracts)
- Auxbrain limited contract replay rewards to reduce burnout risk. — [Egg Inc fandom: Contracts (via search)](https://egg-inc.fandom.com/wiki/Contracts)
- Auxbrain's dev blog on Contracts v2: co-ops used to get a grace period of up to 24h after the deadline for members to report eggs. The team weighed player experience against compute cost, and planned to make push notifications more likely during contracts. — [Auxbrain Medium: What's with the Yellow Scroll?](https://medium.com/@kevin_67107/whats-with-the-yellow-scroll-6ebfe07347bc)
- **Egg Inc Path of Virtue**: an alternate mode unlocked after 100T Enlightenment eggs, where you lose access to artifacts while on it, a "hard mode" layer. — [Egg Inc fandom: Path of Virtue (via search)](https://egg-inc.fandom.com/wiki/Path_of_Virtue)
- **Cookie Clicker**: the Born Again challenge mode is an optional handicapped run for achievements. The Season switcher (1,111 chips) lets players trigger seasonal events at will. — [Cookie Clicker Wiki: Challenge Mode](https://cookieclicker.wiki.gg/wiki/Challenge_Mode); [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension)
- **Idle Champions**: favor and blessings are per-campaign. Patron variants are restricted versions of adventures, and a global blessing rewards each patron variant completed (+2% damage each). Players say variants must first be completed without a patron to open them for all patrons. — [Idle Champions fandom: Turn of Fortune's Wheel](https://idlechampions.fandom.com/wiki/Turn_of_Fortune's_Wheel); [Steam: patrons](https://steamcommunity.com/app/627690/discussions/0/603026190505099046/)
- **Cell to Singularity**: separate simulations (main, Mesozoic Valley, the Beyond) each have their own progress. Mesozoic Valley ranks give a small speed boost to the main simulation, a cross-feeding layer. — [Cell to Singularity fandom: Help for Beginners (via search)](https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners)
- **Idle Miner Tycoon** scopes prestige per mine, with a fixed cap (6), so "fresh starts" are spread across many mines rather than one global reset. — [Kolibri Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/48-how-does-the-prestige-system-work/?p=all)
- **Tap Titans 2**: tournaments are a competitive meta-layer, and entering one forces a prestige. — [MobiPicker](https://www.mobipicker.com/tap-titans-2-complete-beginners-guide-prestige-pets-equipments-clans-tournaments/)
- Deeper prestige layers: CH1 Transcendence (Outsiders persist), CH2 Transcension, Idle Slayer Ultra Ascension, Leaf Blower's Big and Ultra Leaf Crunch, Unnamed Space Idle's Reinforce. — [CH blog](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/); [Steam CH2 news](https://store.steampowered.com/news/app/629910/view/3458147022026473431); [Idle Slayer fandom: Ultra Ascension](https://idleslayer.fandom.com/wiki/Ultra_Ascension); [shapes.inc LBR](https://shapes.inc/fandom/leaf-blower-revolution-idle-game/prestige-layers); [USI Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3458553444)
- Many incremental games stack several prestige layers, each unlocking new content, meta-currencies or game modes. — [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game)

### Inferences
- Ship It's existing systems map onto these layers:
  - **Sprints**: could become Egg Inc-style "contracts", short self-contained goals such as "write N lines with constraint X in 30 minutes". A permanent reward feeds back to the main save, for example a cosmetic or a one-time star.
  - **Incidents**: already work like short random events.
  - **Daily streak**: works like a weekly-event cadence.
  - **Born Again analogue**: a "hardcore release" with no dotfiles active, rewarding an achievement or badge. This adds challenge variety without new art.
  - **Calendar events**: a real-world date hook such as Hacktoberfest or year-end could stand in for Cookie Clicker's seasons.
- Collections are the cheapest durable meta for a small web game. Ship It's achievements plus a release history ("changelog" listing each version's line count, stars and duration) give a Cookie Clicker-like "Legacy" record at near-zero cost.

### Gaps
- I found no retention numbers showing how much events or contracts lift retention for AdCap or Egg Inc specifically. Developer statements describe them qualitatively.
- I could not verify current Egg Inc contract-season structure. Graded runs for "Ultra" subscribers are mentioned, but details are unclear. — [Egg Inc fandom: Contracts/Resolutions (via search)](https://egg-inc.fandom.com/wiki/Contracts/Resolutions)

---

## 6. What keeps the 5th, 20th and 100th reset from feeling repetitive

### Takeaway
Six recurring techniques: (1) "starter kits" that skip the slow first minutes; (2) carry-over slots and kept items; (3) content that unlocks only through prestige (new dimensions, trees, challenge modes, layers); (4) visible prestige ranks and counters; (5) automation of the reset itself (Idle Champions Modron automation, CH2 Skill Tree Planner); (6) capped or per-world resets so no single loop is repeated forever (Idle Miner Tycoon's 6-per-mine cap, Cell to Singularity's Mesozoic Valley capped at 10).

### Cited Findings
- **Instant early game**: Cookie Clicker's Starter kit (start with 10 cursors) and Starter kitchen (5 grandmas). — [GamePretty](https://gamepretty.com/cookie-clicker-ascension-and-permaslots-guide/); [GitHub mobile wiki](https://github.com/ThexXTURBOXx/CookieClickerMobileWiki/blob/master/heavenly.md)
- **Carry-over**: Cookie Clicker's permanent upgrade slots keep chosen upgrades through resets. Egg Inc keeps epic research, artifacts, boosts, the Hyperloop and the permit. CH1 Outsiders persist through Transcendence. Cell to Singularity keeps epic and rare trait cards through Mesozoic Valley prestige. — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension); [Egg Inc fandom: Prestige (via search)](https://egg-inc.fandom.com/wiki/Prestige); [CH blog](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/); [Cell to Singularity fandom: Mesozoic Valley](https://cell-to-singularity.fandom.com/wiki/Mesozoic_Valley)
- **Goal at the start of every run**: Cookie Clicker gates the prestige CpS bonus behind cookie-bought upgrades (Heavenly chip secret 5% → Heavenly key 100%), so each new run opens with a clear "buy back your power" checklist. — [Cookie Clicker Wiki: Upgrades](https://cookieclicker.wiki.gg/wiki/Upgrades)
- **Unlock-on-prestige content**: Idle Slayer's ascension tree unlocks dimensions (Mystic Valley at 1,200 SP). The CH2 Skill Tree Planner unlocks after the first Transcension. Egg Inc's Path of Virtue unlocks at 100T Enlightenment eggs. — [Idle Slayer fandom: Ascension](https://idleslayer.fandom.com/wiki/Ascension); [playwanderer CH2 review](https://playwanderer.online/game-reviews/clicker-heroes-2); [Egg Inc fandom: Path of Virtue](https://egg-inc.fandom.com/wiki/Path_of_Virtue)
- **Ranks and titles**: Egg Inc's community farmer ranks (Kilofarmer, Megafarmer, Gigafarmer…) based on EB. AdCom's numbered ranks (max 187, extended over time). — [Egg Inc fandom: Earnings Bonus](https://egg-inc.fandom.com/wiki/Earnings_Bonus); [AdCom Help Center](https://screenzilla.helpshift.com/hc/en/6-adventure-communist/section/25-gameplay-settings/?s=gameplay&f=what-is-the-max-rank)
- **Automation of the loop**: Idle Champions' Modron automation can reset at a chosen area and restart at level 1 of the same adventure with the same formation, without returning to the map. — [Idle Champions fandom: Resets (via search)](https://idlechampions.fandom.com/wiki/Resets)
- **Removing pressure to over-extend a run**: CH2 rebalanced skill nodes so players don't feel they must stay in an ascension as long as possible. It also removed forced skill-tree resets. — [Steam: CH2 Transcendence Update](https://store.steampowered.com/news/app/629910/view/3458147022026473431)
- **Caps**: Idle Miner Tycoon allows 6 prestiges per mine. Mesozoic Valley caps at 10 prestiges. — [Kolibri Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/48-how-does-the-prestige-system-work/?p=all); [Cell to Singularity fandom](https://cell-to-singularity.fandom.com/wiki/Mesozoic_Valley)
- **Retention driver per Forager's dev**: multiple achievable goals and slowly opening up new features were the main factor in player retention. — [Game Developer: Forager's approach to idle game design](https://www.gamedeveloper.com/design/when-grinding-is-fun-i-forager-i-s-compelling-approach-to-idle-game-design)
- A small-dev write-up argues prestige must "feel like acceleration, not punishment." This is opinion from a low-authority source. — [DEV Community: I built 7 idle games in 30 days](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)
- Some players praise resets where each prestige's progress stacks so a quick reset "never feels wasted." — itch.io comments surfaced by search ([1](https://itch.io/post/9204091), [2](https://itch.io/post/14377991/view-in-topic)); exact attribution unverified

### Inferences
- Concrete applications for Ship It's dotfiles and releases:
  - **Start-of-release kit**: a dotfile such as `.bashrc` or `bootstrap.sh` that starts each release with N tier-1 generators already bought (Cookie Clicker's Starter kit). This is the single most-copied anti-tedium mechanic.
  - **Carry one upgrade**: a "pinned dependency" or `package-lock.json` perk that keeps one chosen regular upgrade across releases (permanent upgrade slot).
  - **Unlock on release**: new mechanics revealed at v2.0, v5.0 and v10.0, such as incidents at v2, sprints at v3 and an automation perk at v5. Each early release then changes the game, not just the numbers.
  - **Auto-ship**: a late perk (for example `crontab` or a CI pipeline) that auto-ships at a target star count, as with Modron automation. It turns the 100th release into a deliberate idle choice.
  - **Titles**: a career-title ladder keyed to lifetime stars or major version.
- Ship It's capped perks are a hard ceiling. Once all 10 dotfiles are maxed, the +10%/star rule keeps every release meaningful, but nothing new is unlocked. A post-cap sink such as cosmetic themes, terminal color schemes or achievement-only badges, plus optional challenge releases, would fill the role that deep layers fill in Clicker Heroes and Leaf Blower.

### Gaps
- I found no study quantifying the drop-off between the 5th, 20th and 100th prestige in any game. The "what keeps it fresh" list is synthesized from design features plus anecdote.

---

## 7. How prestige interacts with retention and monetization

### Takeaway
In commercial games, prestige is a retention engine (long-term goal plus regular "fresh start" sessions) and a monetization surface: boosts that multiply the prestige payout (Egg Inc Soul Beacons, Tap Titans prestige potions, Idle Planet Miner double-credits sales), time warps to speed up the post-reset rebuild, permanent multipliers, and premium permits. Events and contracts are where most monetization and social retention sit. A non-monetized game can replace each paid lever with an earned one.

### Cited Findings
- In 2015 idle games had some of the best retention rates on Kongregate and were among its most-played games. Pecorella's GDC 2015 talk examined why retention is so high and how self-playing games monetize. — [Game Developer: The mechanics and monetization of self-playing games (video)](https://www.gamedeveloper.com/business/video-the-mechanics-and-monetization-of-self-playing-games); [archive.org GDC 2015 transcript](https://archive.org/stream/GDC2015Pecorella/GDC2015-Pecorella_djvu.txt)
- Pecorella's GDC 2016 "Idle Chatter" slides list idle monetization levers: time warps, permanent speed multipliers, gaining prestige currency without resetting, and one-time purchases. AdCap is among the examples. — [SlideShare: Idle Chatter GDC 2016](https://www.slideshare.net/AnthonyPecorella/idle-chatter-gdc-2016-59734260)
- **Egg Inc**: the Legendary Soul Beacon multiplies Soul Egg earnings 500x for 10 minutes. Buying a boost also adds 25 Golden Eggs to the Piggy Bank. A player review says the Pro Permit cost about $20 in their region. — [Egg Inc fandom: Boosts (via search)](https://egg-inc.fandom.com/wiki/Boosts); [App Store listing reviews](https://apps.apple.com/nz/app/egg-inc/id993492744)
- Egg Inc's graded contract runs were at one point limited to "Ultra" subscribers, tying the meta-layer to a subscription. — [Egg Inc fandom: Contracts/Resolutions (via search)](https://egg-inc.fandom.com/wiki/Contracts/Resolutions)
- **Idle Planet Miner** offers a double-credits galaxy sale for 100 Dark Matter (premium currency). — [note.com summary](https://note.com/shiori_vtw/n/n5aa1a4db729b?hl=en)
- **Tap Titans 2**: a prestige potion active at prestige increases relic gain. — [Tap Guides](https://tap-guides.com/2025/10/24/tap-titans-2-mastery-prestige-max-relics/)
- **AdCom** events: the new-player FAQ suggests spending gold on dark science at the start of an event and on time warps at the end. — [AdCom fandom: New player faq](https://adventurecommunist.fandom.com/wiki/New_player_faq)
- **Hyper Hippo** responded to AdCap's success by building limited-time events and new planets. — [PocketGamer interview](https://www.pocketgamer.com/adventure-capitalist/adventure-capitalist-interview-hyper-hippo-discuss-how-its-least-favourite-idea/)
- **Auxbrain** limits contract replays to reduce burnout and planned more push-notification use during contracts. — [Egg Inc fandom: Contracts](https://egg-inc.fandom.com/wiki/Contracts); [Auxbrain Medium](https://medium.com/@kevin_67107/whats-with-the-yellow-scroll-6ebfe07347bc)
- Tap Titans 2 forum posters report that pushing far past your highest prestige stage without prestiging can get you flagged as a cheater. This is anecdotal and old. — [Tap Titans 2 search summary of GameGuardian forum](https://gameguardian.net/forum/topic/15946-tap-titans-2/page/9/)

### Inferences
- For a free, non-monetized game, the paid levers translate into earned rewards:
  - **Soul Beacon / prestige potion**: a "release candidate" buff earned from the daily commit streak that multiplies stars on the next release, for example ×1.5 if the streak is 7 or more days. The streak then feeds prestige directly.
  - **Time warp**: an offline-progress bank, or a "hotfix" consumable from incidents that skips a chunk of rebuild time after a release.
  - **Prestige currency without resetting** (Pecorella): a rare achievement or incident reward that grants a star mid-release.
- Without monetization pressure, Ship It can afford what commercial games avoid: never punishing a reset, showing exact formulas, and allowing respecs.

### Gaps
- No public retention breakdown was found that isolates prestige's effect (for example D30 with and without prestige). A D7 ≈ 35% figure for AdCap circa 2015 appeared in search output, but I could not trace it to an identifiable primary source, so it is omitted.

---

## 8. What reviews and player communities criticize about prestige

### Takeaway
Recurring complaints:
- Repetition: "reset and repeat over and over."
- Forced resets that feel like downgrades.
- Unclear bonuses, so players don't know why or when to reset.
- Spend-vs-keep traps (AdCap angels, CH1 souls).
- Over-long first runs (Cookie Clicker: days to weeks).
- Resets that cut a long timer back to the start (Unnamed Space Idle research going from 3 days to 300).
- Late-game pacing walls (Cell to Singularity's Mesozoic Valley).
- Pressure to over-extend runs (addressed in CH2).

A minority prefers no prestige at all (Melvor's audience).

### Cited Findings
- Repetition: an itch.io reviewer calls a prestige game "highly repetitive". Another says finishing amounts to "reset and repeat over and over again." — itch.io comments surfaced by search ([1](https://itch.io/post/9204091), [2](https://itch.io/post/13720718), [3](https://itch.io/post/15600710)); exact quote-to-thread mapping unverified
- Forced prestige as a downgrade: a developer commenter argues incremental games often force a prestige that is really a downgrade after the player has been overwhelmed by upgrades. Another player says prestige "does nothing but hold me back" when the payout is too small. — [itch.io comments via search](https://itch.io/post/14377991/view-in-topic); [itch.io profile thread](https://itch.io/profile/kygron); attribution unverified
- Unclear bonuses: a player reset several times "without knowing about the bonus." Another asked for an auto-upgrade button for prestige steps to reduce clicking. — [itch.io comments via search](https://itch.io/post/15600710); attribution unverified
- Spend-vs-keep confusion in AdCap, with threads such as "Angel Sacrifice stupid?" and "Why would you spend any angels…". — [Steam](https://steamcommunity.com/app/346900/discussions/0/487870763303586413/); [Steam](https://steamcommunity.com/app/346900/discussions/0/618458030654763150/?insideModal=1)
- Cookie Clicker's first run is slow: the first prestige level needs a trillion cookies, which "could take days or weeks, just for the first prestige level." — [Steam: How long for first ascension?](https://steamcommunity.com/app/1454400/discussions/0/3203746811808483920/)
- Unnamed Space Idle: a player reports a research timer jumping from about 3 days to 300 after prestige, because research speed depends on sector and prestige sends you back to low sectors. Another thread is titled "Reinforce kinda ruined this game to me". — [Steam: Problems with research](https://steamcommunity.com/app/2471100/discussions/0/6471190413149414895/); [Steam: Reinforce kinda ruined this game](https://steamcommunity.com/app/2471100/discussions/0/4694531860639863997/)
- Unnamed Space Idle synth-module tiers drop after prestige unless materials are maxed first. Players read this as hidden loss. — [Steam: Synth Modules](https://steamcommunity.com/app/2471100/discussions/0/591759409446703546/)
- Cell to Singularity players voice frustration with Mesozoic Valley's late-game pacing. — Cell to Singularity Steam discussions surfaced by search, e.g. [thread](https://steamcommunity.com/app/977400/discussions/0/6993586036987245085); exact thread attribution unverified
- AdCap's Mars is described by players as the easiest planet that "barely give[s] you any rewards". Fresh-start worlds with weak payoff get criticized. — AdCap Steam posts surfaced by search, e.g. [thread](https://steamcommunity.com/app/346900/discussions/0/1661194916741714417); exact thread attribution unverified
- CH2's developers acknowledged that old skill-node scaling made players feel they had to stay in an ascension as long as possible, and changed it. — [Steam: CH2 Transcendence Update](https://store.steampowered.com/news/app/629910/view/3458147022026473431)
- Melvor's developer is "not in favour of prestige systems." A reviewer frames the lack of resets as the game's defining trait, with nothing wiped and no multiplier for throwing progress away. — [Melvor Idle Wiki FAQ](https://wiki.melvoridle.com/w/FAQ); [Cool Idle Games](https://coolidlegames.com/games/melvor-idle)

### Inferences
- How Ship It avoids each criticism:
  - **Unclear bonus**: an always-visible readout ("+10%/star × N stars = +X% total; next release: +Y stars").
  - **Downgrade feeling**: the first minutes of every release should beat the first minutes of the previous one. Starter-kit dotfiles do this, and the +10%/star compounding helps.
  - **Hidden loss**: list explicitly on the ship screen what resets and what persists (achievements, streak, stars, perks, release history). Unnamed Space Idle's surprises came from unclear persistence.
  - **Overlong runs**: the cube-root formula already rewards shipping early. Show "optimal ship" guidance, for example when the next release would add 50–200% to lifetime stars, per Pecorella's rule.
- Melvor shows a real audience for whom resets are a turn-off. Ship It should make sure non-reset progress (achievements, streak, stats, unlocked themes) is substantial, so players who rarely ship still progress.

### Gaps
- I could not access Reddit threads (r/incremental_games, r/AdventureCapitalist, r/EggsInc, r/CookieClicker). Search did not surface them, so Reddit-specific sentiment is missing. Steam and itch.io comments were the only community sources available.
- Several itch.io quotes could not be tied to specific threads because page fetches were blocked. Treat them as indicative, not attributable.

---

## 9. Patterns a small, free, non-monetized web idle game could borrow

### Takeaway
The most transferable, low-cost patterns:
1. Show the prestige payout live, before the player commits.
2. Introduce the first reset with a prompt and an immediate tangible reward.
3. Separate "power from prestige" from "currency you spend". Ship It already does this, and should say so loudly.
4. Give every new run a fast start and a short checklist.
5. Unlock new mechanics on early resets.
6. Add optional challenge runs and limited-time side runs that feed permanent rewards back.
7. Expose rank, title or version counters.
8. Automate the loop late in the game.
9. List clearly what persists through a reset.

### Cited Findings
- Live payout preview: Cookie Clicker's Legacy-button counter. — [Cookie Clicker Wiki: Ascension](https://cookieclicker.wiki.gg/wiki/Ascension)
- Prompted first reset with an instant reward: AdCom's Rank 2 capsule and first researcher. — [AdCom fandom: Motherland Walkthrough](https://adventurecommunist.fandom.com/wiki/Motherland_Walkthrough)
- Bonus separated from spendable currency: Cookie Clicker (prestige level vs chips) and Egg Inc (Soul Eggs vs Golden-Egg epic research). Contrast AdCap and Idle Champions, which need 1% warning prompts. — [Cookie Clicker Wiki: Prestige](https://cookieclicker.wiki.gg/wiki/Prestige); [Android Central](https://www.androidcentral.com/tips-and-tricks-egg-inc); [AdCap fandom: Angel Upgrades](https://adventure-capitalist.fandom.com/wiki/Angel_Upgrades); [Steam: Idle Champions blessings](https://steamcommunity.com/app/627690/discussions/0/3288067088119514875/)
- Spent currency still counting, so players don't feel cheated: War Clicks postmortem. — [Game Developer postmortem](https://www.gamedeveloper.com/business/from-a-prototype-to-one-of-the-biggest-idle-games-in-3-years-postmortem)
- Fast-start perks: Cookie Clicker Starter kit and kitchen. — [GamePretty](https://gamepretty.com/cookie-clicker-ascension-and-permaslots-guide/)
- Reset-timing rule of thumb: reset at +50% to +200% prestige gain. — [Quest for Progress slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- Optional handicapped runs for achievements: Cookie Clicker Born Again; Egg Inc Path of Virtue. — [Cookie Clicker Wiki: Challenge Mode](https://cookieclicker.wiki.gg/wiki/Challenge_Mode); [Egg Inc fandom: Path of Virtue](https://egg-inc.fandom.com/wiki/Path_of_Virtue)
- Side runs feeding the permanent collection: AdCom event researchers; Egg Inc contracts awarding Prophecy Eggs. — [AdCom fandom: Researcher](https://adventurecommunist.fandom.com/wiki/Researcher); [playwanderer Egg Inc review](https://playwanderer.online/game-reviews/egg-inc)
- Loop automation: Idle Champions Modron automation. — [Idle Champions fandom: Resets](https://idlechampions.fandom.com/wiki/Resets)
- Anti-burnout limits on side content: Egg Inc's replay limits. — [Egg Inc fandom: Contracts](https://egg-inc.fandom.com/wiki/Contracts)
- Earlier first prestige improves onboarding: Cell to Singularity moved its first prestige from Singularity to Ideas. — [Cell to Singularity fandom: Help for Beginners](https://cell-to-singularity.fandom.com/wiki/Help_for_Beginners)

### Inferences
Specific, cheap ideas for Ship It drawn from the above. These are suggestions, not researched facts.
- **Ship screen**: show stars-now, lines-to-next-star, lifetime stars and total bonus, plus a "recommended: ship when this release adds 50–200% to your lifetime stars" hint. With the cube root and 2M base: 1 star at 2M lines, 2 at 16M, 3 at 54M.
- **First release**: prompt at 2M lines. Explain "stars give +10% forever, even after you spend them on dotfiles". Grant a free first dotfile, or open the dotfiles screen with a highlighted recommendation.
- **Dotfile roles to cover** (re-theme the 10 capped perks as needed):
  - Starter kit: `bootstrap.sh` or `.bashrc` starts with N generators.
  - Permanent slot: a `package-lock.json` perk keeps one upgrade.
  - Auto-ship: `crontab` or `.github/workflows` ships at a target star count.
  - Offline bank: `tmux.conf` keeps sessions alive offline.
  - Incident mitigation: `.pre-commit-config`.
- **Unlock-on-release**: reveal new systems at v2, v3 and v5 so early releases change the game. Release notes (`CHANGELOG.md`) list what was unlocked.
- **Challenge releases**: "LTS release", "no-dotfiles release" and "speedrun to 2M in 10 min" as Born Again analogues that award achievements or cosmetic terminal themes.
- **Career titles** keyed to lifetime stars or major version, as an official version of Egg Inc's farmer ranks.
- **Earned instead of paid boosts**: the daily streak gives a "release candidate" star multiplier on the next ship (Soul Beacon analogue). Incidents can drop a "hotfix" time-skip (time-warp analogue).
- **Persistence list** on the ship confirmation: "Kept: stars, dotfiles, achievements, streak, release history. Reset: lines, generators, upgrades."
- **Post-cap sink** for when all 10 dotfiles are maxed: cosmetic themes, prompt styles, ASCII badges and challenge achievements. The +10%/star rule keeps releases mechanically meaningful, but players need new goals too.

### Gaps
- None of these suggestions have been playtested. Effect sizes are unknown, and the only quantified UI claim (Apptrove's +28% from a more prominent prestige button) is a single unaudited anecdote. — [Apptrove](https://apptrove.com/how-to-make-an-idle-game/)
