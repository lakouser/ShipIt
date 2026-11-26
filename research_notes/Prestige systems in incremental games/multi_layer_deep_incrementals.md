# Multi-layer prestige, challenges and reset automation in "deep" incremental games (case studies)

> Method note for the report writer: this session's network allowed direct page fetches only from GitHub (raw.githubusercontent.com). Fan wikis (fandom.com, wiki.gg mirrors, pages.dev, etc.) could not be fetched directly, so the wiki-derived claims below come from search-engine result summaries of those pages, and the URL cited is the page the summary named. Antimatter Dimensions (AD) and Kittens Game claims marked "source code" were read directly from the games' public GitHub repositories and are the most reliable claims here. Where a search summary did not make clear which of several returned pages a claim came from, I say so.

## 1. Layer-by-layer structure of each game: what each layer resets, what it keeps, and when it first happens

### Takeaway
The respected deep games stack 3 to 6 reset layers. Each layer is triggered by a large threshold on the previous layer's currency, and pays out a new currency, often based on a log of the previous one. Each layer wipes everything below it except a growing list of items that are kept on purpose. Exact time-to-layer figures are rarely documented. The games publish thresholds instead, and the few player anecdotes put AD's first Infinity at hours to days, and each later layer at days to weeks.

### Cited Findings

