#!/usr/bin/env python3
"""Adds the save fix and the keyboard sounds to the published v0.3.0 build of Ship It.

The v0.3.0 source was never pushed; only its published bundle (assets/index-DI5a4Oc0.js) exists. This
replaces its save store, its account-save reader and its synthesised key sounds with the ones from this
repo (built by vite.config.ts into shipit-patch-*.js), and rewires the few call sites that change.
Every replacement must match exactly once, or nothing is written.

Usage: python3 tools/v030-patch/apply.py <v0.3.0 bundle> <patch module file name> <out dir>
Prints the patched bundle's file name (assets/index-<hash>.js).
"""
import hashlib
import pathlib
import sys

bundle, patch_name, out_dir = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
s = pathlib.Path(bundle).read_text()
SHA = hashlib.sha256(s.encode()).hexdigest()
assert SHA.startswith('4769acc5857cdf01'), f'not the v0.3.0 bundle (sha256 {SHA[:16]})'


def replace(old: str, new: str) -> None:
    global s
    n = s.count(old)
    assert n == 1, f'expected one match, found {n}: {old[:80]!r}'
    s = s.replace(old, new)


def replace_between(start: str, end: str, new: str) -> None:
    """Replaces from `start` up to (not including) `end`, checking the cut is brace-balanced."""
    global s
    a, b = s.find(start), s.find(end)
    assert s.count(start) == 1 and s.count(end) == 1 and 0 <= a < b, (start, end)
    cut = s[a:b]
    assert cut.count('{') == cut.count('}'), f'unbalanced cut at {start!r}'
    s = s[:a] + new + s[b:]


# --- save fix -------------------------------------------------------------------------------------
# The account-save reader: never takes a cached copy for the player's save (the update wipe).
replace_between('async function ni(e){', 'var ri=', 'function ni(e){return __P.connectClaudeDb(e)}')
# The save store: most progress wins, deliberate replacements as generations, holds, adopt.
replace_between('di=class{', ';function G(e,t=document)', 'di=__P.SaveStore')
# A save from a newer format than v3 is held, never overwritten.
replace(
    'for(let e of n){if(i=ti(e.text,r),i){a=e.source;break}await t.keepUnreadable(e.text)}',
    'for(let e of n){if(i=ti(e.text,r),i){a=e.source;break}if(__P.isNewerSave(e.text,3)){t.hold();break}await t.keepUnreadable(e.text)}',
)
# A better account save that answers late is adopted (not a deliberate replacement); null starts over.
replace(
    'this.saves.onLateSave(e=>{this.editor.log(`found a newer save in your claude account, loading it`,`info`),this.frozen=!0,window.setTimeout(()=>void this.saves.replace(e).then(()=>location.reload()),1200)})',
    'this.saves.onLateSave(e=>{this.editor.log(e?`found a save with more progress in your claude account, loading it`:`this save was reset on another device, starting over`,`info`),this.frozen=!0,window.setTimeout(()=>void this.saves.adopt(e).then(()=>location.reload()),1200)})',
)
replace(
    '};e(),this.saves.status().cloud===`connecting`&&',
    '};this.saves.status().held&&this.editor.log(`your save is from a newer version of ship-it: reload to update. nothing is saved until then`,`warn`),e(),this.saves.status().cloud===`connecting`&&',
)

# --- keyboard sounds ------------------------------------------------------------------------------
replace('clicker=Do();', 'clicker=__P.createKeySounds();')
# feedback(kind): tap/crit press the key, rewards (feedback(true)) play a run, other buttons a stroke.
replace(
    'feedback(e=!1){let t=this.game.state.settings;t.sound&&this.clicker.click(t.keySound,e),t.haptics&&(e?this.platform.haptics.success():this.platform.haptics.tap())}',
    'feedback(e=`click`){e===!0&&(e=`reward`),e===!1&&(e=`tap`);let t=this.game.state.settings;'
    't.sound&&(e===`tap`||e===`crit`?this.clicker.press(e===`crit`):e===`reward`?this.clicker.run():this.clicker.stroke()),'
    't.haptics&&(e===`crit`||e===`reward`?this.platform.haptics.success():this.platform.haptics.tap())}',
)
replace('this.feedback(e.crit);break;case`sprintStarted`', 'this.feedback(e.crit?`crit`:`tap`);break;case`sprintStarted`')
# The big key reports letting go (pointer up anywhere, key up), for the release half of the keystroke.
replace(
    'constructor(e,t,n,r=()=>!0,i=()=>{}){this.key=e,this.wrap=t,e.addEventListener(`pointerdown`,e=>{e.preventDefault(),r()&&n()}),e.addEventListener(`click`,e=>{e.detail===0&&r()&&n()}),',
    'constructor(e,t,n,r=()=>!0,i=()=>{},__r=()=>{}){this.key=e,this.wrap=t;let __p=new Set,__k=new Set,__up=e=>{__p.delete(e.pointerId)&&__r()};'
    'window.addEventListener(`pointerup`,__up),window.addEventListener(`pointercancel`,__up),'
    'window.addEventListener(`keyup`,e=>{__k.delete(e.code)&&__r()}),window.addEventListener(`blur`,()=>{__p.clear(),__k.clear()}),'
    'e.addEventListener(`pointerdown`,e=>{e.preventDefault(),r()&&(__p.add(e.pointerId),n())}),e.addEventListener(`click`,e=>{e.detail===0&&r()&&(n(),window.setTimeout(__r,80))}),',
)
replace('i(e.key),this.flashDown(),n())})}flashDown(){', 'i(e.key),this.flashDown(),__k.add(e.code),n())})}flashDown(){')
replace(
    'this.keycap=new $i(G(`#key`),G(`.keywrap`),()=>this.tap(),()=>!this.dialogOpen,t=>e.typed(t))',
    'this.keycap=new $i(G(`#key`),G(`.keywrap`),()=>this.tap(),()=>!this.dialogOpen,t=>e.typed(t),()=>{this.game.state.settings.sound&&this.clicker.release()})',
)
# Load the recording as soon as sound is on.
replace('Ke(e.notation),', 'Ke(e.notation),e.sound&&this.clicker.preload(),')
# The synthesised switch choice (thock/click/beep) is gone.
replace(
    'r+=`<div class="row2"><span class="lbl">switch</span>${Ea.map(e=>ka(`keySound`,e,n.keySound===e,e)).join(``)}</div>`,',
    '',
)

replace('version:`v0.3.0`', 'version:`v0.3.1`')
s = f'import*as __P from"./{patch_name}";' + s

name = f'index-{hashlib.sha256(s.encode()).hexdigest()[:8]}.js'
(out_dir / name).write_text(s)
print(name)
