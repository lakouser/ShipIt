import { ASSUMED_TAPS_PER_SECOND, EFFECTS, FUNDING, MAIL, type EffectId } from './content';
import { addDebt } from './debt';
import { addLines, typicalOutput } from './economy';
import { applyEffect, grantScript } from './effects';
import { Decimal, fmt } from './num';
import type { Rng } from './rng';
import type { GameState, MailItem } from './state';

/** What answering a mail does. Lines and pay are seconds of typical output. */
export type MailEffect =
  | { kind: 'lines'; seconds: number }
  | { kind: 'pay'; seconds: number }
  | { kind: 'debt'; amount: number }
  | { kind: 'script'; script: EffectId }
  | { kind: 'bonus'; which: 'tap' | 'auto'; amount: number }
  | { kind: 'effect'; effect: EffectId };

export interface MailOption {
  label: string;
  effects: MailEffect[];
}

export interface MailDef {
  id: string;
  from: string;
  subject: string;
  body: string[];
  /** Story mail: sent once, the first time this holds. */
  when?: (s: GameState) => boolean;
  /** Choice mail: answered once with one of these. */
  options?: MailOption[];
}

/** The story, in order: each is sent once when its condition first holds. */
export const STORY_MAIL: readonly MailDef[] = [
  {
    id: 'welcome',
    from: 'pm@ship-it',
    subject: 'welcome aboard!!',
    body: [
      'Hi! I am your product manager. I will be sending you requirements, some of them possible.',
      'Quick context: the last engineer left in a hurry and the only handover note says "ask Dave". Nobody here has met Dave.',
      'Anyway. Keep typing. I will be in touch.',
    ],
    when: () => true,
  },
  {
    id: 'debt',
    from: 'linter-bot@ship-it',
    subject: '4,812 warnings (was: 3)',
    body: [
      'This is an automated message. The codebase now contains functions that call themselves by accident.',
      'Tech debt slows your automation once it passes 10%. Run a refactor from 0:pkgs before it gets worse.',
      'This message will repeat until morale improves.',
    ],
    when: (s) => s.debt >= 30,
  },
  {
    id: 'team',
    from: 'hr@ship-it',
    subject: 'headcount approved',
    body: [
      'Good news: finance found budget for actual people. Applicants will show up in 4:team.',
      'Each developer has one thing they are unusually good at. Put them there.',
      'Please stop listing the rubber duck as a reference.',
    ],
    when: (s) => s.unlocked.team,
  },
  {
    id: 'firstship',
    from: 'ceo@ship-it',
    subject: 'WE SHIPPED',
    body: [
      'Incredible work. I told the board we would ship and then, for the first time, we did.',
      'For the next release you can pick what we build. Different projects play by different rules: check the ship tab before you merge.',
    ],
    when: (s) => s.release >= 2,
  },
  {
    id: 'boss',
    from: 'sre@ship-it',
    subject: 're: re: re: postmortem',
    body: [
      'Root cause: unknown. Contributing factors: all of them.',
      'You handled that well. Big incidents come back every so often, and ignoring one costs nothing, but beating one pays properly and clears debt.',
      'Action items: none we will actually do.',
    ],
    when: (s) => s.stats.bossesBeaten >= 1,
  },
  {
    id: 'dave',
    from: 'unknown sender',
    subject: '(no subject)',
    body: ['do not delete the legacy folder.', 'i mean it. some of those files are load-bearing.', '- D'],
    when: (s) => s.release >= 4,
  },
  {
    id: 'investor',
    from: 'partner@vc.example',
    subject: 'loved the repo, quick call?',
    body: [
      'We have been watching your star count. It is going up and to the right, which is the direction we like.',
      'When you have enough stars, the ship tab will let you raise a round. Fair warning: the new CTO will want to rewrite everything in another language.',
    ],
    when: (s) => s.round < FUNDING.maxRounds && s.stars >= FUNDING.starsPerRound[s.round] * 0.6,
  },
  {
    id: 'raised',
    from: 'cto@ship-it',
    subject: 'the rewrite',
    body: [
      'Hello team. I am the new CTO. I have read the codebase and I have notes.',
      'We are starting over in a better language. Stars and dotfiles are gone, but everything you write now counts for far more, and there are new packages nobody could afford before.',
      'Also, who is Dave, and why does he still have commit access?',
    ],
    when: (s) => s.round >= 1,
  },
  {
    id: 'duck',
    from: 'duck@ship-it',
    subject: 'quack',
    body: ['Quack.', '(Attached: a 40-page architecture document. It is correct. It predates the company.)'],
    when: (s) => (s.owned.duck ?? 0) >= 50 || s.round >= 2,
  },
];

