# v0.3.0 patch

The live game is the published **v0.3.0** build, whose source was never pushed to this repo, with this repo's
save fix and keyboard sounds added (shown in settings as **v0.3.1**). This folder is how that build was made.

1. Get the v0.3.0 bundle (`assets/index-DI5a4Oc0.js`, sha256 `4769acc5…`): from the artifact's history or the
   "Ship It v0.3.0 Backup" artifact.
2. `npx vite build --config tools/v030-patch/vite.config.ts` builds `entry.ts` (the save store, the account-save
   reader and the key sounds from `src/`) into `dist/assets/shipit-patch-*.js` plus `keyboard-*.wav`.
3. `python3 tools/v030-patch/apply.py <bundle> <shipit-patch-*.js name> <out dir>` swaps v0.3.0's save store,
   account-save reader and synthesised key sounds for those, rewires the call sites (the key's release, the
   late-save handler, feedback kinds), drops the old switch setting and imports the module. Every replacement
   must match exactly once or nothing is written. It prints the patched bundle's name.
4. Publish the page with that bundle, the module, `keyboard-*.wav` and `index-v030r1.css` (v0.3.0's stylesheet
   with the safe area on `:root` only, so it isn't doubled under Claude's page shell).

Once the v0.3.0 source turns up, port these changes into it properly and retire this folder.
