import { CHALLENGES, MAJOR, ROUNDS, SKILLS } from '../../core/content';
import type { Game } from '../../core/game';
import {
  challengeReady,
  challengesUnlocked,
  linesForChallenges,
  majorsUnlocked,
  nextMajorVersion,
  skillCost,
  skillStatus,
  starsForNextXp,
  starsForXp,
  starsToBank,
  xpAvailable,
  xpForStars,
  xpToSpend,
} from '../../core/major';
import { mods, skillLevel } from '../../core/mods';
import { fmt, fmtMul } from '../../core/num';
import { currentVersion, starsAvailable } from '../../core/ship';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { barHtml } from '../messages';

/** Star gain multiplier from XP and skills with this much XP (before projects, brand and challenge rewards). */
const gainWithXp = (game: Game, xp: number): number => (mods(game.state).starGain / (1 + MAJOR.starGainPerXp * game.state.xp)) * (1 + MAJOR.starGainPerXp * xp);

function resume(game: Game): string {
  const s = game.state;
  const rows = SKILLS.map(
    (k) => `<div class="perk" data-skill-row="${k.id}">
      <div><span class="nm">${k.name}</span> <span class="lv"></span><small class="ps2">${hl(k.summary)}</small></div>
      <button class="buy star perkbuy" data-skill="${k.id}"><span class="bq"></span><span class="bc"></span></button>
    </div>`,
  ).join('');
  return `<div class="cmd gap"><span><span class="ps">$</span> cat ~/resume.md</span><span class="aside"><b class="st" data-xp-spend>${fmt(xpToSpend(s))}</b> xp to spend</span></div>
    <div class="md"><div class="mdh">## skills <span class="cm">kept forever</span></div>${rows}</div>`;
}

function challengeList(game: Game, armed: string | null): string {
  const s = game.state;
  const head = `<div class="cmd gap"><span><span class="ps">$</span> git branch --list 'challenge/*'</span><span class="aside">${s.challengesDone.length} of ${CHALLENGES.length} done</span></div>`;
  if (!challengesUnlocked(s)) return `${head}<p class="caveat"># challenge releases unlock with your first major version: restart a release under a restriction for a permanent reward.</p>`;
  const rows = CHALLENGES.map((c) => {
    const done = s.challengesDone.includes(c.id);
    const active = s.challenge?.id === c.id;
    let action = '';
    if (active) action = `<button class="act" data-abandon>abandon</button>`;
    else if (!done && !s.challenge && challengeReady(s))
      action = `<button class="act${armed === `challenge:${c.id}` ? ' danger' : ''}" data-challenge="${c.id}">${armed === `challenge:${c.id}` ? 'restart this release?' : 'start'}</button>`;
    const status = done ? ' <span class="okc">done</span>' : active ? ' <span class="h h-time">in progress</span>' : '';
    return `<div class="chal${done ? ' done' : ''}">
      <div class="row2"><span><span class="h h-name">challenge/${c.branch}</span> ${c.name}${status}</span>${action}</div>
      <small>${hl(c.restriction)} → <span class="okc">${hl(c.reward)}</span></small>
      ${active ? `<div class="tbar" data-chal-bar></div>` : ''}
    </div>`;
  }).join('');
  const note = challengeReady(s)
    ? '# starting one restarts the current release. the goal: about twice the lines shipped so far this run, in that one release. meet it and ship for the reward; shipping short just ends it.'
    : `# ship ${fmt(linesForChallenges())} lines this run to open challenges (${fmt(s.shipped)} so far): they need a codebase worth restricting.`;
  return `${head}<p class="caveat">${note}</p><div class="chals">${rows}</div>`;
}

