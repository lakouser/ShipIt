import { ISSUES, type IssueKind } from '../../core/content';
import type { Game } from '../../core/game';
import { issueCounts, triageLines } from '../../core/issues';
import { clock, fmt } from '../../core/num';
import { workflowOn } from '../../core/workflows';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';

const LABELS: Record<IssueKind, { label: string; cls: string }> = {
  bug: { label: 'bug reports', cls: 'h-bug' },
  feature: { label: 'feature requests', cls: 'h-star' },
  support: { label: 'support questions', cls: 'h-auto' },
};

/** co/issues: what users filed, and one button to close the lot. */
export function renderIssues(game: Game): string {
  const s = game.state;
  const rows = (Object.keys(LABELS) as IssueKind[])
    .map((k) => `<div class="chk"><span><span class="h ${LABELS[k].cls}">●</span> ${LABELS[k].label} <b data-iss-n="${k}"></b></span><b data-iss-what="${k}"></b></div>`)
    .join('');
  return `<div class="cmd"><span><span class="ps">$</span> gh issue list --state open</span><span class="aside" data-iss-count></span></div><!--help-->
    <div class="pr"><div class="prh">${rows}<div class="chk"><span>next issue</span><b data-iss-next></b></div></div></div>
    <button class="shipbtn" data-triage></button>
    ${workflowOn(s, 'triage') ? `<p class="caveat">${hl('# triage.yml closes issues as they come in.')}</p>` : ''}`;
}

export const issuesKey = (game: Game): string => `${workflowOn(game.state, 'triage')}`;

export const issuesHelp = (): string =>
  hl(
    `users file an issue every ${ISSUES.everyMinutes} minutes, playing or away, until ${ISSUES.max} are open (about an hour's worth); then nothing more is filed until you close some. closing them is one tap: bug reports pay ${ISSUES.seconds.bug} seconds of output and ${-ISSUES.bugDebt} tech debt off each, feature requests +${ISSUES.featureReview}★ each on the next review (up to +${ISSUES.featureCap}), support questions keep ${ISSUES.supportUsers * 100}% of your users each. low test coverage means more bug reports.`,
  );

export function refreshIssues(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const counts = issueCounts(s);
  const open = s.issues.open.length;
  setText(root.querySelector('[data-iss-count]'), `${open} of ${ISSUES.max} open`);
  for (const k of Object.keys(LABELS) as IssueKind[]) {
    setText(root.querySelector(`[data-iss-n="${k}"]`), `×${counts[k]}`);
    const n = counts[k];
    const what =
      n === 0 ? '<span class="cm">—</span>'
      : k === 'bug' ? `${tint('loc', `+${fmt(triageLines(s, now, Array(n).fill('bug')))}`)} · ${ISSUES.bugDebt * n} debt`
      : k === 'feature' ? `${tint('star', `+${Math.min(ISSUES.featureCap - s.issues.reviewBoost, ISSUES.featureReview * n).toFixed(1)}★`)} next review`
      : `${tint('num', `+${fmt(s.market.users * ((1 + ISSUES.supportUsers) ** n - 1))}`)} users`;
    setHtml(root.querySelector(`[data-iss-what="${k}"]`), what);
  }
  setHtml(root.querySelector('[data-iss-next]'), open >= ISSUES.max ? '<span class="bad">queue full: nothing more is filed</span>' : tint('time', clock((s.issues.nextAt - now) / 1000)));
  const btn = root.querySelector<HTMLButtonElement>('[data-triage]');
  if (btn) {
    btn.disabled = open === 0;
    btn.classList.toggle('ready', open >= ISSUES.max / 2);
    setText(btn, open === 0 ? 'inbox zero' : `gh issue close --all → +${fmt(triageLines(s, now))} lines`);
  }
}
