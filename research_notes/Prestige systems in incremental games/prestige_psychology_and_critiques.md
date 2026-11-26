# Prestige psychology and critiques (why reset mechanics work or fail for players)

Method note for the report writer: the session's network blocked full-page fetches (gamedeveloper.com, par.nsf.gov and a Reddit mirror all failed to resolve), so the findings below come from search-engine result summaries of the cited pages, not from reading each page in full. Quotes are short excerpts as the search tool relayed them. Where the search tool did not clearly tie a quote to one specific thread, this is flagged as "attribution approximate". Academic papers (Alharthi et al., Fizek, Spiel et al., Buergi) could be confirmed as existing and summarised at abstract level only; I could not confirm what each says about prestige specifically.

## 1. Why does voluntarily resetting progress feel good, and what makes it feel bad?

### Takeaway
Prestige feels good when the reset reads as an investment that pays back fast: the player races through content that used to be slow, passes their old record, and reaches something new. It feels bad when it reads as a loss: unexplained, compulsory or timed, too costly relative to the gain, or leading back into the same slow content. Practitioner sources name loss aversion (and the sunk-cost framing of "banked" progress) as the main barrier, and the visible speed-up of the next run as what overcomes it. No controlled study of prestige psychology turned up.

### Cited Findings
**Why it feels good**
- The reset is framed as gain: a player-facing article describes resetting as feeling like "investing in future speed". — [Info-Casual Loop (blog, low authority)](https://info-casual-loop.pages.dev/post/how-to-reset-progress-without-regret-in-idle-games)
- The post-reset rush is the central payoff: "The first run to your first prestige is the slowest part of most idle games. After it, you race through the early stages in minutes, pass your old record, and reach new content… That feeling of breaking through is why the mechanic works so well." — [Onirealms, "When to Prestige in Idle Games"](http://onirealms.com/guides/prestige-rebirth-ascension-explained/)
- Layered prestige supplies variable or ever-receding goals: "Each layer resets the one below it and gives a bigger, slower bonus, so the game always has a next goal." — [Onirealms](http://onirealms.com/guides/prestige-rebirth-ascension-explained/)
- Early prestiges work as "restart the game, but more powerful", and later ones shift toward respeccing. New "more powerful" restart mechanics then arrive with later systems. — [Steam, Unnamed Space Idle discussion "lacking Incentives to Prestige"](https://steamcommunity.com/app/2471100/discussions/0/570371162116295527/)
- Players come to crave the reset once it visibly speeds up what follows. A higher layer opens a new optimization problem. — [gamedesign.gg, "Idle and Incremental Game Design: The Design of Waiting"](https://gamedesign.gg/articles/idle-and-incremental-game-design/)
- Prestige "must feel like acceleration, not punishment". The next run should feel faster within about 30 seconds. — [DEV Community, "I Built 7 Idle Games in 30 Days"](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)
- Naming and fiction change the feel. One dev renamed the reset "Reboot the Network" so it reads as consolidating power rather than losing progress. The same dev argues that without a reset players hit a wall and quit, and with one they restart willingly. — [DEV Community, Doomscroll 2077 devlog (economy and prestige)](https://dev.to/tanishpaul1106/aura-data-and-prestige-designing-the-economy-of-doomscroll-2077-293f)
- Community view: a prestige should make sense in the game's world and lead somewhere. Evolve's prestige "always makes it clear why a given run is being scrapped". — [r/incremental_games thread via mirror (attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- Industry framing: Pecorella describes prestige as a reset that gives the player a production bonus, "similar to the 'new game+' concept". — [Pecorella, "Quest for Progress", GDC Europe 2016 slides (GDC Vault PDF)](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- "Resetting with a multiplier" is described as one of the key mechanics behind most modern idle games. It was popularised by Orteil's Cookie Clicker. — [Pecorella, "The Math of Idle Games, Part III", Game Developer](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)

**Loss aversion and sunk cost (why players resist)**
- Players hoard progress and grind at a wall instead of resetting, even though a few quick resets would leave them further ahead. The guide attributes this to loss aversion and calls resetting too late "the most common mistake". — [click2.app, "Idle RPGs Explained: How Offline Progress, Rebirth and Ascension Actually Work"](https://click2.app/blog/what-is-an-idle-rpg-offline-progression/)
- A behavioural-design writer distinguishes the two biases. Loss aversion is the general overweighting of losses. Sunk cost adds treating past investment as still at stake. Loss aversion is "necessary but not sufficient" to explain sunk-cost behaviour. — [Yu-kai Chou, "Sunk Cost Prison" (Game Technique #50)](https://yukaichou.com/chou-musings/sunk-cost-prison-game-technique-50/)
- Academic work on loss aversion and sunk cost in games targets monetisation and retention generally, not prestige. — [ResearchGate, "How Game Design Incentivize Heavy Engagement and Over Consumption"](https://www.researchgate.net/publication/387454689_How_Game_Design_Incentivize_Heavy_Engagement_and_Over_Consumption); [arXiv 2504.10714, "Playing to Pay" (Korean mobile games)](https://arxiv.org/pdf/2504.10714)

**Why it feels bad**
- "Prestige done poorly is incredibly frustrating": a poorly designed first prestige can wipe out weeks of progress and leave the player feeling powerless. — [r/incremental_games, "Do you prefer games with or without prestige" (Feb 2025, mirror; attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- Some players would "much rather receive whatever boost or unlock the prestige provides without having to perform the mandatory reset". — [same thread (attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- Felt punishment from unexplained resets: a player found a reset "quite harsh, with no explanation of what it does", and felt unrewarded after giving up most of their progress. — [itch.io, Pressure Factory comments](https://lightedgames.itch.io/pressure-factory)
- A reviewer felt prestige "does nothing but hold the player back" when, after a first prestige, the endgame threshold was still far away. — [itch.io comment threads surfaced by search (attribution approximate)](https://itch.io/post/14747828)
- If the reset "feels compulsory, confusing, or too costly", it "breaks the comfort of the genre". A good mechanic gives a choice and lets you take it when the moment feels right. — [Droplet Idle, "A Gentle Guide to Idle Game Prestige Mechanics"](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- Prestige should be a choice, not a requirement. One commenter compares it to a shovel versus a bulldozer: both should reach the goal. — [itch.io, Factory Time comments](https://deniszholob.itch.io/factory-time)

### Inferences
- The cited mechanisms fall into two groups: (a) **reframing the loss** (fiction and naming, a permanent currency that survives, a visible preview of the gain) and (b) **paying it back fast** (a noticeable speed-up within the first minute, passing the old record soon). Sources that praise prestige stress (b) more than (a). A well-explained reset that leads to a slow, same-feeling run still gets criticised.
- "Mastery" is implied rather than named. The satisfaction of a faster second run comes partly from the player's knowledge (which upgrades to buy first, when to reset), not only from the multiplier. No source in this sweep measured or argued this explicitly (see Gaps).
- For Ship It, "ship a release" has an unusually strong built-in fiction. Shipping is an accomplishment, not a loss, which is the kind of "reason for the reset" the community praises.

### Gaps
- No peer-reviewed or controlled study of why prestige resets feel good or bad was found. The psychology claims are practitioner and community opinion.
- No source in this sweep explicitly discussed "mastery" or "power fantasy" by name as a prestige motivator. The power-fantasy point is supported only by descriptive guides (the Onirealms "race through the early stages" quote).
- Raph Koster, Jesse Schell, Game Maker's Toolkit and "number go up" essays were not reached with the available tools.

## 2. What does the academic and industry literature say?

### Takeaway
The core industry reference is Anthony Pecorella (Kongregate). His GDC 2015 talk, GDC 2016 "Idle Chatter", GDC Europe 2016 "Quest for Progress" and the 2016–17 "Math of Idle Games" series treat prestige as a second loop on top of the core loop and give the most-cited timing heuristic: reset at a +50% to +200% gain in prestige currency. The "prestige variation" idea (changing the rules between runs) also comes from this work. The academic literature (Alharthi et al. 2018, Fizek 2018, Spiel et al. 2019, Buergi 2024) frames idle games around waiting, delegation and ethics. I could confirm only abstract-level content, not prestige-specific analysis.

### Cited Findings
**Pecorella / Kongregate**
- GDC 2015, "Idle Games: The Mechanics and Monetization of Self-Playing Games": the talk examines the core and metagame loops to explain why idle games retain players so well and why they are viable free-to-play businesses. — [GDC YouTube](https://www.youtube.com/watch?v=Lu-RjxeDpU8); [Game Developer video post](https://www.gamedeveloper.com/business/video-the-mechanics-and-monetization-of-self-playing-games); [slides on SlideShare](https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367); [archive.org slide text](https://archive.org/stream/GDC2015Pecorella/GDC2015-Pecorella_djvu.txt)
- A third-party summary of that talk says the prestige loop "creates a new gameplay loop within the overall game structure", with players balancing speed against power gains. It also notes "instant prestige" purchases as a monetisation route. — [videohighlight summary of the GDC 2015 talk (AI-generated summary, treat with caution)](https://videohighlight.com/v/Lu-RjxeDpU8?mediaType=youtube&language=en&summaryType=default&summaryId=g_5se4sBsUrX9gQR7Qz0&aiFormatted=false)
- GDC 2016 "Idle Chatter" lists **prestige variation**, changing the game rules when prestiging to keep the game fresh, as a 2015 genre innovation. — [Idle Chatter, GDC 2016 slides](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260)
- GDC Europe 2016 "Quest for Progress: The Math and Design of Idle Games" gives a common rule of thumb: reset when you would gain somewhere in the range of +50% to +200% prestige currency. It also covers player sentiment toward growth and complexity. — [GDC Vault PDF](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf); [SlideShare](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)
- "The Math of Idle Games, Part III" (Game Developer, 1 Feb 2017; based on his MIGS 2016 talk) covers prestige loops. It analyses real-world examples and how to vary them to keep things interesting, including how much a player must earn relative to the previous run to double their prestige currency. — [Game Developer](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii); [Kongregate mirror](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii); [Kongregate blog intro](https://blog.kongregate.com/quest-for-progress-the-math-of-idle-games)

**Other industry writing**
- Eric Guan's "Idle Game Design Principles" (Substack, June 2025) frames the core loop as generate-and-reinvest, with pacing that follows decaying player engagement. I could not confirm a prestige section. — [Eric Guan, Substack](https://ericguan.substack.com/p/idle-game-design-principles)
- "Balancing Tips: How We Managed Math on Idle Idol" describes modelling prestige-point bonuses in spreadsheets. — [Game Developer](https://www.gamedeveloper.com/design/balancing-tips-how-we-managed-math-on-idle-idol)
- Hevipelle (Antimatter Dimensions) took multi-layer prestige from Realm Grinder, automation from Transport Defender and challenges from Idle Wizard, and "took most of those aspects further". He singles out the Reality layer for having "plenty of choices to make and variance between player experiences". — [IncrementalDB interview with Hevipelle](https://www.incrementaldb.com/community/interview/31)
- In Antimatter Dimensions, prestige *layers* reset progress for a special currency that "defines a new area of content in the game" (Infinity, Eternity, Reality). — [Wikipedia, Antimatter Dimensions](https://en.wikipedia.org/wiki/Antimatter_Dimensions)
- Cookie Clicker's ascension resets cookies, buildings and most upgrades in exchange for prestige levels and heavenly chips. — [Wikipedia, Cookie Clicker](https://en.wikipedia.org/wiki/Cookie_Clicker). Prestige is computed from all-time cookies baked, not the bank, and the bonuses only switch on after buying the "Legacy" heavenly upgrade. — [Cookie Clicker Wiki, Ascension guide](https://cookieclicker.wiki.gg/wiki/Ascension_guide); [Fandom, Heavenly Chips](https://cookieclicker.fandom.com/wiki/Heavenly_Chips)

**Academic**
- Alharthi, Alsaedi, Toups, Tanenbaum and Hammer, "Playing to Wait: A Taxonomy of Idle Games" (CHI 2018) used grounded theory on 66 idle games. The taxonomy has two dimensions: key features (e.g. micro-management, single-resource, multi-player) and a continuum of required interactivity from "clicker" to "zero-player". — [ACM DOI 10.1145/3173574.3174195](https://doi.org/10.1145/3173574.3174195); [Monash research portal](https://research.monash.edu/en/publications/playing-to-wait-a-taxonomy-of-idle-games/); full text at [NSF PAR](https://par.nsf.gov/servlets/purl/10061230) (could not be fetched)
- Spiel, Alharthi, Cen, Hammer, Nacke, Toups and Tanenbaum, "'It Started as a Joke': On the Design of Idle Games" (CHI PLAY 2019, pp. 495–508): interviews with six designers of six popular idle games (including Tap Titans and Progress Quest). Thematic analysis refines genre definitions and identifies "ethically charged practices of care" in their design. — [NSF PAR record](https://par.nsf.gov/biblio/10174274-started-joke-design-idle-games); [CHI PLAY Medium summary](https://medium.com/chi-play/it-started-as-a-joke-on-the-design-of-idle-games-f4e17ad3eaf3)
- Fizek, "Interpassivity and the Joy of Delegated Play in Idle Games" (ToDiGRA 3(3), 2018) applies Pfaller and Žižek's "interpassivity" (delegated enjoyment) to idle games. It argues the genre challenges the view of games as systems driven by meaningful choices. — [ToDiGRA](https://todigra.org/index.php/todigra/article/view/1754); [CMU ETC Press](https://press.etc.cmu.edu/articles/interpassivity-and-joy-delegated-play-idle-games)
- Buergi, "Idle Games: A Cozy Genre Turned Exploitative" (Replay 12, 2024): idle games can fit the cozy genre, but monetisation raises ethical problems and undercuts their calm appeal. Waiting is the central mechanic, which produces steady progress but also prompts frequent returns to optimise. — [Replay article page](https://czasopisma.uni.lodz.pl/Replay/article/view/23588). A secondary guide reads Buergi as arguing some developers "turned players' impatience into a business". — [Onirealms, "What Is an Idle Game?"](https://onirealms.com/guides/idle-games-explained/)
- Wikipedia summarises: the reset, often called "prestige", typically grants permanent bonuses across future runs. Some games stack multiple layers that unlock new content, meta-currencies or modes. When progression slows, players strategically reset to accelerate. — [Wikipedia, Incremental game](https://en.wikipedia.org/wiki/Incremental_game)

### Inferences
- The industry literature is mostly about **economy math and timing**: when a reset is optimal, how the prestige formula scales. The academic literature is mostly about **what idle play is**: waiting, delegation, ethics of retention. The psychology of the reset decision sits between the two, and I found no source that studies it directly.
- Pecorella's "prestige variation" and Hevipelle's "variance between player experiences" make the same point: the most praised prestige systems change *how you play*, not just *how fast*.
- Buergi and Spiel et al. raise an ethics angle that matters for a free game. Since Ship It has no monetisation, it can adopt the "respect the player" end of the spectrum without commercial tension (e.g. no paid "instant prestige").

### Gaps
- I could not read the full Alharthi, Spiel, Fizek or Buergi texts, so I cannot say whether or how each treats prestige.
- I could not read the full Pecorella Part III text (Game Developer was blocked). Specific formulas (e.g. AdVenture Capitalist's angel formula, Cookie Clicker's cube root) are not cited here. Secondary guides conflict on Cookie Clicker's exact formula.
- No Orteil design commentary on why ascension exists or why it is designed as it is turned up. Only mechanics guides did.

## 3. What makes a *first* prestige land well?

### Takeaway
Practitioner sources agree that the first reset is the hardest one to take, so it should be (1) flagged or signposted at a set stage, (2) placed at a natural wall where resetting is the obvious answer, (3) previewed (what you gain, what carries over), (4) clearly worth it, with a noticeable speed-up almost immediately, and (5) voluntary and untimed. Suggested timing ranges from "within a couple of hours" (community) to whenever progress visibly stalls. No source discussed undo for prestige.

### Cited Findings
- The game can flag the rebirth button at a set stage "because the first reset is the hardest one to take". A reset "only works if it clearly pays off". — [Onirealms, "How to Design an Idle Game: Formulas From 4 Shipped Games"](https://onirealms.com/guides/how-to-design-an-idle-game/)
- Walls are where players decide to upgrade, reset or put the phone down, so place them where a clear answer exists. — [Onirealms, "How to Design an Idle Game"](https://onirealms.com/guides/how-to-design-an-idle-game/)
- Show "a clear preview of your prestige reward and the changes it will make" before confirmation, and make clear what carries over. — [Droplet Idle, "A Gentle Guide to Idle Game Prestige Mechanics"](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- After the reset, the run should feel faster within about 30 seconds. — [DEV Community, "I Built 7 Idle Games in 30 Days"](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)
- One developer suggested the first prestige should arrive "within a couple of hours", depending on how many prestiges the game plans. — [r/incremental_games, "Noob incremental game developer looking for…" (Sep 2022, mirror; attribution approximate)](https://axebps-redlib.hf.space/r/incremental_games/comments/xk6sa7/noob_incremental_game_developer_looking_for)
- Players asked developers to state prestige bonuses up front. One player "reset several times… without knowing prestige was a thing". — [itch.io comment threads surfaced by search (attribution approximate)](https://moon-mole-games.itch.io/mana-flow-flower-grow/comments)
- In Cookie Clicker, prestige bonuses stay inactive until the player buys the "Legacy" heavenly upgrade, which acts as a gateway step after the first ascension. — [Cookie Clicker Wiki, Ascension guide](https://cookieclicker.wiki.gg/wiki/Ascension_guide)
- Prestige rewards often scale with the current run, so waiting a little increases value, but waiting too long means watching numbers crawl for little extra benefit. — [Droplet Idle](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- Pecorella's +50% to +200% rule of thumb concerns *subsequent* resets, as a gain relative to existing prestige currency. — [Quest for Progress, GDC Vault PDF](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- A community dev formula for Cookie Clicker-style games: make each prestige point cost more of the main currency than the previous one, without resetting that cost curve. This tends to make prestiging around a x2–x5 bonus optimal. — [r/incremental_games threads via mirror (attribution approximate)](https://redlib.hbubli.cc/r/incremental_games/comments/1e8gl1c/key_considerations_for_creating_an_incremental)

### Inferences
- The +50% to +200% heuristic does not apply to the first prestige, because the player starts from zero. The first reset needs an absolute target instead: a boost the player can *feel* (community heuristics point to roughly x2 or more on output) plus a visible new thing (a perk to buy).
- For Ship It specifically: at +10% output per star, a first release worth only 1–3 stars (+10–30%) would fall well short of the "clearly pays off" and x2–x5 bars. Either the first release should be tuned to give enough stars for a felt difference, or the first perk purchase should supply a qualitative change (e.g. an automation unlock) that makes the second run obviously different within the first ~30 seconds.
- Ship It already previews the gain as a diff and asks for confirmation, which covers the "preview" item. The remaining first-prestige levers are signposting the button at a wall (so players do not miss it or fear it) and guaranteeing an early "faster than last time" moment.
- Undo: since none of the sources discuss it, a cheap alternative is to make the first release obviously safe (explicit keep and lose lists, perhaps a one-line in-fiction reassurance) rather than build an undo.

### Gaps
- No source with data on first-prestige timing or conversion (e.g. the percentage of players who reach and take their first prestige) was found.
- No discussion of undo or regret features for prestige was found.

## 4. What do r/incremental_games and design essays criticise and praise about prestige?

### Takeaway
The most common criticisms are: resets that take too much relative to the gain; forced, timed or unexplained resets; prestige that is mandatory rather than optional; new layers that *replace* earlier gameplay or just repeat it; and half-working automation that leaves tedious manual resets. The most praised features are: each layer changing the gameplay (new content, rules or choices); optional, tunable automation of resets; meaningful choices with variance between runs; and a clear in-world reason for the reset. Evidence is community opinion from Reddit mirrors, itch.io and Steam threads, not systematic surveys.

### Cited Findings
**Criticisms**
- Forced prestige timers are loathed. One developer responded by adding a manual prestige option behind a research unlock. — [itch.io comment threads (attribution approximate)](https://itch.io/post/14170390)
- Players say they quit quickly when there is a time limit of more than about a minute and no way to reset manually. — [itch.io comment threads (attribution approximate)](https://itch.io/post/15600710)
- Many incrementals are described as "waiting for numbers to reach an arbitrary point", then being disoriented by a pile of upgrades, then being "forced to prestige". — [itch.io developer comment surfaced by search (attribution approximate)](https://pixelabor.itch.io/incremental-knight)
- New layers often "outright replace the earlier gameplay rather than extend it". Planning ahead avoids this. — [r/incremental_games, "Key considerations for creating an incremental" (Jul 2024, mirror; attribution approximate)](https://redlib.hbubli.cc/r/incremental_games/comments/1e8gl1c/key_considerations_for_creating_an_incremental)
- A slow prestige with little gain is "a bad system", though a game built for long play can justify repetition ("the appeal of the game is to be long"). — [r/incremental_games, "Do you prefer games with or without prestige" (mirror; attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- Half-working automation frustrates. In Idle Spiral, auto-buy was heavily restricted and auto-prestige was "only good once, maybe twice" because of scaling costs. The player argued that if they must click buy anyway they might as well prestige manually, and never used auto-prestige. — [Steam, Idle Spiral discussion](https://steamcommunity.com/app/1827980/discussions/0/3883851232913830967)
- Late in a game, prestige can stop being worth waiting for. Revolution Idle players recommend setting the auto-prestige delay as low as possible because "prestige resets nothing at that stage". — [Steam, Revolution Idle discussion](https://steamcommunity.com/app/2763740/discussions/0/599641410463890765)
- Hidden or unclear bonuses: see Section 3 (players resetting without knowing prestige exists). — [itch.io comments (attribution approximate)](https://moon-mole-games.itch.io/mana-flow-flower-grow/comments)
- Some players prefer no prestige at all. Opinion in the community is divided. — [r/incremental_games, "Do you prefer games with or without prestige" (mirror)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)

**Praise**
- Auto-prestige as a satisfying endpoint: a player set auto-prestige at a threshold, idled for hours, and noted each prestige yielded more than the last. — [itch.io comment (attribution approximate)](https://itch.io/post/14172241)
- Prestige variation (rule changes per run) is credited with keeping games fresh. — [Pecorella, Idle Chatter, GDC 2016](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260)
- Antimatter Dimensions' Reality layer is praised by its creator for choices and run-to-run variance. Each AD layer "defines a new area of content". — [IncrementalDB interview](https://www.incrementaldb.com/community/interview/31); [Wikipedia](https://en.wikipedia.org/wiki/Antimatter_Dimensions)
- A reset with a clear in-world reason (Evolve) is cited approvingly. — [r/incremental_games thread (attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- Players welcome auto-prestige when it is optional, tunable and clearly saves time, and resent it when it is mandatory or only half-automates the loop. This is the search tool's synthesis across the itch.io and Steam threads above. — [Factory Time comments](https://deniszholob.itch.io/factory-time); [Idle Spiral Steam](https://steamcommunity.com/app/1827980/discussions/0/3883851232913830967)

### Inferences
- The "prestige every 5 minutes is busywork" criticism and the "automate the reset" praise are two sides of one principle: a reset the player no longer needs to *decide* about should be automated. A reset that remains a real decision should be rare enough to feel meaningful.
- "Too many layers or currencies" did not surface as an explicit, well-sourced complaint in this sweep. The closest is "layers replace rather than extend". With one layer, Ship It sidesteps this, but the same logic applies to the perk tree: perks that only add percentages will feel like "the same thing again", while perks that change *how* a run plays (automation, sprint and incident modifiers) address the most common praise point.

### Gaps
- I could not open highly upvoted Reddit threads directly to verify vote counts or exact wording. Thread attributions are approximate.
- No formal design essay focused on "too many prestige layers" or "opaque prestige formulas" was found, though "unexplained reset" complaints overlap with the opacity criticism.
- No source quantified how often a "trap choice" in prestige trees is cited.

## 5. How do active and idle playstyles interact with prestige?

### Takeaway
Active play favours short, frequent resets and short sessions. Idle play favours longer runs, offline gains and fewer resets. Games accommodate both with separate builds or upgrade paths (Clicker Heroes' idle versus active Ancients), hybrid patterns (idle until progress stalls, then go active), and automation or offline generation that turns past active performance into idle income (Antimatter Dimensions' upgrade that generates a percentage of your best IP/min from your last 10 Infinities, offline). Sources disagree on which style dominates late game in Clicker Heroes.

### Cited Findings
- Clicker Heroes: idle is easier for beginners, and active can be faster in short sessions but takes more attention. Idle builds dominate long sessions. — [Clicker Heroes official blog, Player's Guide & Strategy (may be machine-written; treat with caution)](https://blog.clickerheroes.com/clicker-heroes-players-guide-strategy/)
- The fan wiki contradicts this: use idle Ancients for early-mid game and switch to active after roughly zone 18K, because idle is weak late. — [Clicker Heroes Fandom, General Tips](https://clickerheroes.fandom.com/wiki/General_Tips)
- Hybrid is common: idle until fast kills stop, then switch to active. — [Steam, Clicker Heroes "Idle or active click?"](https://steamcommunity.com/app/363970/discussions/0/152391995420223689/). Another thread argues the game pushes toward idle-like progress at high levels, which blurs the line. — [Steam, "Active vs Idle vs Hybrid"](https://steamcommunity.com/app/363970/discussions/0/152390648076218966/)
- Fast prestige runs in Clicker Heroes reward active play. — [SimpleIdle, "Active vs Passive Play in Idle Games" (possibly machine-written)](https://www.simpleidle.com/learn/active-vs-passive-play)
- Antimatter Dimensions has a repeatable upgrade that generates a percentage of your best IP/min from your last 10 Infinities and works offline. This converts active run performance into passive income. — [AD Fandom, Infinity Upgrades](https://antimatter-dimensions.fandom.com/wiki/Infinity_Upgrades); [AD Endgame wiki, Break Infinity](https://adendgame.wiki.gg/wiki/Break_Infinity)
- Pecorella frames players as balancing speed against power gains when choosing prestige timing. — [videohighlight summary of GDC 2015 talk (AI summary)](https://videohighlight.com/v/Lu-RjxeDpU8?mediaType=youtube&language=en&summaryType=default&summaryId=g_5se4sBsUrX9gQR7Qz0&aiFormatted=false)
- Fast early ramps come from autobuyers or strong first milestones. Reset when a run's payoff drops. — [Onirealms, "When to Prestige"](http://onirealms.com/guides/prestige-rebirth-ascension-explained/)

### Inferences
- The gain-relative-to-current-currency heuristic (+50–200%) automatically adapts to both styles: active players hit the threshold sooner and reset more, and idle players hit it after an offline session. A gain preview that shows *rate* (gain per minute of the current run) lets each style pick its own optimal moment.
- For Ship It, sprints need a taps-per-second rate, so active players will reach release thresholds faster. To avoid making idle players feel excluded, perks could offer parallel active and idle routes (e.g. one perk branch boosting sprint and bug rewards, another boosting offline and automation output), mirroring Clicker Heroes' idle versus active Ancients. A "best run" based passive bonus (AD-style) could reward active play with idle income.

### Gaps
- No quantitative data on prestige frequency by playstyle was found.
- I did not find design writing that explicitly addresses balancing one prestige formula across both playstyles. The above is inferred from game examples.

## 6. How is prestige communicated in UI?

### Takeaway
Well-regarded patterns are: a preview of the gain before committing, explicit statements of what carries over, a choice of when to reset (no forced timer), and post-run statistics that let players judge whether a reset or strategy helped. Antimatter Dimensions' "last 10 Infinities" table (time, gain, gain per minute, averages) is the canonical example. I found no sourced guidance on reset celebrations or animations.

### Cited Findings
- Antimatter Dimensions' Statistics tab shows the last 10 Infinities with each run's time, IP gain and IP per minute, plus averages (average time, average IP, IP per hour). — [AD Fandom, Statistics](https://antimatter-dimensions.fandom.com/wiki/Statistics)
- Players use the last-10 tables to judge whether a change helped, because run-to-run variance is significant ("go into statistics and look at your own last 10 resets"). — [Steam, Antimatter Dimensions discussion](https://steamcommunity.com/app/1399720/discussions/0/3770109979122558558)
- AD ties that statistic to a mechanic: generate a percentage of your best IP/min from the last 10 Infinities. — [AD Fandom, Infinity Upgrades](https://antimatter-dimensions.fandom.com/wiki/Infinity_Upgrades)
- Recommended: a clear preview of the prestige reward and the changes it will make before confirming, and clarity on what carries over. — [Droplet Idle](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- Signpost or flag the rebirth button at a set stage. — [Onirealms, "How to Design an Idle Game"](https://onirealms.com/guides/how-to-design-an-idle-game/)
- Make the post-reset speed-up obvious, so the reset reads as a fast-forward. — [gamedesign.gg](https://gamedesign.gg/articles/idle-and-incremental-game-design/)
- Players ask for a manual reset button when resets are timed. — [itch.io comment threads (attribution approximate)](https://itch.io/post/15600710)
- Cookie Clicker's wiki tracks how many heavenly chips are needed to buy recommended upgrades for each ascension. This suggests players want a target-oriented view (what can I buy next with this reset). — [Cookie Clicker Wiki, Ascension guide](https://cookieclicker.wiki.gg/wiki/Ascension_guide)

### Inferences
- Gain-per-minute is the most useful single number for the reset decision, because it shows when continuing stops paying (Droplet Idle's "numbers crawl" point). Ship It's diff preview could add "stars per minute this run" and a comparison with the previous release.
- A "last N releases" log (time, stars, stars per minute) fits Ship It's terminal theme naturally (like a `git log` or changelog) and gives players the self-measurement AD players value.
- Pairing the preview with "what you'll be able to buy" (e.g. "enough for perk X") connects the gain to a concrete goal, as Cookie Clicker players do via the wiki.

### Gaps
- No source on celebration, animation or "juice" at the moment of reset was found.
- No source comparing confirmation-dialog designs (e.g. checkbox "don't ask again", or hold-to-confirm) for prestige was found.

## 7. Is there evidence on the retention effects of prestige?

### Takeaway
There is evidence that idle games as a genre retain well (Kongregate's statements, genre benchmarks of roughly D1 50–70%, D7 30–40%, D30 15–20% for top idle games). I found no published data isolating the retention effect of prestige itself, nor first-prestige conversion figures. The frequently repeated "~35% retention" figure from Pecorella's 2015 talk could not be pinned to a specific day or game.

### Cited Findings
- Kongregate states that idle games rank highly on retention, a key free-to-play KPI. — [Wikipedia, Kongregate](https://en.wikipedia.org/wiki/Kongregate)
- A summary of Pecorella's GDC 2015 talk reports retention "around 35%", described as good, without saying which day it measures. — [videohighlight summary (AI summary)](https://videohighlight.com/v/Lu-RjxeDpU8?mediaType=youtube&language=en&summaryType=default&summaryId=g_5se4sBsUrX9gQR7Qz0&aiFormatted=false). The GDC 2015 slides note retention is "often very high", with no breakdown by prestige stage. — [archive.org slide text](https://archive.org/stream/GDC2015Pecorella/GDC2015-Pecorella_djvu.txt)
- Genre benchmark deck: top idle games show D1 about 50–70%+, D7 about 30–40%+, D30 about 15–20%+. — [David Chiu deck, "Idle Clicker Games: Why are They So Popular…" (SlideShare)](https://www.slideshare.net/jessicatams1/idle-clicker-games-why-are-they-so-popular-and-how-can-i-get-in-on-the-action-david-chiu)
- A third-party estimate puts AdVenture Capitalist's retention at a flat ~30% from day 29 onward. These are modelled, not measured, figures. — [Thinkgaming](https://thinkgaming.com/app-sales-data/31442/retention/)
- Developer claim (anecdotal): without a reset, players hit a wall and quit; with one, they restart willingly. — [DEV Community, Doomscroll 2077 devlog](https://dev.to/tanishpaul1106/aura-data-and-prestige-designing-the-economy-of-doomscroll-2077-293f)

### Inferences
- The retention case for prestige rests on mechanism, not measured effect. Prestige converts a "wall" (a quit point) into a decision point, and gives a reason to return (the next run is faster). This is consistent with, but not proven by, the genre's high retention.
- For a small free game, the relevant "retention" is whether players reach and enjoy the second run. Tracking local stats (time to first release, whether a second release happens) would be the only way to know for Ship It.

### Gaps
- No public A/B test or cohort analysis comparing idle games with and without prestige was found.
- No data on what share of players take their first prestige, or on churn around the first reset, was found.
- I could not verify a "D7 ~35% for AdVenture Capitalist" claim that appeared in search snippets. The [Global Games Forum piece on AdVenture Capitalist design lessons](https://www.globalgamesforum.com/features/idle-game-design-lessons-from-developing-adventure-capitalist) may contain relevant data but could not be read.

## 8. Concrete do's and don'ts that designers and players repeatedly cite

### Takeaway
The recurring advice across Pecorella's talks, practitioner guides and community threads: make the reset a visible, voluntary, well-explained investment that pays back fast and changes something; automate it once it is no longer an interesting decision; never force, time or hide it.

### Cited Findings
**Do**
- **Do make the first reset obviously worth it.** It "only works if it clearly pays off", and the first reset is the hardest one to take. — [Onirealms, "How to Design an Idle Game"](https://onirealms.com/guides/how-to-design-an-idle-game/)
- **Do make the speed-up felt fast,** within about 30 seconds of the new run. — [DEV Community, "7 Idle Games in 30 Days"](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f); [gamedesign.gg](https://gamedesign.gg/articles/idle-and-incremental-game-design/)
- **Do signpost the prestige button at a set stage or wall,** where resetting is the clear answer. — [Onirealms, "How to Design an Idle Game"](https://onirealms.com/guides/how-to-design-an-idle-game/)
- **Do preview the reward and what carries over before confirmation.** — [Droplet Idle](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- **Do give the reset an in-world reason.** — [r/incremental_games thread (Evolve example; attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige); [Doomscroll 2077 renaming](https://dev.to/tanishpaul1106/aura-data-and-prestige-designing-the-economy-of-doomscroll-2077-293f)
- **Do tune repeat resets around a meaningful relative gain** (+50% to +200% prestige currency per Pecorella; x2–x5 bonus per a community formula). — [Quest for Progress PDF](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf); [r/incremental_games (attribution approximate)](https://redlib.hbubli.cc/r/incremental_games/comments/1e8gl1c/key_considerations_for_creating_an_incremental)
- **Do vary the rules or content between runs or layers** ("prestige variation"; each layer "defines a new area of content"). — [Idle Chatter GDC 2016](https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260); [Wikipedia, AD](https://en.wikipedia.org/wiki/Antimatter_Dimensions)
- **Do offer meaningful choices with run-to-run variance.** — [Hevipelle interview](https://www.incrementaldb.com/community/interview/31)
- **Do automate resets once they stop being interesting, and make the automation optional, tunable and complete.** — [Idle Spiral Steam](https://steamcommunity.com/app/1827980/discussions/0/3883851232913830967); [Revolution Idle Steam](https://steamcommunity.com/app/2763740/discussions/0/599641410463890765); [itch.io auto-prestige praise (attribution approximate)](https://itch.io/post/14172241)
- **Do show run history with gain per minute** so players can measure themselves. — [AD Statistics](https://antimatter-dimensions.fandom.com/wiki/Statistics); [Steam AD discussion](https://steamcommunity.com/app/1399720/discussions/0/3770109979122558558)
- **Do plan layers so they extend earlier play rather than replace it.** — [r/incremental_games (attribution approximate)](https://redlib.hbubli.cc/r/incremental_games/comments/1e8gl1c/key_considerations_for_creating_an_incremental)

**Don't**
- **Don't force or time the prestige,** and provide a manual reset. — [itch.io threads (attribution approximate)](https://itch.io/post/14170390); [itch.io](https://itch.io/post/15600710)
- **Don't make prestige mandatory to progress** where avoidable; let it be the bulldozer, not the only shovel. — [Factory Time comments](https://deniszholob.itch.io/factory-time); [r/incremental_games (attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige)
- **Don't reset without explaining what it does,** or hide that prestige exists. — [Pressure Factory comments](https://lightedgames.itch.io/pressure-factory); [itch.io comments (attribution approximate)](https://moon-mole-games.itch.io/mana-flow-flower-grow/comments)
- **Don't take more than you give back,** for example a first prestige that wipes weeks for a small gain, or that leaves the player further from the goal. — [r/incremental_games (attribution approximate)](https://reddit.birdcat.cafe/r/incremental_games/comments/1itf1er/do_you_prefer_games_with_or_without_prestige); [itch.io (attribution approximate)](https://itch.io/post/14747828)
- **Don't ship half-automation** that still requires manual clicking around an "automatic" reset. — [Idle Spiral Steam](https://steamcommunity.com/app/1827980/discussions/0/3883851232913830967)
- **Don't make the reset compulsory, confusing or too costly;** it "breaks the comfort of the genre". — [Droplet Idle](https://dropletidle.com/pages/blog/guide-to-idle-game-prestige-mechanics/)
- **Don't let the player sit at a wall without a clear answer.** Walls are where players put the phone down. — [Onirealms](https://onirealms.com/guides/how-to-design-an-idle-game/); [click2.app on reset hoarding](https://click2.app/blog/what-is-an-idle-rpg-offline-progression/)

### Inferences
- Applied to Ship It's existing design, the list suggests checking: (1) first-release star yield and first perk so that run 2 is visibly faster within ~30 seconds; (2) a signpost when output stalls ("ready to ship?"); (3) adding gain per minute and a last-N-releases log to the existing diff preview; (4) perks that change play (automation, sprint and incident modifiers, idle versus active branches) rather than only percentages; (5) an optional auto-ship or auto-rebuy once releases become routine; (6) no forced or timed releases.
- The "trap choices" concern applies to a 10-perk tree: perks that are strictly dominated, or irreversible picks with no respec, risk the "choices that are traps" complaint. No source in this sweep gave specific guidance, so this is an inference from the general "meaningful choices" praise.

### Gaps
- Do's and don'ts about celebration or animation, undo, and "too many currencies" are not sourced here (see earlier Gaps).
- The list draws heavily on practitioner blogs and community threads. Pecorella's slides are the only high-authority industry source I could verify, and only at summary level.