/** Requests that arrive every few minutes and ask for a decision. */
export const CHOICE_MAIL: readonly MailDef[] = [
  {
    id: 'blockchain',
    from: 'pm@ship-it',
    subject: 'can we add blockchain?',
    body: ['The board saw a slide. It would need to be done by Thursday. It does not need to work.'],
    options: [
      {
        label: 'sure, bolt it on',
        effects: [
          { kind: 'lines', seconds: 60 },
          { kind: 'debt', amount: 10 },
        ],
      },
      { label: 'no, and here is why', effects: [{ kind: 'debt', amount: -5 }] },
    ],
  },
  {
    id: 'demo',
    from: 'ceo@ship-it',
    subject: 'investor demo TOMORROW',
    body: ['I may have promised a feature that does not exist. How do you feel about an all-nighter?'],
    options: [
      {
        label: 'brew the coffee',
        effects: [
          { kind: 'effect', effect: 'coffee' },
          { kind: 'debt', amount: 8 },
        ],
      },
      { label: 'demo what we have', effects: [{ kind: 'script', script: 'nightly' }] },
    ],
  },
  {
    id: 'sponsor',
    from: 'maintainer@oss.example',
    subject: 'sponsorship?',
    body: [
      'Hi, I maintain the one-line package your entire build depends on. I do this in my evenings. Any chance of a sponsorship?',
    ],
    options: [
      {
        label: 'sponsor them',
        effects: [
          { kind: 'pay', seconds: 45 },
          { kind: 'bonus', which: 'auto', amount: 0.03 },
        ],
      },
      { label: 'mark as read', effects: [] },
    ],
  },
  {
    id: 'proddb',
    from: 'intern@ship-it',
    subject: 'small question about prod',
    body: [
      'Hypothetically, if someone ran a migration against the wrong database, would we restore the backup or just write it all again?',
    ],
    options: [
      { label: 'restore the backup', effects: [{ kind: 'pay', seconds: 30 }] },
      {
        label: 'write it again, fast',
        effects: [
          { kind: 'lines', seconds: 20 },
          { kind: 'debt', amount: 12 },
        ],
      },
    ],
  },
  {
    id: 'bounty',
    from: 'researcher@sec.example',
    subject: 'vulnerability report',
    body: ['I found a way to log in as any user by asking nicely. Do you run a bug bounty?'],
    options: [
      {
        label: 'pay the bounty',
        effects: [
          { kind: 'pay', seconds: 40 },
          { kind: 'debt', amount: -15 },
        ],
      },
      { label: 'close as "by design"', effects: [{ kind: 'debt', amount: 6 }] },
    ],
  },
  {
    id: 'logo',
    from: 'marketing@ship-it',
    subject: 'logo feedback',
    body: ['Could the logo be bigger? Also could it be on every screen? Also could it spin?'],
    options: [
      { label: 'make it bigger', effects: [{ kind: 'script', script: 'turbo' }] },
      { label: 'explain design systems', effects: [{ kind: 'bonus', which: 'tap', amount: 0.02 }] },
    ],
  },
  {
    id: 'conf',
    from: 'events@devconf.example',
    subject: 'your talk was accepted',
    body: ['Congratulations! "How we ship without tests" has been accepted. The slot is 9 a.m. on the last day.'],
    options: [
      {
        label: 'go and give the talk',
        effects: [
          { kind: 'script', script: 'sudo' },
          { kind: 'script', script: 'nightly' },
        ],
      },
      { label: 'stay and ship', effects: [{ kind: 'lines', seconds: 45 }] },
    ],
  },
  {
    id: 'license',
    from: 'billing@vendor.example',
    subject: 'your licence expires today',
    body: [
      'Your build tool licence renews at 4x the old price. Alternatively, there is an open-source fork with no documentation.',
    ],
    options: [
      {
        label: 'pay the invoice',
        effects: [
          { kind: 'pay', seconds: 35 },
          { kind: 'script', script: 'autotype' },
        ],
      },
      {
        label: 'migrate to the fork',
        effects: [
          { kind: 'bonus', which: 'auto', amount: 0.02 },
          { kind: 'debt', amount: 8 },
        ],
      },
    ],
  },
  {
    id: 'meeting',
    from: 'calendar@ship-it',
    subject: 'invitation: sync about the sync',
    body: [
      'A recurring 90-minute meeting to align on the agenda for the planning meeting. Optional. (It is not optional.)',
    ],
    options: [
      { label: 'decline and keep typing', effects: [{ kind: 'script', script: 'turbo' }] },
      { label: 'attend, quietly refactor', effects: [{ kind: 'debt', amount: -10 }] },
    ],
  },
  {
    id: 'tests',
    from: 'qa@ship-it',
    subject: 'the tests',
    body: [
      'We have 2 tests. One is skipped. The other asserts that true is true. Should we do something about that?',
    ],
    options: [
      {
        label: 'write real tests',
        effects: [
          { kind: 'pay', seconds: 30 },
          { kind: 'debt', amount: -20 },
        ],
      },
      {
        label: 'add a coverage badge',
        effects: [
          { kind: 'lines', seconds: 30 },
          { kind: 'debt', amount: 5 },
        ],
      },
    ],
  },
];

