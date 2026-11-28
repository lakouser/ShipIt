import type { Game } from '../../core/game';
import { describeOption, mailDef, unreadCount } from '../../core/mail';
import type { MailItem } from '../../core/state';
import { esc } from '../dom';
import { hl, tint } from '../hl';
import { pullsHtml } from './pulls';

/** Which mail is expanded. */
export interface MailView {
  openMail: string | null;
}

/** "now", "5m", "3h", "2d". */
function age(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 2880 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
}

function message(game: Game, item: MailItem): string {
  const def = mailDef(item.id);
  if (!def) return '';
  let html = `<div class="msg">
    <div class="mh"><span class="k">From:</span> ${esc(def.from)}</div>
    <div class="mh"><span class="k">Subject:</span> ${esc(def.subject)}</div>
    ${def.body.map((p) => `<p>${hl(p)}</p>`).join('')}`;
  if (def.options) {
    if (item.choice === null) {
      html += '<div class="replies">';
      def.options.forEach((o, i) => {
        html += `<button class="reply" data-answer="${esc(item.key)}" data-opt="${i}"><b>&gt; ${esc(o.label)}</b><small>${hl(describeOption(game.state, o, game.now()))}</small></button>`;
      });
      html += '</div>';
    } else {
      html += `<div class="replied"><span class="tag tag-ok">[sent]</span> ${esc(def.options[item.choice]?.label ?? '')}</div>`;
    }
  }
  return html + '</div>';
}

/** The inbox, newest first, one open at a time. */
export function renderMail(game: Game, view: MailView): string {
  const s = game.state;
  const now = game.now();
  const unread = unreadCount(s);
  let html = `${pullsHtml(game)}<div class="cmd${s.pulls ? ' gap' : ''}"><span><span class="ps">$</span> mail</span><span class="aside">${unread ? `${tint('num', unread)} unread` : 'inbox zero'}</span></div>`;
  if (s.mail.length === 0) html += '<div class="ck dim">no mail yet. enjoy it.</div>';
  html += '<div class="inbox">';
  for (const item of s.mail) {
    const def = mailDef(item.id);
    if (!def) continue;
    const open = view.openMail === item.key;
    const waiting = !!def.options && item.choice === null;
    html += `<button class="mrow${item.read ? '' : ' unread'}${open ? ' open' : ''}" data-mail="${esc(item.key)}" aria-expanded="${open}">
      <span class="flag">${waiting ? '!' : item.read ? ' ' : 'N'}</span><span class="from">${esc(def.from)}</span><span class="subj">${esc(def.subject)}</span><span class="when">${age(now - item.at)}</span>
    </button>`;
    if (open) html += message(game, item);
  }
  return html + '</div>';
}

/** Changes when the inbox needs re-rendering. */
export const mailKey = (game: Game): string => `${game.state.mail.length}|${game.state.mail[0]?.key ?? ''}|${game.state.pulls?.options.join(',') ?? ''}`;