export function renderMajor(game: Game, armed: string | null): string {
  const s = game.state;
  const next = nextMajorVersion(s);
  if (!majorsUnlocked(s))
    return `<div class="cmd"><span><span class="ps">$</span> git tag -a v${next}</span></div>
      <p class="caveat"># major versions open with the ${ROUNDS[MAJOR.unlockRound]} round. each one banks your stars for xp, which makes every later star worth more, and never touches funding or equity: the reset that never runs out.</p>`;
  return `<div class="cmd"><span><span class="ps">$</span> git tag -a v${next}</span></div>
    <div class="pr">
      <div class="prh">
        <h3>Major version v${next}</h3>
        <div class="chips">v${currentVersion(s)} → <span>v${next}</span></div>
        <div class="chk"><span>stars to bank</span><b data-mj-stars></b></div>
        <div class="tbar" data-mj-bar></div>
        <div class="chk"><span>xp</span><b data-mj-xp></b></div>
        <div class="chk"><span>stars from shipping</span><b data-mj-gain></b></div>
      </div>
      <p class="caveat"># a major version banks your stars, and the release in progress, for xp. each xp earned adds ${Math.round(MAJOR.starGainPerXp * 100)}% to stars from shipping, even after you spend it. stars, dotfiles, releases and packages reset; funding, equity, xp, skills, the team, achievements, workflows, challenge rewards and users stay.</p>
      <button class="shipbtn" data-major></button>
    </div>
    ${resume(game)}
    ${challengeList(game, armed)}`;
}

export function refreshMajor(game: Game, root: HTMLElement, armed: string | null): void {
  const s = game.state;
  if (!majorsUnlocked(s)) return;
  const pending = starsAvailable(s);
  const bank = starsToBank(s);
  const gain = xpAvailable(s);
  const target = starsForNextXp(s);
  setHtml(root.querySelector('[data-mj-stars]'), `${tint('star', fmt(s.stars))}${pending > 0 ? ` <span class="cm">+${fmt(pending)} pending</span>` : ''} · next xp at ${tint('star', fmt(target))}`);
  const bar = root.querySelector<HTMLElement>('[data-mj-bar]');
  const prev = Math.max(0, starsForXp(xpForStars(s.banked + bank)) - s.banked);
  const html = barHtml(Math.max(0, (bank - prev) / Math.max(1, target - prev)), 22);
  if (bar && bar.innerHTML !== html) bar.innerHTML = html;
  setHtml(root.querySelector('[data-mj-xp]'), `${tint('star', fmt(s.xp))}${gain > 0 ? ` → ${tint('star', fmt(s.xp + gain))}` : ''}`);
  setHtml(root.querySelector('[data-mj-gain]'), `x${fmtMul(gainWithXp(game, s.xp))}${gain > 0 ? ` → x${fmtMul(gainWithXp(game, s.xp + gain))}` : ''}`);
  setText(root.querySelector('[data-xp-spend]'), fmt(xpToSpend(s)));

  for (const k of SKILLS) {
    const row = root.querySelector<HTMLElement>(`[data-skill-row="${k.id}"]`);
    if (!row) continue;
    const level = skillLevel(s, k.id);
    const status = skillStatus(s, k);
    setText(row.querySelector('.lv'), Number.isFinite(k.maxLevel) ? `${level}/${k.maxLevel}` : `lvl ${level}`);
    const btn = row.querySelector<HTMLButtonElement>('button')!;
    btn.disabled = status !== 'affordable';
    btn.classList.toggle('ok', status === 'affordable');
    setText(btn.firstElementChild, status === 'maxed' ? 'done' : `lvl ${level + 1}`);
    setText(btn.lastElementChild, status === 'maxed' ? '—' : `${skillCost(k, level)} xp`);
  }

  if (s.challenge) {
    const cbar = root.querySelector<HTMLElement>('[data-chal-bar]');
    const chtml = barHtml(s.thisRelease.div(s.challenge.goal).toNumber(), 22);
    if (cbar && cbar.innerHTML !== chtml) cbar.innerHTML = chtml;
  }

  const btn = root.querySelector<HTMLButtonElement>('[data-major]');
  if (!btn) return;
  const isArmed = armed === 'major';
  btn.disabled = gain < 1;
  btn.classList.toggle('arm', isArmed && gain >= 1);
  setText(
    btn,
    gain < 1
      ? `needs ${fmt(Math.max(0, target - bank))} more stars to bank`
      : isArmed
        ? `confirm: reset stars and dotfiles for ${fmt(gain)} xp?`
        : `cut v${nextMajorVersion(s)} → +${fmt(gain)} xp`,
  );
}