const ALL_MAIL: readonly MailDef[] = [...STORY_MAIL, ...CHOICE_MAIL];

export const mailDef = (id: string): MailDef | undefined => ALL_MAIL.find((m) => m.id === id);

/** Lines a mail pays: seconds of typical output, at least 50. */
export const mailReward = (s: GameState, now: number, seconds: number): Decimal => Decimal.max(50, typicalOutput(s, now, seconds, ASSUMED_TAPS_PER_SECOND)).floor();

/** Lines a mail costs: the same amount, but never more than the player has. */
export const mailCost = (s: GameState, now: number, seconds: number): Decimal => Decimal.min(s.lines, mailReward(s, now, seconds)).floor();

/** Choice mail still waiting for an answer. */
export const pendingChoices = (s: GameState): number => s.mail.filter((m) => m.choice === null && !!mailDef(m.id)?.options).length;

export const unreadCount = (s: GameState): number => s.mail.filter((m) => !m.read).length;

/** Puts a mail at the top of the inbox, dropping the oldest ones (never an unanswered choice) past MAIL.kept. */
function deliver(s: GameState, def: MailDef, at: number): MailItem {
  const item: MailItem = { key: `${def.id}@${Math.round(at)}`, id: def.id, at, read: false, choice: null };
  s.mail.unshift(item);
  while (s.mail.length > MAIL.kept) {
    let i = s.mail.length - 1;
    while (i >= 0 && s.mail[i].choice === null && mailDef(s.mail[i].id)?.options) i--;
    if (i < 0) break;
    s.mail.splice(i, 1);
  }
  return item;
}

/**
 * Sends the next story mail when its condition holds (spaced MAIL.storyGapMs apart), and a choice mail
 * every few minutes while fewer than MAIL.maxPending are waiting. Returns what arrived.
 */
