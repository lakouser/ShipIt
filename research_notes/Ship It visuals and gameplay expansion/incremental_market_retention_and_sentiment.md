# Incremental / idle game market, player retention and player sentiment (state as of 26 Nov 2026)

> Method note for the report writer. All figures were collected on 26 Nov 2026. Page fetching was blocked in this session (every host outside the session allowlist failed DNS), so every finding below comes from web-search result snippets, not from a full read of the page. Quotes are as surfaced by search and may be truncated. The search budget ran out before the last batch of queries (Reddit "best of" threads, Steam negative-review mining, Pecorella slide contents, mobile session benchmarks, web-to-Steam port writeups), so those areas are thin and are listed under Gaps. Third-party Steam sales trackers (Gamalytic, Raijin, VG Insights/Sensor Tower VGI, games-stats, SteamPageAnalyzer) are review-count models and are marked "estimate"; they routinely disagree by 2x. Review counts differ by snapshot and by "English only" vs "all languages".

## 1. Which incrementals released or peaking in 2023–2026 were standout successes, and what are their numbers?

### Takeaway
The clear commercial pattern of 2023–2026 is the cheap ($3–$7), short, visually distinctive, "finishable" Steam incremental: Gnorp Apologue (120k+ in month one), Nodebuster (~410k est.), Digseum (~185–278k est.), Keep on Mining (~188k est.), Tower Wizard (~200–390k est.), and in 2026 Bills Must Be Paid (330,000 units in 20 days, reported). Alongside it sit two other success shapes: free desktop-companion idlers with huge concurrency (Banana 917k peak, Bongo Cat ~194k peak, Rusty's Retirement 550k sold) and long-running endless/free-to-play idlers with lower review scores (IdleOn ~75%, Idle Slayer ~78–84%) versus premium/"fair" long idlers at 90%+ (Melvor, Farmer Against Potatoes, Unnamed Space Idle, Cookie Clicker).

### Cited Findings

**Short paid "finishable" Steam incrementals**
- (the) Gnorp Apologue (Myco, solo dev; released Dec 2023, ~$7): sold 120k+ copies in its first month and was the #4 new Steam game of December 2023 by copies sold; it had only ~1.7k wishlists on release day and a 3.1% refund rate (developer back-end stats shared with GameDiscoverCo, Jan 2024) — [GameDiscoverCo](https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game)
- Gnorp lifetime sales estimates (retrieved Nov 2026, all estimates): Gamalytic 543.7K (range 353.4K–733.9K) — [Gamalytic](https://gamalytic.com/game/1473350); Raijin 235.1K — [Raijin](https://raijin.gg/app/1473350/the_Gnorp_Apologue); SteamPageAnalyzer ~287k–670k (Boxleiter method) — [SteamPageAnalyzer](https://www.steampageanalyzer.com/games/1473350)
- Gnorp playtime (tracker samples, conflicting): median 23.08 h, 85th percentile 59.42 h — [Niklas Notes](https://niklasnotes.com/dashboard/game/69843/the_gnorp_apologue); median 15.5 h, average 27.6 h — [PlayTracker](https://playtracker.net/insight/game/91762); average 27.3 h — [Gamalytic](https://gamalytic.com/game/1473350)
- Nodebuster (Goblobin; 2024 release per MobyGames; $2.99): 97% positive from 14,088 reviews (Top Incremental Games snapshot, Oct 2026); ranked #1 on that site's "incremental games with skill trees" list — [Top Incremental Games](https://www.topincrementalgames.com/lists/incremental-games-with-skill-trees); [MobyGames](https://www.mobygames.com/game/234946/nodebuster/)
- Nodebuster sales estimates (estimates, retrieved Nov 2026): ~416k paid units / ~$937k premium revenue — [Sensor Tower VGI](https://app.sensortower.com/vgi/game/nodebuster); up to 409,133 units / $923,875 — [SteamPulse](https://steampulse.org/game/3107330). No developer-stated figure was found.
- Nodebuster reception: described as "a short, experimental incremental game about busting nodes"; a May 2025 review calls it a short, polished, back-to-basics incremental that is easy to recommend at the price; aggregated player critiques mention a grindy final stretch and repetitive late game — [The Mancunion](https://mancunion.com/2025/05/08/nodebuster-review-a-short-and-sweet-incremental-game/); [Steambase](https://steambase.io/games/nodebuster/info)
- Digseum (Rat Monthly; released 9 Dec 2024; $2.99): estimates 185K copies / $442.5K gross — [Raijin](https://raijin.gg/app/3361470/Digseum); 277.5K copies (202.1K–352.9K) / $732.5K gross — [Gamalytic](https://gamalytic.com/game/3361470); 278k units — [VG Insights](https://vginsights.com/game/digseum)
- Tower Wizard (released 19 Jun 2025; US list price $2.99): Steam shows "Overwhelmingly Positive", 96–97% of 6,092–6,613 English reviews depending on snapshot — [Steam](https://store.steampowered.com/app/3372980/Tower_Wizard/); estimate 204.2K copies / $488.4K gross (medium confidence) — [Raijin](https://raijin.gg/app/3372980/Tower_Wizard); estimate ~304k–695k copies — [SteamPageAnalyzer](https://www.steampageanalyzer.com/games/3372980). A further tracker in the same result set gave 357.7K–393.8K copies / $879.3K gross and another gave 10.8 h average playtime; attribution between the returned trackers was not resolved — [gamerevenuedata](https://gamerevenuedata.com/games/tower-wizard/); [games-popularity](https://games-popularity.com/overview/727588/tower-wizard)
- Keep on Mining! (EagleEye Games; released 30 Jul 2025; listed $3.24 at snapshot): estimate 187.5K copies / $795.1K gross; 94% positive across 8,213 reviews (as of 23 Jul 2026) — [Raijin](https://raijin.gg/app/3769130/Keep_on_Mining)
- Astro Prospector (released 14 Jul 2025; $4.99): estimate 87.4K copies / $349K gross; 91% positive across 3,367 reviews (as of 4 Nov 2026) — [Raijin](https://raijin.gg/app/3503440/Astro_Prospector); the developer announced "+15.000 copies sold" in an early Steam news post (approx. mid-2025) — [Steam news](https://store.steampowered.com/news/app/3503440/view/525348977437048909). The two games are sold as a cross-developer bundle — [Steam bundle](https://store.steampowered.com/bundle/56924/Astro_Prospector_X_Keep_on_Mining/)
- To The Core: one tracker lists a revenue estimate of ~$770,000, but the page may be mixing data with Keep on Mining; treat as unverified — [games-stats](https://games-stats.com/steam/game/to-the-core-2/)
- A Game About Digging A Hole (released Feb 2025; $4.99): 250,000 copies in the first week; publisher later announced 1M+ copies and a mobile port; Gamalytic estimate ~1.3M (877.1K–1.7M) — [Pixelkin, 14 Feb 2025](https://pixelkin.org/2025/02/14/a-game-about-digging-a-hole-has-sold-over-250000-copies/); [PCGamesN](https://www.pcgamesn.com/a-game-about-digging-a-hole/one-million-sales); [Steam news](https://store.steampowered.com/news/app/3244220/view/537735054151909742); [Gamalytic](https://gamalytic.com/game/3244220)
- Clickolding (Strange Scaffold; $2.99; ~40 minutes long): 81% positive of 1,682 Steam reviews ("Very Positive"); Metacritic 70/100 — [Steam](https://store.steampowered.com/app/3011440/CLICKOLDING/); [Wikipedia](https://en.wikipedia.org/wiki/Clickolding); [Video Games Good review](https://www.videogamesgood.com/post/review-clickolding-most-interesting-40-minute-games-ever-played)
- Void Miner – Incremental Asteroids Roguelite (released 16 Nov 2025; $5.99; also playable on Armor Games; ~40-minute "Prologue" demo on Steam since 2 Jun 2025 with 59 reviews, 89% positive): sold 10,000 copies in the first 12 days from ~8,449 launch wishlists (22% conversion), per a How To Market A Game case study dated 28 Apr 2026 — [HTMAG](https://howtomarketagame.com/2026/04/28/void-miner/); [Steam](https://store.steampowered.com/app/3772240/Void_Miner__Incremental_Asteroids_Roguelite/); [Armor Games](https://armorgames.com/void-miner-incremental-asteroids-roguelite-game/19585?fp=ng)

**2026 hits**
- Bills Must Be Paid (Rike Games, two developers; an active incremental about smashing piggy banks; launched 29 Jul 2026 at $6.99 with a 30% launch discount): earned $163,842 in the first 24 hours, sold 330,000 units in the first 20 days and reached Bronze tier in Steam's July 2026 sales ranking (self-reported via HTMAG, 20 Aug 2026; game identified by matching the HTMAG developer name to curator lists) — [HTMAG](https://howtomarketagame.com/2026/08/20/part-2-the-week-of-the-golden-age/); 97% positive and under $7 per a 2026 list — [incrementalgames.org](https://incrementalgames.org/best/active-incremental-games-steam)
- Shelldiver (released 16 Nov 2025; $4.99; a turtle fishes jellyfish and sells them in a shop): reported at 99% positive from 17,300 reviews (another guide says 98%) — [Top Incremental Games](https://www.topincrementalgames.com/category/incremental/steam); [Steam](https://store.steampowered.com/app/3862670/Shelldiver/)
- Dwarf Eats Mountain (released 18 May 2026; $9.99 list, $7.99 seen; has a demo; originated on itch.io): called "the 2026 breakout" mining incremental by a genre guide — [Top Incremental Games](https://www.topincrementalgames.com/games/dwarf-eats-mountain); [Steam](https://store.steampowered.com/app/4078200/Dwarf_Eats_Mountain/); [itch.io](https://greenwizardgames.itch.io/dwarf-eats-mountain)
- Gamblers Table (released 11 Jan 2026; toss coins to earn money): described as the most-wishlisted incremental of its launch window — [Top Incremental Games June 2026 top 10](https://www.topincrementalgames.com/guides/top-10-incremental-idle-games-june-2026); [Steam](https://store.steampowered.com/app/3618390/Gamblers_Table/)
- MMO98 (BiteMe Games; April 2026; two people, ~100 days of development; their sixth Steam game; ~4 hours long): "Mostly Positive", ~70% of ~500 reviews; complaints about a repetitive bug-fixing loop and slow progression — [GameDev Report](https://gamedevreport.beehiiv.com/p/lessons-from-a-hit-incremental-game-and-john-carmack-s-advice); [incrementalgames.org](https://incrementalgames.org/game/mmo98); [Steam discussion](https://steamcommunity.com/app/3907940/discussions/0/766311764554098669/)

**Desktop / companion idlers**
- Banana (free; 2024): all-time peak 917,272 concurrent players on 20 Jun 2024 — [SteamDB](https://steamdb.info/app/2923300/charts/); recent concurrency in 2026 snapshots is ~3–6k — [Tracker Network](https://tracker.gg/population/steam/2923300)
- Bongo Cat (free; released 5 Mar 2025): all-time peak 194,508 on 4 May 2025; still averaging ~150,029 players with a 181,582 monthly peak in June 2026 — [Steambase](https://steambase.io/games/bongo-cat); it reached #12 on Steam's most-played chart — [PC Gamer](https://www.pcgamer.com/games/life-sim/one-of-the-biggest-games-on-steam-right-now-is-bongo-cat-a-cat-with-a-hat-who-smacks-your-windows-taskbar-like-a-bongo-drum-when-you-type)
- Rusty's Retirement (Mister Morris Games; April 2024): 100,000 copies in the first week, 200,000 about two weeks in, 500,000 announced Feb 2025, 550,000 by July 2025 (developer statements) — [Wikipedia](https://en.wikipedia.org/wiki/Rusty's_Retirement); [developer on X](https://x.com/MrMorrisGames/status/1894091532275224627); [GamesRadar](https://www.gamesradar.com/games/simulation/after-selling-100000-copies-of-its-idle-stardew-valley-like-rustys-retirement-dev-celebrates-spawning-a-genre-of-games-that-run-at-the-bottom-of-your-screen/)
- Tiny Pasture (CaveLiquid / Gamersky; released 17 Feb 2025; $5.99): AppMagic's 2026 idle-on-Steam report highlights it "reaching 600K" (unit not visible in snippet) and has a "Desktop Companion Games" section covering Scritchy Scratchy, Rusty's Retirement and Bongo Cat — [AppMagic](https://appmagic.rocks/research/idle-steam-games-2026)

**Long / endless idlers (Steam and cross-platform)**
- Cookie Clicker on Steam (Sept 2021; $4.99): 60,000+ concurrent shortly after release; estimate 3.3M copies (2.4M–4.2M), ~94.8K reviews at 96% — [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker); [Gamalytic](https://gamalytic.com/game/1454400)
- Melvor Idle: "over 1 million copies sold" per Jagex's Melvor Idle 2 announcement; ~90% positive across ~16,362 reviews; estimates range 426.7K (Raijin) to 1.5M (Gamalytic) — [RuneScape news](https://secure.runescape.com/m=news/melvor-idle-2-a-runescape-adventure-early-access-out-now); [Raijin](https://raijin.gg/app/1267910/Melvor_Idle); [Gamalytic](https://gamalytic.com/game/1267910). Melvor Idle 2 launched in Steam Early Access with mobile planned for 2027 — [Tideward](https://tideward.app/melvor-idle-2-mobile/)
- Unnamed Space Idle (free; Steam Early Access since 28 Jul 2023; also on galaxy.click): ~92–93% positive on ~3,700–4,340 reviews — [Steambase](https://steambase.io/games/unnamed-space-idle/reviews); [galaxy.click](https://galaxy.click/play/696)
- Farmer Against Potatoes Idle (free): ~94–95% positive on ~7,700–8,150 reviews — [Steambase](https://steambase.io/games/farmer-against-potatoes-idle/reviews); [Steam](https://store.steampowered.com/app/1535560/Farmer_Against_Potatoes_Idle/)
- Revolution Idle (free): ~86–87% positive on 8,955–12,167 reviews depending on snapshot — [Steambase](https://steambase.io/games/revolution-idle/reviews)
- Idle Slayer (free): 78% of 4,409 English reviews on the store page; 84.4% across ~11k reviews on SteamDB — [Steam](https://store.steampowered.com/app/1353300/Idle_Slayer/); [SteamDB](https://steamdb.info/app/1353300/charts/)
- IdleOn (free-to-play; full launch Nov 2025 per search summary): ~75% of 22,048 English reviews positive; recent reviews "Mixed" at 50% of 524 in one snapshot; review summaries cite pay-to-win pressure; AppMagic attributes close to $59M revenue to it (a secondary site reads $59M as the whole Steam idle category, so the attribution is disputed) — [Steam](https://store.steampowered.com/app/1476970/IdleOn/); [Niklas Notes](https://niklasnotes.com/dashboard/game/134915/idleon); [AppMagic](https://appmagic.rocks/research/idle-steam-games-2026); disputed by [NextBigGames](https://nextbiggames.com/2026/05/09/idle-games-on-steam-revenue-trends-2026/)
- Magic Research (original; $4.99 on Steam): ~90.6% positive (376 vs 39); average ~61 h to finish, SteamSpy median 67.5 h — [Steam250](https://club.steam250.com/app/2311680); [GG.deals](https://gg.deals/game/magic-research/); [SteamSpy](https://steamspy.com/app/2311680). Magic Research 2 on the App Store is $4.69 and advertises "over 60 hours of addictive gameplay - with a clear ending!" — [App Store](https://apps.apple.com/app/magic-research-2/id6478566840)
- Other idle-tagged 2025 Steam hits named by AppMagic: Ball x Pit (#1 by copies, #2 by revenue among idle games on Steam in 2025), The Farmer Was Replaced (>$6.8M revenue), Cast n Chill (~$6.8M, 550K+ copies) — [AppMagic](https://appmagic.rocks/research/idle-steam-games-2026)

**Web**
- Stimulation Clicker (Neal Agarwal; free in browser on neal.fun; released 6 Jan 2025): went viral; has a defined end (final upgrade "Go to the Ocean"); covered by Polygon and Engadget — [Wikipedia](https://en.wikipedia.org/wiki/Stimulation_Clicker)
- itch.io has a "nodebuster" tag with Nodebuster-inspired HTML5 games (FishInc, Coreward demo, Gridlocked, NodeMarcher); commenters refer both to a "Nodebuster craze" that made incrementals fun again and to a "Nodebuster clone craze" — [itch.io tag](https://itch.io/games/free/html5/tag-nodebuster); [itch comment](https://itch.io/post/14762440); [itch comment](https://itch.io/post/14761327)

**Mobile**
- Egg, Inc. (Sensor Tower estimates, undated recent snapshot): ~60k downloads and ~$300k revenue per month on iOS US; ~60k downloads and ~$200k on Google Play US — [Sensor Tower iOS](https://app.sensortower.com/overview/993492744?country=US); [Sensor Tower Android](https://app.sensortower.com/overview/com.auxbrain.egginc?country=US)
- Top mobile idle earners in the US in 2025 are idle RPGs and idle tycoons, e.g. Capybara Go! ~$423K/week falling to ~$280K (Q1 2025, Android US), The Tower ~$184K/week (mid-March 2025), Gold and Goblins ~$239K/week peak (late Aug 2025, iOS US) — [Sensor Tower Q1 2025 idle RPG](https://sensortower.com/blog/2025-q1-android-top-5-idle%20rpg-revenue-us-6040bbc2241bc16eb883a0cb); [Sensor Tower Q1 2025 idler](https://sensortower.com/blog/2025-q1-android-top-5-idler%20games-revenue-us-602ae7fb241bc16eb874f8e1); [Sensor Tower Q3 2025 iOS idle](https://sensortower.com/blog/2025-q3-ios-top-5-idler%20games-revenue-us-602ae7fb241bc16eb874f8e1)

**Market size / saturation**
- Steam has 4,314 games tagged "Idler", with 54 released in a single week in 2026, "many eerily similar" — [PC Gamer](https://www.pcgamer.com/gaming-industry/steam-week-in-review-54-idle-games-released-on-steam-last-week-and-many-look-eerily-similar/)
- In 2025, 20,282 games were released on Steam and only 608 reached 1,000 reviews (Chris Zukowski) — [GamesRadar](https://www.gamesradar.com/games/a-terrifying-20-282-games-were-released-on-steam-in-2025-and-just-608-managed-to-get-1-000-reviews-expert-finds-we-might-be-in-a-bit-of-an-indie-golden-age/); Zukowski lists idle and incremental games among genres currently booming — [GamesRadar](https://www.gamesradar.com/games/steams-new-golden-age-is-special-because-so-many-genres-are-popping-off-at-once-indie-expert-says-its-almost-like-the-player-base-was-drinking-and-their-inhibitions-lowered/)

### Inferences
- A $3–$7 incremental with a few thousand "Overwhelmingly Positive" reviews maps to roughly 100k–400k estimated copies; the short-format hits all sit at 91–99% positive, while endless F2P idlers with heavy monetisation sit at 75–87%. Review score correlates with "finishable and fair" far more than with content volume.
- By late 2026 the short-incremental niche is crowded (54 idle releases in one week, "clone craze" comments), yet new entrants with a strong, instantly readable theme (piggy banks, turtle fishing, a dwarf eating a mountain, a Windows 98 MMO studio) still break out. Theme and visual hook are now the differentiator, not the upgrade-loop structure.
- Free does not imply low esteem: Unnamed Space Idle and Farmer Against Potatoes hold 92–95% as free games, so a free web/mobile idle game can reach Steam with high scores if monetisation is not felt as pressure.

### Gaps
- No figures found for CIFI, Idle Planet Miner (only unreliable APK-mirror counts), Galaxy.click rankings, CrazyGames, Kongregate or Armor Games charts; searches returned nothing usable and the search budget ran out.
- No developer-stated sales for Nodebuster, Digseum, Tower Wizard or Keep on Mining; all are tracker estimates.
- Completion lengths for Nodebuster, Digseum, Keep on Mining, Astro Prospector, Tower Wizard, Shelldiver and Bills Must Be Paid were not captured from a citable source. From prior knowledge (unverified this session) these are roughly 2–10 hour games; Tower Wizard's 10.8 h average playtime and MMO98's ~4 h are the only sourced data points.
- "Tiny Rogues-adjacent active incrementals" as a category was not researched beyond the active-incremental lists above.
- Stimulation Clicker play counts were not found.
- AppMagic's full report (revenue by sub-genre, desktop-idler revenue) could not be read; appmagic.rocks was unreachable.

## 2. What patterns separate the hits, and what do developers say about why they worked?

### Takeaway
Hits share a visible, watchable simulation with a distinctive theme, a low price, a short arc with an ending, an early free demo that drives concurrency, and discovery through YouTube/streamers rather than pre-launch wishlists. Developers who commented credit "visual incremental" as an undersupplied niche and "the hook" as the main cause of success.

### Cited Findings
- Myco (Gnorp Apologue) set out "to make a more visual incremental game that still functioned as an incremental game"; the pillars are the rock, the pile, and how gnorps interact with them; the game deliberately leans into excess — [Game Developer interview](https://www.gamedeveloper.com/design/interview-the-gnorp-apologue)
- Myco told GameDiscoverCo: "What I do think is undersupplied are visual incremental games", and called the gnorps themselves "the biggest hook for the game" — [GameDiscoverCo](https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game)
- Almost all of Gnorp's discovery came from YouTube videos and the resulting Steam surfaces (New & Trending, Discovery Queue), from a base of only ~1.7k wishlists — [GameDiscoverCo](https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game)
- Gnorp later added a new, possibly alternate, ending via updates leading to "PART II & PART III", i.e. the game is structured around endings — [Steam announcements](https://steamcommunity.com/app/1473350/announcements/)
- Bills Must Be Paid had only 500 wishlists after 65 days of pre-demo marketing; the demo launch on 21 Apr 2026 brought 340 concurrent players immediately and put it on the Trending Free chart; $200 of Reddit ads yielded 19 tracked wishlists — [HTMAG, 20 Aug 2026](https://howtomarketagame.com/2026/08/20/part-2-the-week-of-the-golden-age/)
- Void Miner's wishlist spikes came from content creators and festivals plus Popular Upcoming; Reddit contributed roughly 100 wishlists; it also shipped a separate free "Prologue" and a web version on Armor Games — [HTMAG, 28 Apr 2026](https://howtomarketagame.com/2026/04/28/void-miner/)
- MMO98 postmortem summary: "The biggest reason the game worked was the hook. Windows 98 UI + MMO studio fantasy + incremental game is just instantly clickable"; it was the team's sixth Steam game, built in ~100 days; the same piece warns that dropping to "Mixed" reviews drastically cuts Steam visibility — [GameDev Report](https://gamedevreport.beehiiv.com/p/lessons-from-a-hit-incremental-game-and-john-carmack-s-advice)
- Seven of the 50 most-played demos at the October 2026 Steam Next Fest were incremental games (including 10 Million Pixels and Unharvest) — [PC Gamer](https://www.pcgamer.com/software/platforms/the-50-most-played-steam-next-fest-demos-include-7-incremental-games-4-ai-disclosures-and-only-one-instance-of-haystack-slop/)
- Why incrementals demo well: they "give players a sense of progression within minutes, encouraging them to keep playing until they can afford another upgrade"; the caveat is they "need enough additional content and progression to keep players interested beyond the demo" — [Zero1](https://zero1.gg/features/steam-next-fest-october-2026-most-played-demos)
- Next Fest is crowded: ~8,011 demos listed for one 2026 edition; advice is that Next Fest multiplies existing momentum and a good demo converts roughly 12–20% of players to wishlists (16.33% median in one developer survey) — [PC Gamer](https://www.pcgamer.com/gaming-industry/steam-week-in-review-steam-next-fest-has-over-8-000-demos-as-worthless-vibe-coded-slop-levels-up/); [Immutable guide](https://www.immutable.com/guides/steam-game-marketing)
- Skill-tree-driven incrementals are now a recognised sub-list, with Nodebuster ranked first — [Top Incremental Games](https://www.topincrementalgames.com/lists/incremental-games-with-skill-trees)
- Rusty's Retirement's developer celebrated "spawning a genre" of games that run at the bottom of the screen; Bongo Cat and Tiny Pasture followed the format — [GamesRadar](https://www.gamesradar.com/games/simulation/after-selling-100000-copies-of-its-idle-stardew-valley-like-rustys-retirement-dev-celebrates-spawning-a-genre-of-games-that-run-at-the-bottom-of-your-screen/); [AppMagic](https://appmagic.rocks/research/idle-steam-games-2026)
- Magic Research 2 markets "a clear ending" as a selling point even at 60+ hours — [App Store](https://apps.apple.com/app/magic-research-2/id6478566840)
- Zukowski's data (secondary summary) says idle/incremental games convert well on Steam because the audience actively seeks them out — [presskit.gg](https://presskit.gg/field-guides/how-many-wishlists-to-launch)

### Inferences
- Common traits of the 2023–2026 hits, ranked by how consistently they appear in the evidence: (1) a visible simulation or "thing happening on screen" (gnorps hitting a rock, nodes bursting, a mine being dug, a turtle fishing); (2) a one-line readable theme/hook; (3) price of $3–$7; (4) a defined end and a short arc; (5) a generous demo or web build released months before launch; (6) streamer/YouTube legibility. Endless content, deep number systems and big wishlist counts are not prerequisites.
- The demo is the marketing. Both 2026 case studies show near-zero traction before a playable build and immediate concurrency after it. For a game that is already a free web build, the web version is effectively that demo; Void Miner used Armor Games plus a Steam Prologue this way.
- A "watchable" game state matters twice: it holds the player during waits and it makes clips and streams understandable. This supports prioritising a visible simulation over additional menu depth.
- A skill tree as the main between-run screen has become a genre convention. It is expected, but by itself is no longer a differentiator ("eerily similar" releases).

### Gaps
- No direct developer statement from Goblobin (Nodebuster), Rat Monthly (Digseum), the Tower Wizard developer or EagleEye (Keep on Mining) was found.
- The HTMAG posts and the Game Developer interview could not be read in full (hosts unreachable); only snippets were available. Two other HTMAG "golden age" case studies ($361,657 in 24 h / 200,000 units in 20 days; 242,000 units since a 30 Jul 2026 launch) were not identified by title or genre — [HTMAG](https://howtomarketagame.com/2026/08/18/the-week-of-the-golden-age/).
- No quantitative split of hit rate for "short with ending" versus "endless" incrementals was found.
- The PC Gamer "eerily similar" article's specifics (which traits repeat) were not retrieved.

## 3. Player motivation and retention research: what keeps people returning?

### Takeaway
Research frames idle play as planning and checking in, driven by Completion and Power motivations among self-identified core gamers. Idle games balance rules that push players away with rules that reward returning, and players check in several times a day. Industry retention medians for all mobile games are low (D1 ~22%, D7 <4%, D30 <1%); idle specialists target about 40% D1 and 20% D7.

### Cited Findings
- Alharthi et al. (CHI 2018) analysed 66 idle games (plus 10 non-idle games for contrast) with grounded theory; the paper presents a taxonomy and an interactivity spectrum running from clicker to zero-player, and argues idle games "shift players from playing to planning" and make unusual use of player attention — [ACM DOI](https://doi.org/10.1145/3173574.3174195); [Monash record](https://research.monash.edu/en/publications/playing-to-wait-a-taxonomy-of-idle-games/)
- A later paper summarises the same authors' finding that idle games balance rules that encourage players to leave with rules that reward their return — [NSF PAR follow-up](https://par.nsf.gov/servlets/purl/10174274)
- Cutting, Gundry and Cairns (IJHCS 2019), "Busy doing nothing?", surveyed 1,972 Neko Atsume players: players are highly engaged, interacting with and around the game; 67.5% check the game more than twice a day — [White Rose repository](https://eprints.whiterose.ac.uk/id/eprint/135461/); [ResearchGate](https://www.researchgate.net/publication/327530653_Busy_doing_nothing_What_do_players_do_in_idle_games)
- "Exploring Engagement in Idle Game Design" (two studies): idle games were as engaging as casual games, with no statistically significant difference in engagement or gameplay time — [ResearchGate](https://www.researchgate.net/publication/383510819_Exploring_Engagement_in_Idle_Game_Design)
- Research summarised in later work: players strive for progress and to achieve it as rapidly and efficiently as possible, which leads them to return several times a day to buy upgrades — [Ruffino, Games and Culture](https://journals.sagepub.com/doi/abs/10.1177/1555412019886242)
- Deterding (DiGRA/FDG 2016), "Progress Wars": idle games began as parodies of grinding RPG progress mechanics and then became a healthy, growing genre — [ResearchGate](https://www.researchgate.net/publication/303310795_Progress_Wars_Idle_Games_and_the_Demarcation_of_Real_Games)
- Quantic Foundry (July 2016) profiled three idle-clicker audiences: nearly identical motivation profiles with Completion and Power highest and Excitement and Fantasy lowest; ~70% identified as core gamers, ~20% hardcore, ~10% casual; idle games "cleanly isolate the power progression and accumulation mechanics" of RPGs — [Quantic Foundry](https://quanticfoundry.com/2016/07/06/idle-clickers/)
- Quantic Foundry's wider data: Completion is a top-3 motivation across all segments and Competition falls most with age — [Quantic Foundry GDC 2020 slides](https://quanticfoundry.com/wp-content/uploads/2020/08/GDC-2020-Slides-Player-Segments-Quantic-Foundry.pdf)
- Anthony Pecorella (Kongregate, GDC 2015): idle games were "some of the best-retaining games on all of Kongregate", three of the top 10 most-played Kongregate games that month were idle games, and they were the top-grossing single-player games by ARPU — [GDC Vault](https://www.gdcvault.com/play/1022065/Idle-Games-The-Mechanics-and); [Game Developer](https://www.gamedeveloper.com/business/video-the-mechanics-and-monetization-of-self-playing-games). His follow-up deck "Quest for Progress: The Math and Design of Idle Games" (GDC Europe 2016) exists but was not read — [GDC Vault PDF](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- GameAnalytics all-genre mobile benchmarks (2025 data): median D1 ~22% (top 10% ~40%); median D7 just under 4% (top 10% ~11–12%); median D30 ~0.7–0.8% (top 10% ~4%) — [GameDev Reports summary of GameAnalytics 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game); [GameAnalytics 2025 report PDF](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)
- GameAnalytics session length (2024 data): median ~4–6 minutes, top quartile ~7–9 minutes (two summaries differ by about a minute) — [GameDev Reports summary of GameAnalytics 2025](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Idle-specific target from East Side Games: "a good D1R is around 40%. For D7R, we aim for 20%" (probable source: Russell Ovans retention paper hosted with GameAnalytics material, Dec 2025) — [InvestGame PDF](https://investgame.net/wp-content/uploads/2025/12/russell-ovans-gameanalytics-retention.pdf)
- The 2026 GameAnalytics report says the classic 40/20/10 D1/D7/D30 rule "probably" needs updating — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- In a May 2025 r/incremental_games thread on what makes an idle game worth returning to, commenters cited getting over larger walls and prestige systems "you really have to earn", and one said "steady progress makes me feel like it's worth coming back to" while constant spikes and walls do not — [r/incremental_games mirror, 16 May 2025](https://reddit.zackpollard.pro/r/incremental_games/comments/1ko0i7y/what_makes_an_idleincremental_game_actually)
- Brendan Malcolm (Melvor Idle): "Auto games are really good to give you the sense of progression and the joy and the fun while not necessarily having to pay attention to it" — [TheGamer](https://www.thegamer.com/melvor-idle-interview-jagex/)

### Inferences
- The audience is closer to RPG/strategy optimisers than to casual players. Completion (collections, achievements, finishing the tree, reaching the ending) and Power (visible growth) are the motivations to feed; excitement and narrative fantasy are secondary.
- Return behaviour is appointment-like and self-scheduled: players come back when they expect enough has accumulated to buy the next thing. Clear short-term goals ("next upgrade in X") plus a visible longer goal sustain the several-check-ins-per-day pattern better than externally imposed timers.
- For a free web/mobile idle game, a realistic target frame is the idle-specialist 40% D1 / 20% D7, with the all-genre medians (22% / <4%) as the floor that signals an onboarding problem.
- "Steady progress with occasional earned walls" is the stated preference; novelty cadence (a new mechanic at each wall) is what converts a wall from a quit point into a return reason.

### Gaps
- No idle-genre-specific D1/D7/D30 or sessions-per-day benchmark from GameAnalytics, Sensor Tower, AppMagic, Liftoff or Unity was found; the only idle-specific numbers are one publisher's targets.
- The full taxonomy categories of Alharthi et al. and the content of Pecorella's 2016 deck were not retrieved (hosts unreachable). A third-party summary's "~35% retention" figure for Pecorella's talk is low confidence and is excluded.
- Deterding's work found here is about genre legitimacy, not retention; no Deterding piece on retention mechanics was located.
- No Quantic Foundry age or gender breakdown specific to idle players was found.
- No Steam-side retention or median-playtime benchmarks for incrementals as a category were found.

## 4. Why players quit incrementals

### Takeaway
The best-evidenced quit triggers are walls with no new decision, prestige layers that feel like a setback without a clear payoff, manual repetition before automation arrives, exponentially rising costs against flat income, pacing with "no end in sight", and monetisation pressure in F2P titles. Evidence for UI clutter, save loss and loss-aversion mechanics was not captured in this session.

### Cited Findings
- r/incremental_games thread (28 Feb 2025) asks whether going down in power after a super-prestige is a quit moment; replies say it is only a friction point "if you don't feel absolutely juiced afterwards", and that "some games encourage you to prestige earlier than you probably should and grinding back up feels terrible" — [r/incremental_games mirror](https://axebps-redlib.hf.space/r/incremental_games/comments/1j0f8qi/is_going_down_in_power_due_to_superprestiging_a)
- An itch.io commenter refuses to "manually prestige a dozen or so times so I can unlock automation" (exact post among the returned itch.io results not pinned) — [itch.io comment](https://itch.io/post/13778508)
- A long-running forum thread: when a game hit a stall the poster would "come to my senses", quit and never play again — [Quarter to Three forum](https://forum.quartertothree.com/t/broken-mouse-convention-the-latest-thread-on-incremental-games-e-g-cookie-clicker-etc/159223)
- A user describes idle games as feeling "kinda nihilistic" and quitting after a few days when "the emptiness" hits — [lemm.ee thread](https://lemm.ee/post/32027332/11951319)
- "The pace constantly slows down with no end in sight": linear output versus exponential costs means players only stop when they give up — [itch.io comment](https://itch.io/post/7118190)
- Upgrade prices that "shoot straight up into the sky" leave "really nothing to do" — [itch.io comment](https://itch.io/post/12074153)
- After automation is set up "you might as well stop playing until you get your next level"; money "just kinda racks up" with no need to spend it — [itch.io comment](https://itch.io/post/12783061)
- A balance patch that slowed everything without adjusting costs made one player quit: progression "outpaced by snails" — [itch.io comment](https://itch.io/post/8871150)
- A developer reply concedes the main reason people play idle games "is to see numbers go up" and regrets not adding automation unlocks — [itch.io comment](https://itch.io/post/13686484)
- One commenter dislikes incrementals with a timer longer than 60 seconds and time-based games built on resettable progression (exact post among returned results not pinned) — [itch.io comment](https://itch.io/post/14747828)
- IdleOn Steam reviews: many cite pay-to-win mechanics; one says packs are needed to keep up with a total "over $400 to enjoy the game"; another complains of overpowered paid pets; another says it is "more like waiting than playing"; recent reviews fell to 50% positive in one snapshot — [Steam](https://store.steampowered.com/app/1476970/IdleOn/); [Niklas Notes](https://niklasnotes.com/dashboard/game/134915/idleon)
- Nodebuster's critiques, even at 97% positive, are a grindy final stretch and repetitive late game — [Steambase](https://steambase.io/games/nodebuster/info)
- MMO98's ~70% score is attributed to a repetitive manual loop (bug fixing) and slow incremental progression — [Steam discussion](https://steamcommunity.com/app/3907940/discussions/0/766311764554098669/)
- Expectation mismatch between "idle" and "incremental": players who expected idle mechanics found an active game too slow — [itch.io comment](https://itch.io/post/2934539)

### Inferences
- The recurring structure of a quit moment is "nothing meaningful to do and no visible reason to wait": a wall without a new mechanic, a prestige whose benefit is not previewed, or automation that removes decisions without adding new ones. The fix implied by the comments is to make every reset obviously stronger and to introduce a new decision at each wall.
- Short games are not immune: the final-stretch grind is the most common complaint about otherwise beloved short incrementals, so the endgame curve deserves as much tuning as the opening.
- Labelling matters: "idle" versus "active incremental" sets expectations, and mismatches generate negative comments.
- Monetisation pressure is the dominant driver of low review scores among long-running F2P idlers on Steam (IdleOn 75% versus 92–95% for free games without felt pressure).

### Gaps
- Dedicated r/incremental_games "why did you quit" threads and yearly "best of" threads could not be retrieved (Reddit is poorly indexed by the search tool and the budget ran out).
- No sourced evidence was captured for UI clutter, lost saves, weak or punishing offline progress, daily-login fatigue or loss-aversion mechanics (losing progress or users while away) as quit reasons specific to incrementals; these remain hypotheses for this report.
- Steam negative reviews for Revolution Idle, Idle Slayer, Cookie Clicker and Melvor were not mined.

## 5. Expectations by platform, and what changes when a web incremental goes to Steam or mobile

### Takeaway
Steam buyers reward cheap, finishable, polished incrementals with cloud saves, achievements, audio and no ads; mobile sessions are short (median ~4–6 minutes) and the mobile charts are led by long-lived idle RPGs and tycoons; web is the free funnel and demo. Successful ports add platform features and remove web monetisation; they rarely change the core game.

### Cited Findings
- Cookie Clicker's Steam version (Sept 2021, $4.99 after years as a free web game) added a C418 soundtrack, Steam Cloud, multiple languages and later Steam Workshop modding; the developer said both versions would receive the same updates; players note it has no advertisements; it reached 60,000+ concurrent players and "Overwhelmingly Positive" reviews — [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker); [Steam discussion](https://steamcommunity.com/app/1454400/discussions/0/3124928618240339286); [PC Gamer](https://www.pcgamer.com/cookie-clicker-has-overwhelmingly-positive-reviews-on-steam-because-it-deserves-it/)
- Melvor Idle went from a solo web project (2018) to Steam and mobile with Jagex as publisher; the 1.0 launch covered Steam, iOS and Android in 13 languages and reported more than a million players across the three platforms — [Cambridge Network](https://www.cambridgenetwork.co.uk/news/version-10-melvor-idle-game-launches-pc-and-mobile); [Pocket Gamer](https://www.pocketgamer.com/melvor-idle/runescape-inspired-idle-rpg-out-now-on-ios-android/)
- Melvor's developer reported that mobile was the hardest platform for an offline client because of platform restrictions; offline play on mobile came later — [Steam announcements](https://steamcommunity.com/app/1267910/announcements/)
- Melvor Idle 2 is launching Steam-first (Early Access) with mobile following in 2027 — [Tideward](https://tideward.app/melvor-idle-2-mobile/)
- Unnamed Space Idle runs both on galaxy.click and on Steam as a free Early Access title at ~92–93% positive — [galaxy.click](https://galaxy.click/play/696); [Steambase](https://steambase.io/games/unnamed-space-idle/reviews)
- Antimatter Dimensions was ported to Steam alongside its "Reality Update" (sources conflict on Dec 2021 versus Dec 2022) — [Wikipedia](https://en.wikipedia.org/wiki/Antimatter_Dimensions)
- Magic Research 2 is sold as a premium mobile app ($4.69), optimised for phones and tablets, advertising 60+ hours and a clear ending; the original is $4.99 on Steam — [App Store](https://apps.apple.com/app/magic-research-2/id6478566840); [GG.deals](https://gg.deals/game/magic-research/)
- Void Miner shipped on Armor Games (web), as a free Steam Prologue and as a $5.99 Steam game — [Armor Games](https://armorgames.com/void-miner-incremental-asteroids-roguelite-game/19585?fp=ng); [HTMAG](https://howtomarketagame.com/2026/04/28/void-miner/)
- Dwarf Eats Mountain moved from itch.io to a $9.99 Steam release with a demo — [itch.io](https://greenwizardgames.itch.io/dwarf-eats-mountain); [Top Incremental Games](https://www.topincrementalgames.com/games/dwarf-eats-mountain)
- A Game About Digging A Hole went from Steam to a mobile port after 1M+ copies — [Steam news](https://store.steampowered.com/news/app/3244220/view/537735054151909742)
- Mobile session length across genres: median ~4–6 minutes, top quartile ~7–9 minutes (2024 data) — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Steam price points of the short hits: $2.99 (Nodebuster, Digseum, Tower Wizard, Clickolding), $4.99 (Astro Prospector, Shelldiver, A Game About Digging A Hole), $5.99–$6.99 (Void Miner, Tiny Pasture, Bills Must Be Paid), $9.99 (Dwarf Eats Mountain) — sources as listed in section 1, e.g. [Raijin Digseum](https://raijin.gg/app/3361470/Digseum), [HTMAG](https://howtomarketagame.com/2026/08/20/part-2-the-week-of-the-golden-age/)
- Steam visibility depends on conversion, and a game that falls to "Mixed" loses visibility sharply — [GameDev Report](https://gamedevreport.beehiiv.com/p/lessons-from-a-hit-incremental-game-and-john-carmack-s-advice)
- Desktop-companion idlers (bottom-of-screen or taskbar) are a Steam-specific format with no web or mobile equivalent — [GamesRadar](https://www.gamesradar.com/games/simulation/after-selling-100000-copies-of-its-idle-stardew-valley-like-rustys-retirement-dev-celebrates-spawning-a-genre-of-games-that-run-at-the-bottom-of-your-screen/); [Windows Central](https://www.windowscentral.com/gaming/this-free-steam-game-is-being-played-more-than-stellar-blade-and-elden-ring-nightreign-even-though-its-just-a-cat)

### Inferences
- Typical web-to-Steam delta, from the examples: remove ads, add Steam Cloud, achievements, audio/music, localisation and (for long games) a content update timed with the port. The games themselves stay the same; the "extra" is polish and platform integration.
- Steam buyers judge at 2–10 hours for a $3–$7 game and accept free long-form idlers if monetisation is not felt. A free web idle game heading to Steam can either stay free with optional supporter purchases (Unnamed Space Idle model) or become a small premium purchase with the web build as demo (Void Miner, Cookie Clicker model).
- Mobile requires design for ~5-minute check-ins and robust offline calculation; Melvor's experience suggests offline/background handling is the hardest technical part of a mobile port.
- Cross-platform cloud save is an expectation implied by the cross-platform successes (Melvor on three platforms), but it was not directly evidenced by a player-sentiment source in this session.

### Gaps
- No direct developer writeups on the Unnamed Space Idle, Kittens Game, Antimatter Dimensions mobile, Idle Slayer or Magic Research ports were retrieved.
- No sourced data on web-player expectations (session length on Galaxy.click, CrazyGames, Kongregate, Armor Games) was found.
- No sourced statement on player expectations for achievements, controller/Steam Deck support, or content-hours-per-dollar for incrementals was found.
- Cloud-save and offline-progress expectations per platform are inferred, not cited.

## 6. Onboarding and the first 10 minutes

### Takeaway
No authoritative benchmark for time-to-first-upgrade or time-to-first-prestige was found. Available advice converges on staggering complexity, showing a concrete preview of what a prestige gives before asking for the reset, and delivering a sense of progression within minutes, which is also why incrementals perform well as demos.

### Cited Findings
- Incremental demos succeed because they "give players a sense of progression within minutes" and keep people playing until they can afford the next upgrade — [Zero1](https://zero1.gg/features/steam-next-fest-october-2026-most-played-demos)
- Developer-facing guide: "dump all that in the first 10 minutes and new players will bail"; reveal systems progressively, grey out advanced tabs, and use tooltip-style onboarding when a system unlocks — [Apptrove](https://apptrove.com/how-to-make-an-idle-game/)
- A developer critique on itch.io: prestige needs a clear "why" before players press reset; show a concrete preview of the gain, and gate extra systems behind milestones to prevent early overwhelm and create mid-game unlock moments — [itch.io comment](https://itch.io/post/15616223)
- Player guides disagree on when to take the first prestige (immediately, at ~3 prestige points, or when it would double prestige currency), and note the first run is slow while later runs clear early stages in minutes — [Onirealms guide](http://onirealms.com/guides/prestige-rebirth-ascension-explained/); [Playbrain guide](https://playbrain.games/blog/idle-clicker-strategy-guide-prestige-tips)
- Players ask "first prestige timing?" on Steam forums, which shows the timing is often unclear in-game — [Steam discussion](https://steamcommunity.com/app/4599710/discussions/0/580552228184771442/)
- The demo-length convention among recent hits is about 40 minutes (Void Miner Prologue) — [Steam](https://store.steampowered.com/app/3785330/Void_Miner_Prologue__Incremental_Asteroids_Roguelite/)
- Clickolding delivers its whole arc in ~40 minutes, and MMO98 in ~4 hours — [Video Games Good](https://www.videogamesgood.com/post/review-clickolding-most-interesting-40-minute-games-ever-played); [incrementalgames.org](https://incrementalgames.org/game/mmo98)
- All-genre mobile D1 median is ~22% and top-decile ~40%, so most new players are lost on day one — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)

### Inferences
- The unfolding style (new tabs and systems appearing as milestones are hit, with a tooltip at the moment of unlock) is the consensus over an explicit up-front tutorial.
- Because players disagree about when to prestige, the game should say so itself: show the gain, show a recommended threshold, and make the first reset feel unmistakably faster.
- A practical proxy from the demo data: the first 30–40 minutes should contain the whole core loop including the first reset-and-reinvest cycle, since that is the slice recent hits expose to players as a demo.
- Depth should be hinted early (visible but locked tree branches, greyed tabs) without being interactive, so that optimiser-type players see there is more while newcomers are not overloaded.

### Gaps
- No quantitative benchmark was found for time-to-first-upgrade, time-to-first-automation or time-to-first-prestige in successful incrementals.
- No developer postmortem with first-session funnel data for an incremental was found.
- GDC material on idle onboarding (Pecorella 2016) was not readable in this session.

## 7. Ethical / "respectful" design trends and backlash against manipulative retention

### Takeaway
The highest-rated incrementals of 2023–2026 are finite, cheap or fairly free, and carry no streaks or pressure timers, while the idle games with the weakest Steam sentiment are those with felt pay-to-win pressure. Streak-based login bonuses and time-limited rewards are explicitly classified as pressure tactics by an EU consumer-education resource, and an academic paper frames the genre as "cozy turned exploitative".

### Cited Findings
- The EU's Better Internet for Kids resource describes streak-based daily login bonuses as a pressure tactic and says time-limited rewards make players feel they will regret missing out — [Better Internet for Kids](https://better-internet-for-kids.europa.eu/adwiseonline/fomo)
- An academic article titled "Idle Games: A Cozy Genre Turned Exploitative" exists in the journal Replay (2024); only the title and record were retrieved — [Replay journal](https://czasopisma.uni.lodz.pl/Replay/article/view/23588)
- Some web idle games still advertise FOMO openly, e.g. "Miss a Season, miss the skin forever" — [itch.io page](https://peralstudio.itch.io/cookie-empire-idle-cookie-clicker)
- IdleOn's review trajectory (75% overall, 50% recent in one snapshot) is tied by reviewers to purchase pressure and falling behind without buying — [Steam](https://store.steampowered.com/app/1476970/IdleOn/); [Niklas Notes](https://niklasnotes.com/dashboard/game/134915/idleon)
- By contrast, the premium short incrementals with no ongoing monetisation hold 91–99% positive (Nodebuster 97%, Tower Wizard 96–97%, Keep on Mining 94%, Shelldiver 98–99%, Bills Must Be Paid 97%) — [Top Incremental Games](https://www.topincrementalgames.com/lists/incremental-games-with-skill-trees); [Steam](https://store.steampowered.com/app/3372980/Tower_Wizard/); [Raijin](https://raijin.gg/app/3769130/Keep_on_Mining); [incrementalgames.org](https://incrementalgames.org/best/active-incremental-games-steam)
- "A clear ending" is used as a marketing line by Magic Research 2 — [App Store](https://apps.apple.com/app/magic-research-2/id6478566840)
- A developer devlog on offline progression concludes offline gains can be "too strong" and are not needed if the game is short, and proposes capping offline earnings at the cost of the current upgrade — [itch.io devlog](https://ledoc.itch.io/get-rich-quick/devlog/526093/offline-progression)
- Cookie Clicker's Steam version is noted by players for having no advertisements — [Steam discussion](https://steamcommunity.com/app/1454400/discussions/0/3124928618240339286)
- Player-attention research treats attention itself as the resource idle games spend, and reports that idle games reward return rather than continuous presence — [ACM DOI](https://doi.org/10.1145/3173574.3174195); [NSF PAR follow-up](https://par.nsf.gov/servlets/purl/10174274)
- A wider consumer movement against losing access to purchased games (Stop Killing Games, after The Crew shutdown) shows the strength of reaction to lost progress or access — [Wikipedia](https://en.wikipedia.org/wiki/Always-on_DRM)

### Inferences
- "Respectful" in current practice means: a finite arc or clearly optional endless mode, offline gains that reward returning without punishing absence, no streaks or expiring rewards, no ads on paid platforms, and prestige that is previewed and never feels like a loss. The market data (review scores) lines up with this.
- Mechanics that take something away while the player is absent (decay, churn, lost users) run against both the research framing (reward the return) and the sentiment pattern, and are likely to read as punishing unless they are small, clearly communicated and recoverable. This is an inference; no direct player evidence on decay mechanics was captured.
- For a free game, the reputational risk is concentrated in monetisation and FOMO, not in difficulty or length.

### Gaps
- No Reddit or Steam evidence specifically about streak pressure, churn penalties or decay-while-away mechanics in incrementals was captured (search budget exhausted).
- The content of "Idle Games: A Cozy Genre Turned Exploitative" was not read.
- No statements from respected incremental developers explicitly describing an anti-FOMO design policy were retrieved.