**Antimatter Dimensions (AD). Read from the game's in-game How To Play text in its GitHub source.**
- **Sub-prestige resets inside a run.** A Dimension Boost "resets your antimatter and all of your Antimatter Dimensions". The first 8 boosts each unlock a new Dimension, and later boosts unlock nothing. An Antimatter Galaxy resets you back to four Dimensions and strengthens Tickspeed. Dimensional Sacrifice (unlocked at the 5th Dimension Boost) "will immediately reset the owned quantity of all non-Eighth Dimensions to zero" in exchange for a persistent 8th-Dimension multiplier. — [AD h2p.js (source)](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Infinity (Big Crunch).** It triggers at about 2^1024 antimatter and resets antimatter, Dimensions, Boosts and Galaxies. "Each Infinity completed will give an Infinity Point." Infinity Upgrades must be bought top to bottom. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Break Infinity.** It is unlocked when the Big Crunch autobuyer interval is maxed, or after Eternity. It removes the antimatter cap and scales IP gain beyond the cap. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **New producers inside the Infinity layer.** Infinity Dimensions are bought with IP. Each produces the tier below, and "every crunch, your produced Infinity Dimensions are reset to the amount you purchased" while multipliers are kept. Replicanti unlock at 1e140 IP and self-replicate. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Eternity.** It triggers at the IP cap and "resets everything except challenge times, Achievements, and the General statistics". It gives Eternity Points (EP). After the first Eternity the player unlocks Time Dimensions (bought with EP; they produce Time Shards, which become free Tickspeed upgrades), Time Studies (a tree bought with Time Theorems, which are not reset on Eternity; it has exclusive branches and 6 preset slots, and respec only happens on Eternity), Eternity Challenges and later Time Dilation. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Reality.** It requires 1e4000 EP and the first 13 achievement rows. It gives Reality Machines, one Glyph (equipment with a type, level, rarity and up to 4 effects) and one Perk Point. "Starting a new Reality will reset almost the entire game up to this point". It also takes away the first 13 achievement rows, but keeps the General statistics and best challenge times. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Celestials (7, after Reality).** Each one is a special Reality with its own rules and its own new mechanic:
  - Teresa: pour Reality Machines into a container.
  - Effarig: Relic Shards and a 3-layer Reality.
  - The Nameless Ones: store game time and real time, and amplify Realities.
  - V: V-Achievements give Space Theorems that let you buy normally forbidden Time Studies.
  - Ra: memories level up the earlier Celestials and unlock Glyph Alchemy.
  - Lai'tela: Dark Matter Dimensions and an Annihilation reset.
  - Pelle: "Doom your Reality" resets the game back to Reality and disables many upgrades, perks and rewards. It has its own Armageddon reset for Remnants, and its "Strikes" add nerfs and unlock "Rifts".
  — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js); Pelle text from [the same file, past character 100000](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Timing (anecdotal only).**
  - The wiki's "Introduction Era" (10 to 1e130 antimatter) is estimated at 8 hours to 2 days. — [AD wiki Guide, via search summary](https://antimatter-dimensions.fandom.com/wiki/Guide)
  - One Steam player got "through infinity in probably 2-3 days" and found Eternity "a much bigger wall". — [Steam discussion](https://steamcommunity.com/app/1399720/discussions/0/3732953219568038272) (search summary; possibly one of the other AD threads it returned)
  - Total completion estimates of 550 to 1,900 hours are unsourced aggregates. — [vaporlens summary](https://vaporlens.app/app/1399720/antimatter_dimensions.md); [zestico blog](https://zestico.pages.dev/posts/long-games-that-are-worth-putting-time-into)

**Synergism (Platonic / Pseudo-Corp)**
- **Ladder:** Prestige → Transcension → Reincarnation → Ascension → Singularity. — [Synergism review, playwanderer](https://playwanderer.online/game-reviews/synergism); [Miraheze wiki](https://incrementalgames.miraheze.org/wiki/Synergism)
- **Prestige:** unlocked at 1e16 coins. It gives Diamonds and resets coin-related resources. — [Synergism wiki: Prestige](https://synergism.fandom.com/wiki/Prestige); [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Transcend:** unlocked at 1e100 coins. Challenges 1 to 5 are Transcension challenges, and entering one forces a Transcension reset. — [Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism); [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Reincarnate:** unlocked at 1e300 Mythos Shards. It introduces Particles and Obtainium. — [Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism); [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Ascension** is gated behind clearing Challenge 10. — [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Singularity** "resets the entire game whilst both buffing and nerfing certain aspects of the game". — [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Explicit persistence tiers.** The September 2026 update colour-codes research by persistence: "White: These reset on Ascension; Gold: These reset on Singularity; Red: These never reset". It also made "Quark Researches now NEVER reset". — [IncrementalDB update, 25 Sep 2026](https://www.incrementaldb.com/update/29319880-ffc0-49fb-9a54-840f44b618bd); [Synergism changelog v4.3.1](https://changelog.synergism.cc/c/v4.3.1%20-%20September%202026%20QoL)

**Realm Grinder (Divine Games)**
- **Three soft resets:** Abdication, Reincarnation and Ascension. — [musicfamily Realm Grinder reference](http://musicfamily.org/realm/Reset/); [RG wiki: Soft Resets](https://realm-grinder.fandom.com/wiki/Soft_Resets)
- **Abdication** "will reset all buildings, upgrades and coins, but you will keep your trophies". Unlocked factions, completed challenges, discovered artifacts, and rubies with their upgrades also carry over. Gems (the abdication currency) persist across abdications. — [musicfamily: Abdication](http://musicfamily.org/realm/Abdication/); [allgameguides](https://allgameguides.com/games/realm-grinder/guides/tips/)
- **Reincarnation** "will reset all your stats, your excavations and remove all your gems". It gives Reincarnation Power and unlocks new mechanics. Each reincarnation after the first costs 1,000× more gems. — [RG wiki: Reincarnation](https://realm-grinder.fandom.com/wiki/Reincarnation); [musicfamily](http://musicfamily.org/realm/Reset/)
- **Ascension** is a special Reincarnation. The Reincarnation button becomes Ascension at the end of R39, R99, R159 and R219. — [NamuWiki](https://en.namu.wiki/w/Realm%20Grinder); [RG wiki](https://realm-grinder.fandom.com/wiki/Reincarnation)
- **Factions:** 16 factions in three alignments, picked each run. — [PC Gamer guide](https://www.pcgamer.com/realm-grinder-guide/)

**Trimps**
- **Helium and the Portal.** Helium is unlocked by beating the Dimension of Anger and is spent on Perks. To spend it you must use the Portal (soft reset). The first clear awards a fixed 45 Helium. Some perks are hidden until a challenge is completed, for example Range from the Discipline challenge. — [Trimps wiki: Helium](https://trimps.fandom.com/wiki/Helium); [Perks](https://trimps.fandom.com/wiki/Perks)
- **Universe 2.** A later "universe" reruns the game with a new currency, Radon, and its own Radon challenges. Pandemonium grants permanent bonuses that apply in both Universe 1 and Universe 2. — [Trimps wiki: Pandemonium](https://trimps.fandom.com/wiki/Pandemonium); [NamuWiki](https://en.namu.wiki/w/Trimps)

**NGU Idle**
- **Rebirth loses** resources, Basic Training levels, boss progress, Augments, Time Machine levels, Advanced Training and blood. **It keeps** EXP and EXP purchases, AP, inventory items, NGU levels, Yggdrasil fruits, Wandoos OS levels and Digger levels, and already-unlocked tabs stay unlocked. — [NGU wiki: Rebirths](https://ngu-idle.fandom.com/wiki/Rebirths)
- **Difficulty modes are a "super-prestige".** Switching Normal → Evil → Sadistic works like starting a challenge: the NUMBER and last-rebirth factors reset to 1 and banked levels are lost. Sadistic unlocks after beating boss 300 on Evil. — [NGU wiki: Evil difficulty](https://ngu-idle.fandom.com/wiki/Evil_difficulty); [SADISTIC difficulty](https://ngu-idle.fandom.com/wiki/SADISTIC_difficulty)

**Kittens Game**
- **Reset carry-over.** A reset keeps karma, paragon (including burned paragon), metaphysics upgrades, temporal flux, achievements, stats and epiphany. Karma requires more than 35 kittens. Paragon requires more than 70 kittens, at one point per kitten over 70. Gigaflops, hashrate, worship and luxury resources are lost. — [Kittens wiki: Game Mechanics](https://wiki.kittensgame.com/en/general-information/game-mechanics)
- **Chronospheres** carry a fraction of resources into the next run, and cryochambers carry kittens into a reserve that can be reclaimed. — [kittensgame challenges.js (source)](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/challenges.js)
- **Scale.** The Steam page lists "two separate prestige systems" alongside religion, metaphysics, time, a challenge system and space. — [Steam store](https://store.steampowered.com/app/1097410/Kittens_Game/) (via search summary)

**Exponential Idle**
- **Supremacy** is the 2nd layer: it "restarts the game at b=0.001 and resets all variables, regular upgrades, and prestige upgrades", and grants ψ. — [ExpIdle wiki: Instructions](https://exponential-idle.fandom.com/wiki/Instructions)
- **Graduation** is the 3rd layer: it resets variables and normal, prestige and supremacy upgrades for "students", which unlock theories. — [ExpIdle wiki: Graduation](https://exponential-idle.fandom.com/wiki/Graduation)
- **Theories** are parallel mini-games with their own internal prestige, "publication", which resets only that theory's currency and upgrades. — [Exponential Idle Guides glossary](https://exponential-idle-guides.netlify.app/guide-extensions/glossary/)

**Revolution Idle**
- **Layers:** Infinity is the first layer and Eternity the second (reached at about 1.80e308 IP). A third layer, Unity, is described by guides as in development or unlocking at 1.08e2466 EP, and the sources conflict. — [Steam guide 3418722355](https://steamcommunity.com/sharedfiles/filedetails/?id=3418722355); [Steam guide 3408307617](https://steamcommunity.com/sharedfiles/filedetails/?id=3408307617)

**The Prestige Tree (Jacorb)**
- **A tree, not a ladder.** Each node is a prestige layer. Row 1 holds Prestige. Row 2 holds Boosters and Generators. Row 3 holds Time, Enhance, Space, Super Boosters and Super Generators. Row 4 holds Quirks, Hindrance, Solarity and Subspace. Row 5 holds Magic, Balance and Phantom Souls. Rows 6 and 7 add later layers. Resetting a layer earns the next row's resource, and "resources also affect the nodes connected to them". — [Prestige Tree wiki](https://prestige-tree.fandom.com/wiki/Prestige_Tree); [Miraheze](https://incrementalgames.miraheze.org/wiki/Prestige_Tree)
- **Side layers.** The developer docs say "side layers are unaffected by resets unless the developer adds a reset function". — [Prestige-Tree docs/layer-features.md](https://github.com/Jacorb90/Prestige-Tree/blob/master/docs/layer-features.md)

**Clicker Heroes**
- **Ascension** (Hero Souls, spent on Ancients) sits under **Transcendence**. Transcendence resets Hero Souls, Ancients, relics, zone progress and gilds. It keeps Ancient Souls, Outsiders, rubies, Auto Clickers, achievements and mercenaries. The first Transcension is typically reached around zone 300. — [Clicker Heroes official blog: Transcendence guide](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/); [When should you transcend](https://blog.clickerheroes.com/when-should-you-transcend-zone-300-and-beyond-explained/)
- **Outsiders** are reset by neither ascension nor transcension. — [Steam discussion](https://steamcommunity.com/app/363970/discussions/0/4515507601684544249/)
- **Payout curve.** Ancient Souls are about 5 × log10(Hero Souls sacrificed): 5 AS for every 10× Hero Souls. — [CH blog: Ancient Souls per transcension](https://blog.clickerheroes.com/ancient-souls-per-transcension-how-to-maximize-your-gain/)

### Inferences
- **Common skeleton.** Layer N+1 unlocks at a large threshold on layer N's currency. It pays a new currency based on a log or root of layer N's peak, and resets everything in layers ≤ N except an explicit "keep list". Synergism's colour-coded "resets on Ascension / Singularity / never" research is the clearest UI for this keep list, and a small game could copy it directly, for example by tagging each perk "kept on Release / kept on Major Version / permanent".
- **Not every layer is a ladder rung.** Some "layers" are modes: NGU difficulties, Trimps Universe 2, AD Celestials, Kittens challenges. Others are trees (Prestige Tree) or parallel sub-games with their own mini-prestige (ExpIdle theories). A small game can add depth sideways, as modes or variants of its one layer, instead of stacking more rungs.

### Gaps
- Reliable "time played" for first Eternity or Reality (AD), first Reincarnation (Synergism), first Ascension (Realm Grinder), first Portal zone (Trimps), or first Supremacy and Graduation (ExpIdle) was not found. Only thresholds and isolated anecdotes exist in reachable sources. A Synergism Steam thread titled "How long does it take to do first Reincarnation?" exists, but its content could not be read: [Steam thread](https://steamcommunity.com/app/3552310/discussions/0/807975131067675512/).
- Exponential Idle's first layer (plain "prestige") and Kittens Game's Paragon and Karma effects were not detailed in the reachable sources.
- Derivative Clicker was not researched because of the tool budget and its low relevance.

## 2. What new layers add beyond a bigger multiplier (layers that change how the game plays)

### Takeaway
The best-regarded layers each add a new verb or system: new producers (AD Infinity, Time and Dark Matter Dimensions), a build tree with presets and respec (AD Time Studies), equipment with random rolls (AD Glyphs), a scripting language (AD Automator), factions (Realm Grinder), parallel sub-games (ExpIdle theories), whole new universes (Trimps U2), or rule-changing modes (NGU difficulties, AD Celestials). Reviews repeatedly credit AD's reputation to "each layer changing what the previous one means rather than just multiplying it".

### Cited Findings
- **AD Infinity** adds Infinity Points and an upgrade grid, Normal Challenges and autobuyers, then Break Infinity, Infinity Dimensions (a second producer chain that boosts the first via Infinity Power) and Replicanti (a self-replicating resource that makes free Galaxies). — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Eternity** adds Time Dimensions, a Time Study tree with exclusive branches, presets and "respec only on Eternity", Eternity Challenges, and Time Dilation (a mode that raises multiplier exponents to 0.75 and gives a currency that "is never reduced"). — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Reality** adds:
  - Glyphs, an itemization layer, and Perks, which are mostly "QoL (quality of life) improvements which you can choose your own path through".
  - The Black Hole, which periodically speeds up the game.
  - The **Automator**: "The Automator uses a scripting language that allows you to automate nearly the entire game", with a block editor because "the block mode may be more approachable if you are unfamiliar with programming".
  — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Celestials** each change the rules: forbidden Time Studies (V), Dark Matter Dimensions with an Annihilation reset (Lai'tela), and a "Doomed Reality" that disables upgrades (Pelle). — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Reviews of AD's layering.**
  - One review calls AD the genre's "reference point": "dimensions feeding dimensions, then Infinity, then Eternity, then Reality".
  - Search summaries also attribute two claims to reviews, without saying which page each came from: that the layers each bring "new currencies, challenges and rule changes", and that "Steam recommendations repeatedly praise how each prestige era adds decisions instead of merely slowing the same currency".
  — [playwanderer AD review](https://playwanderer.online/game-reviews/antimatter-dimensions); [Incremental Atlas AD page](https://incrementalatlas.com/games/antimatter-dimensions/)
- **Realm Grinder.** Factions are picked per run (16 factions in 3 alignments). Reincarnation adds Reincarnation Power and new mechanics, and "players describe ... new mechanics arriving every other Reincarnation". One community comment calls the second prestige loop "much more interesting than the first". — [PC Gamer](https://www.pcgamer.com/realm-grinder-guide/); [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/RealmGrinder) (search summary)
- **Synergism** adds a distinct sub-system at each layer: Diamonds, then Mythos, then Particles and Obtainium at Reincarnation. — [Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism)
- **A critical review of Synergism** is titled "a huge reset ladder that doesn't always reinvent itself". It notes "every long-tail incremental eventually automates its own early game so attention can move to the frontier". — [playwanderer Synergism review](https://playwanderer.online/game-reviews/synergism)
- **Exponential Idle Graduation** unlocks theories: "parallel projects that contribute to the main equation", each with its own "publication" reset. — [ExpIdle Graduation](https://exponential-idle.fandom.com/wiki/Graduation); [Glossary](https://exponential-idle-guides.netlify.app/guide-extensions/glossary/)
- **The Prestige Tree** lets the player choose the order of branches. Layer resets buff distant nodes, and some layers add challenges ("Hindrances") or a mastery system. — [Prestige Tree wiki](https://prestige-tree.fandom.com/wiki/Prestige_Tree)
- **Kittens Game.** The "Metaphysics" upgrade calls itself "absolutely useless" but unlocks New Game Plus upgrades. Adjustment Bureau (Metaphysics) unlocks challenge runs. — [TV Tropes / Kittens wiki](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/KittensGame) (via search summary)
- **General critique.** One itch.io commenter argues reset layers "have an unfortunate habit of replacing really fun and unique gameplay with more generic 'buy upgrade, wait til you can afford the next' gameplay". — [itch.io post](https://itch.io/post/15617742) (via search summary; exact post among the returned itch.io links not confirmed)

### Inferences
- **The most-praised pattern:** each new layer ships at least one new decision type, not only a stat: a tree with respec, gear with rolls, a script editor, a faction choice, or a mode with rule changes. For Ship It, a second layer above "ship a release" should add a new verb. Candidates, all speculative:
  - Pick a tech stack or framework per run, like Realm Grinder factions.
  - A respec-able skill tree with presets, like AD Time Studies.
  - A real scripting automator, like the AD Automator. This fits a terminal or code theme almost too well.
- **Free novelty for a small game.** AD's Automator shows that "automation as a mechanic" (programming the game) can itself be the reward of a late layer. Ship It already has "timed scripts", so letting those grow into a tiny script language is a natural, theme-matched layer reward.

### Gaps
- No developer interview (Hevipelle, Platonic, Divine Games) explaining the intent behind layer novelty could be fetched. The reachable sources were wikis, source code and reviews.

## 3. Challenges: how restricted runs work, what they reward, and why players like or dislike them

### Takeaway
Challenges are optional restricted re-runs of a layer. You enter, everything resets, a rule changes, and you must hit the layer's normal goal under that rule. They reward three different things depending on the game:
- **Permanent automation or QoL:** AD Normal Challenges give autobuyers.
- **Permanent production or stacking bonuses:** AD Infinity and Eternity Challenges, Kittens, Trimps C² and Pandemonium.
- **Lump sums of prestige currency:** Trimps Helium challenges.

Repeatable challenges use rising goals and diminishing-returns caps (AD Eternity Challenges up to 5 completions, Kittens limited diminishing returns).

### Cited Findings
- **AD Normal Challenges** unlock after the first Infinity. They "change in-game mechanics in different ways to create more difficult Infinity circumstances", and "each completed Normal Challenge will award an autobuyer or the ability to upgrade an existing autobuyer". Only the first completion rewards. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Normal Challenge restrictions** (from source):
  - C2: buying dimensions or tickspeed halts production.
  - C4: buying a dimension erases lower tiers.
  - C8: Boosts give no multiplier and Galaxies are disabled.
  - C10: only 6 Dimensions exist.
  - C12: each Dimension produces the one two tiers below.

  The rewards map one-to-one: C1 to C8 give the 1st to 8th Dimension autobuyers, C9 the Tickspeed autobuyer, C10 Dimension Boosts, C11 Galaxies, and C12 the Big Crunch autobuyer. C10 to C12 are locked until later. — [AD normal-challenges.js (source)](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/challenges/normal-challenges.js)
- **AD Infinity Challenges** are "harder than Normal Challenges" and their rewards "boost production directly rather than unlocking autobuyers". They are unlocked by antimatter thresholds. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Eternity Challenges** are unlocked through the Time Study tree. Each has "up to five completions, with rising goals and rewards". Rewards persist even after the study is respecced, and only one can be active at a time. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Pelle (late game)** removes the normal reward links: "none of the Normal Challenges will unlock autobuyers if completed". Automation must be re-bought via Pelle Upgrades. — [AD h2p.js offset 100000](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Kittens Game challenges** (from source): Iron Will, Winter Is Coming, Anarchy, Energy, Atheism, 1000 Years, Black Sky, Pacifism, Unicorn Tears (feature-flagged) and Post-Apocalypse.
  - **Completion goals:** reach the planet Helios (Winter Is Coming), build an AI Core (Anarchy), reach zero pollution (Post-Apocalypse), and so on.
  - **Effects:** each has an "active" penalty and an "inactive" reward that is multiplied by the completion count. A "limited diminishing returns" (LDR) limit or magnitude cap keeps stacking in check. A code comment on Pacifism says "after 10 completions weapons WILL be useles; no LDR >:3".
  - **Entering:** challenges are toggled as "pending" and applied at the next reset, except Iron Will, which resets immediately.
  — [kittensgame challenges.js (source)](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/challenges.js)
- **Kittens challenge rules.** Challenges reset the game but still award paragon and karma as normal. Chronospheres do not bring resources into a challenge, except Post-Apocalypse. — [Kittens wiki: Challenges](https://wiki.kittensgame.com/en/game-tabs/challenges)
- **Trimps challenge types.**
  - Helium (and Daily) challenges award a lump sum that is a multiple of all Helium earned so far in the current Portal.
  - Challenge² runs unlock permanently after zone 65 and give permanent bonuses, but "during a Challenge² run, it is impossible to earn any Helium from any source".
  - Pandemonium is repeatable and grants a permanent, stacking, additive 10% bonus (Helium or Radon, attack, health, resources) per completion at zone 150.
  — [Trimps wiki: Challenges](https://trimps.fandom.com/wiki/Challenges); [Challenge²](https://trimps.fandom.com/wiki/Challenge%C2%B2); [Pandemonium](https://trimps.fandom.com/wiki/Pandemonium)
- **NGU Idle challenges.** Starting a challenge performs a rebirth and also resets the number and empties the Time Machine, Beard and Advanced Training banks. Some challenges are exceptions: Laser Sword resets nothing extra, and the Evil Basic Challenge has no restrictions. — [NGU wiki: Challenges](https://ngu-idle.fandom.com/wiki/Challenges)
- **Synergism challenges.**
  - Challenges 1 to 5 are Transcension challenges, and entering forces a reset. — [Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism)
  - The October 2026 update made Transcension Challenges stop scaling in difficulty "so that auto completions are more accurate". This is challenges designed to be automated. — [IncrementalDB update, 24 Oct 2026](https://www.incrementaldb.com/update/9552025e-9988-4611-bb42-115165edb04c)
  - A Steam patch note fixed "manually entering a challenge while Auto Challenge is running" kicking the player out. — [Synergism Steam hub](https://steamcommunity.com/app/3552310) (via search summary)
- **Realm Grinder** keeps completed challenges through Abdication. — [musicfamily: Abdication](http://musicfamily.org/realm/Abdication/)
- **Revolution Idle** has Eternity Challenges, which unlock at the 8 Σ milestone. — [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3418722355)
- **Player sentiment, Kittens.** Its challenges and pacing are praised. "Iron Will" (no kittens) is the oldest challenge, and "Winter Has Come" replaces the seasons with four winters. — [TV Tropes YMMV](https://tvtropes.org/pmwiki/pmwiki.php/YMMV/KittensGame); [Metafilter](https://www.metafilter.com/142228/The-incremental-to-surpass-all-incrementals) (via search summary)
- **Player sentiment, NGU Evil and Sadistic.** One reviewer found these modes' walls pointless: "nothing happens in Sadistic mode. You're just waiting around." — [Metacritic user reviews](https://www.metacritic.com/game/ngu-idle/user-reviews/) (via search summary)

### Inferences
- **AD's "challenge rewards = automation" mapping is the cleanest pattern for a small game.** Each challenge (a) teaches one mechanic by distorting it, and (b) pays out the autobuyer for that mechanic. The player automates exactly what they just mastered.
- **Kittens' "inactive bonus × completions, with diminishing returns" pattern** turns a few challenges into long-lived repeatable content cheaply.
- **Ship It ideas (speculative):** "Legacy codebase" (producers cost scales faster), "No QA" (bugs spawn ×3), "Solo dev" (only 4 producer tiers), "Hotfix Friday" (incidents constant). Reward: the autobuyer for the thing restricted, or a small stacking +X% per completion with a cap.
- **Two failure modes to avoid.** Challenges that remove all currency gain (Trimps C²) are accepted only because they give large permanent bonuses. Challenges that are just "wait longer" are what NGU players complain about.

### Gaps
- Exact Synergism challenge list and rewards (challenges 6 to 10, Ascension challenges 11 to 15) and Trimps' full challenge list could not be fetched. Only partial search summaries were available.
- No source quantified how many players skip challenges.

## 4. Automation: how and when games automate earlier layers, and the design principle

### Takeaway
The strongest consensus pattern is: **automate layer N once the player is working on layer N+1.** Automation is earned through challenges (AD), reset-count milestones (AD Eternity, Revolution Idle Σ), achievements (Synergism), late-zone rewards (Trimps) or a dedicated scripting system (AD Automator). In AD, the automation of a layer is even the key that unlocks that layer's next phase: maxing the Big Crunch autobuyer unlocks Break Infinity. Heavy gatekeeping of automation behind cooldowns is a top complaint (NGU), and losing automation on a higher reset is felt as a regression (Revolution Idle).

### Cited Findings
- **AD.**
  - Autobuyers live under Automation → Autobuyers, with settings for interval, bulk buy, Dimension Boost limits, Galaxy caps and "Dynamic Amount" prestige thresholds. Hotkeys toggle each one.
  - Break Infinity is "unlocked when the Big Crunch autobuyer interval is maxed".
  - Normal Challenges award the autobuyers (see section 3).
  — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js); [normal-challenges.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/challenges/normal-challenges.js)
- **AD Eternity milestones automate the Infinity layer step by step.**
  - 1: IP-multiplier autobuyer.
  - 3: Replicanti Galaxy autobuyer.
  - 5: more Big Crunch autobuyer options.
  - 9: buy-max Galaxies mode.
  - 11 to 18: one Infinity Dimension autobuyer each.
  - 50, 60, 80: Replicanti upgrade autobuyers.
  - 100: "Unlock autobuyer for Eternities", which automates the layer itself.

  See section 5 for the full table. — [AD eternity-milestones.js (source)](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/eternity/eternity-milestones.js)
- **The AD Automator** (Reality layer) is unlocked by accumulating Automator Points from Perks, Reality Upgrades, the Black Hole and completing Realities. It is "a scripting language that allows you to automate nearly the entire game", with block and text editor modes. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Revolution Idle.**
  - Auto Prestige comes from Infinity upgrade 5;3, Auto Promotion from 10;1, and Auto Infinity from 15;1. — [Revolution Idle wiki: Automation settings](https://www.revolution-idle.wiki/automation/revolution-idle-automation-settings)
  - Eternity wipes automations, but reaching 2 Σ (Eternity count) makes automations permanent, described as "the crucial QoL feature of the game". — [revolutionidle.com tips](https://revolutionidle.com/guide/tips-tricks)
  - 12 Σ brings auto-buy of the Infinity Tree, and 14 or 16 Σ brings Auto Eternity (sources conflict). — [Steam guide 3418722355](https://steamcommunity.com/sharedfiles/filedetails/?id=3418722355); [Steam guide 3408307617](https://steamcommunity.com/sharedfiles/filedetails/?id=3408307617)
  - A player complained that Eternity reset their automation settings without warning. — [Steam discussion](https://steamcommunity.com/app/2763740/discussions/0/597387460190669256) (search summary; may be one of the other two Revolution Idle threads returned)
- **Synergism.**
  - The auto-prestige feature is an achievement reward, and other achievement rewards start Transcensions or challenges with the Multiplier Autobuyer unlocked. — [Synergism wiki: Achievements](https://synergism.fandom.com/wiki/Achievements)
  - Patch notes mention reworked "auto-ascension rules", an "Auto Challenge" runner, and timers for auto Prestige, Transcension and Reincarnation. — [Synergism Steam hub](https://steamcommunity.com/app/3552310) (via search summary)
  - The October 2026 update de-scaled challenges to make auto-completion accurate. — [IncrementalDB](https://www.incrementaldb.com/update/9552025e-9988-4611-bb42-115165edb04c)
- **Trimps** automation is earned through late content:
  - AutoStructure from Bionic Wonderland III at zone 155 (since 5.3.0; previously a Mastery). — [Trimps wiki: AutoStructure](https://trimps.fandom.com/wiki/AutoStructure)
  - AutoEquip from beating a Void Map at zone 350+, and AutoUpgrade from "Break the planet". — [Trimps wiki: Upgrades](https://trimps.fandom.com/wiki/Upgrades)
  - Before and beyond these, the community used the AutoTrimps userscript, whose AutoPortal unlocks after zone 80, with custom portal and challenge settings. — [AutoTrimps GitHub](https://github.com/jrhamilt/autotrimps)
  - The paid Bone Trader sells a "Bone Portal" that grants Helium equal to the best run's earnings. — [Trimps wiki: Helium](https://trimps.fandom.com/wiki/Helium)
- **NGU Idle criticism.** One Steam reviewer says the game "would be far more hands-off if it did not gatekeep the automation stuff so heavily and eliminated the crazy cooldown timers". — [Steam negative reviews](https://steamcommunity.com/app/1147690/negativereviews/?browsefilter=toprated) (via search summary)
- **Design principle stated by a reviewer:** "every long-tail incremental eventually automates its own early game so attention can move to the frontier". — [playwanderer Synergism review](https://playwanderer.online/game-reviews/synergism)

### Inferences
- **Recommended structure for Ship It:**
  - Release #1 to #3: manual.
  - Challenges or early milestones: per-producer autobuyers.
  - Release milestone around N: "auto-ship when stars ≥ X". That is the auto-prestige, offered as a reward and configurable like AD's "Dynamic Amount".
  - A second layer: a mini script language or rule editor (AD Automator) that can drive sprints, incidents and shipping.
- **Never take back automation the player has earned when they climb a layer**, or restore it within 1 to 2 resets (Revolution Idle's 2 Σ milestone). Losing it reads as punishment.
- **Unlocking a layer's next phase by maxing its automation** (AD's Break Infinity) is a neat way to say "you've mastered this layer, here's what's next".

### Gaps
- No primary developer statement of "automate once uninteresting" was found. The principle is inferred from consistent design across games plus one reviewer's phrasing.
- Synergism's exact automation unlock thresholds were not retrievable.

## 5. Milestones that keep things across resets and shorten the early part of each run

### Takeaway
Games compress the early part of each run with reset-count milestones: "you start with X", "challenges auto-complete", "upgrades auto-bought", "passive generation offline". AD's Eternity milestones are the canonical list. Late-game equivalents include AD Reality's passive achievement unlock every 30 minutes, The Prestige Tree's "keep row 1 to 5 upgrades", Kittens' Chronospheres and cryochambers, and Trimps' Bone Portal.

### Cited Findings
- **AD Eternity milestones** (eternity count → reward, from source):

  | Eternities | Reward |
  |---|---|
  | 1 | IP multiplier autobuyer |
  | 2 | "You start Eternity with all Normal Challenges complete, all normal autobuyers, and infinity broken" |
  | 4 | "You start Eternity with all Infinity Upgrades" |
  | 6 | Offline EP gain at 25% of best EP/min |
  | 7 | "You complete Infinity Challenges as soon as you unlock them" |
  | 8 | Start with all Break Infinity Upgrades |
  | 10 | Start with Replicanti unlocked |
  | 25 | Infinity Dimensions auto-unlock |
  | 30 | "Start with all Antimatter Dimensions available for purchase" |
  | 40 | Replicanti Galaxies stop resetting antimatter and Dimensions |
  | 100 | Eternity autobuyer |
  | 200 | Offline Eternity generation at 50% of fastest rate |
  | 1000 | Offline Infinity generation |

  — [AD eternity-milestones.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/eternity/eternity-milestones.js)
- **AD milestone wording.** Milestones grant "starting upgrades (auto-purchased to max when an Eternity begins), new autobuyers, and offline passive generation". — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **AD Reality** takes away the first 13 achievement rows, but "you will also passively unlock the next incomplete Achievement every [30 minutes] without any effort even if you otherwise do not have the requirements to do so". — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Break Infinity** passively generates Infinities based on the fastest Infinity, as described in a Steam thread. — [Steam discussion](https://steamcommunity.com/app/1399720/discussions/0/507318484016910479) (via search summary)
- **The Prestige Tree** has milestones such as 10 Generators boosting Prestige Point gain. 1 total Super-Prestige Point keeps Row 1 to 5 upgrades and Hindrances through resets, and 5 keeps Balance milestones. — [Prestige-Tree-Classic index.html](https://github.com/Jacorb90/Prestige-Tree-Classic/blob/master/index.html) (via search summary)
- **Revolution Idle** milestones are Σ (Eternity count) based: 2 Σ makes automations permanent, 8 Σ unlocks Eternity Challenges, and 12 Σ auto-buys the Infinity Tree. — [revolutionidle.com tips](https://revolutionidle.com/guide/tips-tricks); [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3418722355)
- **Kittens Game.** Chronospheres reserve a share of resources for the next run, and craftables need Flux Condensator. Cryochambers keep the most experienced kittens in reserve. — [kittensgame challenges.js](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/challenges.js)
- **Trimps.** The Bone Portal grants the best-ever single-run Helium instantly. — [Trimps wiki: Helium](https://trimps.fandom.com/wiki/Helium)
- **Synergism.** Achievement rewards "start transcensions/challenges with Multiplier Autobuyer unlocked". — [Synergism Achievements](https://synergism.fandom.com/wiki/Achievements)
- **Realm Grinder.** Abdication keeps factions, challenges, artifacts, trophies and rubies. TV Tropes says "every Reincarnation is a new Early Game Hell, because you don't start out with any Gems". This is the counter-example: a layer whose early run is not compressed. — [musicfamily: Abdication](http://musicfamily.org/realm/Abdication/); [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/RealmGrinder)

### Inferences
- **AD's milestone ladder front-loads tiny counts.** Rewards come at 1, 2, 4, 7 and 8 Eternities, so the second and third runs of a new layer already feel dramatically faster. Rewards get sparser later (25, 30, 40, 100, 200, 1000).
- **Ship It analogue** for a release-count ladder: start with the first 4 producers unlocked, start with N lines of code, bugs auto-triaged, sprints auto-start, auto-ship.
- **"Passive catch-up" of lost progress** (AD's achievements every 30 minutes) is a cheap way to make a hard reset feel less punitive.

### Gaps
- Infinity-layer analogues inside AD (for example, Infinity Upgrades that keep Dimension Boosts) were not individually extracted.
- Synergism's full milestone list and Trimps' perk-based "start with" effects were not reachable.

## 6. Pacing between layers and how games signal that the next layer is coming

### Takeaway
Layers are spaced by orders of magnitude of the previous currency, and the spacing grows with each layer. Realm Grinder makes this explicit: Ascension comes at the end of R39, R99, R159 and R219, after 40 and then 60 Reincarnations. AD signals the next layer with explicit text and locked tabs ("You will be able to access more content after your first Eternity"), with a Time Study purchase that opens the Reality tab, and with a requirement list such as the first 13 achievement rows.

### Cited Findings
- **AD.**
  - Infinity is at about 2^1024 antimatter, Eternity at the IP cap, and Reality at 1e4000 EP plus 13 achievement rows. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
  - Teasers: "You will be able to access more content after your first Eternity". Reality: "you will be able to purchase the Time Study that unlocks Reality ... opens a new tab". — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
  - Many AD milestones need dozens or hundreds of Eternities: 100 for the Eternity autobuyer, 1000 for offline Infinity generation. — [AD eternity-milestones.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/eternity/eternity-milestones.js)
  - The second Black Hole unlocks after 100 days of game time. — [AD h2p.js](https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/secret-formula/h2p.js)
- **Realm Grinder.** Ascension at the end of R39, R99, R159 and R219. Each Reincarnation costs 1,000× more gems than the last. — [NamuWiki](https://en.namu.wiki/w/Realm%20Grinder); [musicfamily](http://musicfamily.org/realm/Reset/)
- **Synergism.** Layer thresholds are 1e16 coins (Prestige), 1e100 coins (Transcend), 1e300 Mythos (Reincarnate), and Challenge 10 cleared (Ascension). — [Miraheze](https://incrementalgames.miraheze.org/wiki/Synergism); [NamuWiki](https://en.namu.wiki/w/Synergism)
- **Clicker Heroes.** Transcendence is typically reached around zone 300, and guides advise waiting for at least 10 Ancient Souls. — [CH blog](https://blog.clickerheroes.com/when-should-you-transcend-zone-300-and-beyond-explained/)
- **Kittens Game.** Karma needs more than 35 kittens and paragon more than 70, so early resets give nothing. This implicitly signals "don't reset yet". — [Kittens wiki: Game Mechanics](https://wiki.kittensgame.com/en/general-information/game-mechanics)
- **Trimps.**
  - Challenge² is permanently unlocked after zone 65. — [Challenge²](https://trimps.fandom.com/wiki/Challenge%C2%B2)
  - A U2 guide warns against portaling at zone 16 on the first run, because zones before 20 give only 1 base Radon. — [Trimps NewPlayerGuide](https://trimps.fandom.com/wiki/Guide:NewPlayerGuide(Truth)) (via search summary)
- **NGU Idle.** Sadistic difficulty requires boss 300 on Evil. — [SADISTIC difficulty](https://ngu-idle.fandom.com/wiki/SADISTIC_difficulty)
- **Revolution Idle.** Eternity is at about 1.80e308 IP, and the next layer (Unity) at 1.08e2466 EP by one guide. — [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3408307617)
- **Exponential Idle** offers Supremacy "after reaching a certain point". Theory costs are 20σ for the first, 5σ for each of the next 7, and 40σ for the last. This paces sub-game unlocks with a currency rather than a reset count. — [ExpIdle Instructions](https://exponential-idle.fandom.com/wiki/Instructions); [Glossary](https://exponential-idle-guides.netlify.app/guide-extensions/glossary/)

### Inferences
- **Typical rhythm:** the first layer-N+1 reset after something like 10 to 100+ layer-N resets, with the next threshold far enough away that layer N must become automated.
- **Signposting for a small game:** a greyed-out tab or "???" button with a visible requirement, like AD's achievement-row requirement or Realm Grinder's R-count. One-line teaser text after the first reset of a layer.
- **Ship It example (speculative):** after Release #1, show a locked "v2.0 (Major Version)" tab: "Requires 50 stars and 10 releases".

### Gaps
- No source documents explicit "???" teasers outside AD's text, or how Synergism and Trimps telegraph Ascension and Universe 2.
- No numeric "average resets before next layer" data exists beyond Realm Grinder's R-counts.

## 7. Community critiques: best-in-class versus criticized prestige structures

### Takeaway
- **Best-in-class:** AD is praised as the genre's reference ladder because each layer adds decisions. Kittens Game is praised for pacing and challenges. Realm Grinder's second loop is praised as "much more interesting than the first".
- **Common criticisms:**
  - Walls and mandatory waiting (NGU late Evil and Sadistic, AD's walls, Synergism's pacing).
  - Automation gatekept behind cooldowns (NGU).
  - "Early Game Hell" on every reset (Realm Grinder).
  - Opaque late layers that need guides (AD Reality, Revolution Idle).
  - Factions or layers that look different but play the same (Realm Grinder per Gamezebo; Synergism per playwanderer).

### Cited Findings
- **AD praise.** One review scores AD 9.0/10 and calls it the reference point: "Antimatter Dimensions built the dimension-to-Infinity-to-Eternity-to-Reality reset ladder every modern incremental borrows from". — [playwanderer AD review](https://playwanderer.online/game-reviews/antimatter-dimensions)
- **AD criticism.** "Reality is where the self-teaching breaks down." Another review cites "glacial walls and guide dependence demand patience long before the payoff". — [playwanderer AD review](https://playwanderer.online/game-reviews/antimatter-dimensions); [Incremental Atlas](https://incrementalatlas.com/games/antimatter-dimensions/) (search summary; attribution of the "glacial walls" quote between these two pages is uncertain)
- **Synergism.** Rated 6.5/10 by playwanderer, which says Steam rates it "Mostly Positive", below its closest peers. "The recurring complaint is pacing", and the review is titled "a huge reset ladder that doesn't always reinvent itself". — [playwanderer Synergism review](https://playwanderer.online/game-reviews/synergism)
- **Realm Grinder praise.** PC Gamer says it grew "much, much deeper" than its Flash origins, and Steam shows Very Positive (about 4,000 English reviews). — [PC Gamer](https://www.pcgamer.com/au/realm-grinder-guide); [Steam store](https://store.steampowered.com/app/610080/Realm_Grinder/) (via search summary)
- **Realm Grinder criticism.** Gamezebo says "mechanical differences between [factions] seem miniscule". TV Tropes calls each Reincarnation "a new Early Game Hell". — [Gamezebo review](https://www.gamezebo.com/reviews/realm-grinder-review-been-there-tapped-that/); [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/RealmGrinder)
- **NGU Idle criticism.** Reviewers say it "drags out the last few scraps of content over something like a year of grinding" and call the mid-to-late slog "literal months of dreck". They criticize cooldown timers and gated automation, but praise the first couple of months as "excellent". — [Metacritic user reviews](https://www.metacritic.com/game/ngu-idle/user-reviews/); [Steam negative reviews](https://steamcommunity.com/app/1147690/negativereviews/?browsefilter=toprated) (via search summary)
- **Kittens Game praise.**
  - It is described as "paced so that there's always a progression of things to do, none of which are instant", and "refreshing after ... incremental games that did not understand how to pace". — [Metafilter](https://www.metafilter.com/142228/The-incremental-to-surpass-all-incrementals); [itch.io review thread](https://itch.io/t/5052400/probably-my-new-favorite-idle-game-of-all-time-demo-review) (via search summary)
  - It is called "one of the tougher Idle Games", and a CMU close reading calls it a self-described "Dark Souls of incremental gaming". — [TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/KittensGame); [CMU ETC Press paper](https://press4.etc.cmu.edu/file/download/2466/b7342d8f-5c31-489f-b697-42e5370df76c)
- **Revolution Idle.** Guides call the progression deep but poorly explained in game. One complaint: Eternity resets automation settings with no warning. — [Steam discussions](https://steamcommunity.com/app/2763740/discussions/0/597387460190669256) (via search summary)
- **General prestige fatigue.** Comments include: "I'm tired of the Prestige mechanic in every idle game"; prestige can feel like it "does nothing but hold me back" when the payout is tiny; and long multi-day games make players drift away and forget what's needed. — [itch.io posts returned in search](https://itch.io/post/15617742) (via search summary; exact post attribution uncertain)
- **Simple single-layer baseline.** Cookie Clicker's prestige gives "+1% per level" to production. — [Wikipedia: Cookie Clicker](https://en.wikipedia.org/wiki/Cookie_Clicker)

### Inferences
- **What players reward:** layers that add decisions, automation that arrives as the old layer gets boring, and fast early re-runs. What they punish: waiting walls, cooldown-gated automation, and confusing currency stacks with no explanation.
- **For a short game like Ship It,** the safest depth is not more rungs. A better bet is:
  - One optional second layer that adds a new verb, such as a script automator or a stack/framework choice.
  - 4 to 8 challenges that pay out automation or capped stacking bonuses.
  - A reset-count milestone ladder front-loaded at 1, 2, 3, 5 and 10 releases.
  - An in-game explanation of every currency, because guide dependence is a top AD complaint.

### Gaps
- Reddit threads (r/incremental_games "best prestige system", r/AntimatterDimensions and the other game subreddits) and developer posts (Hevipelle, Platonic, Divine Games) did not show up in search results, and those sites could not be fetched. Community consensus here rests on reviews, Steam, Metacritic, TV Tropes and Metafilter instead.
- Trimps and Exponential Idle community critiques were not found in the reachable sources.