export function updateMail(s: GameState, now: number, rng: Rng, force = false): MailItem[] {
  if (!s.unlocked.mail) return [];
  const arrived: MailItem[] = [];
  const story =
    s.mail.length === 0 || now - s.mail[0].at >= MAIL.storyGapMs ? STORY_MAIL.find((m) => !s.mailSeen.includes(m.id) && m.when?.(s)) : undefined;
  if (story) {
    s.mailSeen.push(story.id);
    arrived.push(deliver(s, story, now));
  }
  if (s.nextMailAt <= 0) s.nextMailAt = now + MAIL.firstDelayMs;
  if (force || (now >= s.nextMailAt && pendingChoices(s) < MAIL.maxPending)) {
    s.nextMailAt = now + MAIL.minGapMs + rng() * MAIL.extraGapMs;
    // Not one already waiting, and preferably not one of the last few.
    const open = new Set(s.mail.filter((m) => m.choice === null).map((m) => m.id));
    const recent = new Set(s.mail.slice(0, 4).map((m) => m.id));
    const fresh = CHOICE_MAIL.filter((m) => !open.has(m.id) && !recent.has(m.id));
    const pool = fresh.length ? fresh : CHOICE_MAIL.filter((m) => !open.has(m.id));
    if (pool.length) arrived.push(deliver(s, pool[Math.floor(rng() * pool.length)], now + arrived.length));
  }
  return arrived;
}

export function markRead(s: GameState, key: string): void {
  const item = s.mail.find((m) => m.key === key);
  if (item) item.read = true;
}

function describeEffect(s: GameState, e: MailEffect, now: number): string {
  switch (e.kind) {
    case 'lines':
      return `+${fmt(mailReward(s, now, e.seconds))} lines`;
    case 'pay':
      return `-${fmt(mailCost(s, now, e.seconds))} lines`;
    case 'debt':
      return `${e.amount > 0 ? '+' : ''}${e.amount} tech debt`;
    case 'script':
      return `+1 ${EFFECTS[e.script].file}`;
    case 'bonus':
      return `+${Math.round(e.amount * 100)}% ${e.which === 'tap' ? 'per tap' : 'automation'} for good`;
    case 'effect':
      return `${EFFECTS[e.effect].description} for ${EFFECTS[e.effect].durationS}s`;
  }
}

/** What an answer would do, in words. */
export const describeOption = (s: GameState, option: MailOption, now: number): string =>
  option.effects.length ? option.effects.map((e) => describeEffect(s, e, now)).join(', ') : 'nothing happens';

function applyMailEffect(s: GameState, e: MailEffect, now: number): void {
  switch (e.kind) {
    case 'lines':
      return addLines(s, mailReward(s, now, e.seconds));
    case 'pay':
      s.lines = s.lines.sub(mailCost(s, now, e.seconds));
      return;
    case 'debt':
      return addDebt(s, e.amount);
    case 'script':
      return grantScript(s, e.script);
    case 'bonus':
      s.questBonus[e.which] += e.amount;
      return;
    case 'effect':
      return applyEffect(s, e.effect, now);
  }
}

export interface MailAnswer {
  item: MailItem;
  def: MailDef;
  option: MailOption;
  /** What the answer did, in words. */
  outcome: string;
}

/** Answers a choice mail. The outcome is described before the effects change the numbers it quotes. */
export function answerMail(s: GameState, key: string, option: number, now: number): MailAnswer | null {
  const item = s.mail.find((m) => m.key === key);
  const def = item && mailDef(item.id);
  const chosen = def?.options?.[option];
  if (!item || !def || !chosen || item.choice !== null) return null;
  const outcome = describeOption(s, chosen, now);
  for (const e of chosen.effects) applyMailEffect(s, e, now);
  item.choice = option;
  item.read = true;
  s.stats.mailAnswered++;
  return { item, def, option: chosen, outcome };
}
