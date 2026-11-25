import { describe, expect, it } from 'vitest';
import { hl } from '../src/ui/hl';

/** Returns [hue, text] pairs for every coloured span, so tests read like the screen. */
const spans = (text: string): [string, string][] =>
  [...hl(text).matchAll(/<span class="h h-(\w+)">(.*?)<\/span>/g)].map((m) => [m[1]!, m[2]!]);

describe('colour coding', () => {
  it('colours lines, per tap and per second differently', () => {
    expect(spans('write 5,000 lines')).toEqual([['loc', '5,000 lines']]);
    expect(spans('+1/tap each · x2 at 25')).toEqual([['tap', '+1/tap'], ['num', 'x2'], ['num', '25']]);
    expect(spans('+6/s each')).toEqual([['auto', '+6/s']]);
    expect(spans('Write 100 lines per tap')).toEqual([['tap', '100 lines per tap']]);
    expect(spans('Automate 1 million lines per second')).toEqual([['auto', '1 million lines per second']]);
    expect(spans('Write 100 million lines')).toEqual([['loc', '100 million lines']]);
    expect(spans('needs 1.20M more lines')).toEqual([['loc', '1.20M more lines']]);
  });

  it('colours rewards by what they boost', () => {
    expect(spans('+2% per tap')).toEqual([['tap', '+2% per tap']]);
    expect(spans('+2% automation')).toEqual([['auto', '+2% automation']]);
    expect(spans('+5% bug rewards')).toEqual([['bug', '+5% bug rewards']]);
    expect(spans('+1 turbo.sh')).toEqual([['num', '+1'], ['name', 'turbo.sh']]);
    expect(spans('achievement unlocked: Big O (+1% output)')).toEqual([['loc', '+1%']]);
    expect(spans('coffee: x3 everything for 20s')).toEqual([['loc', 'x3 everything'], ['time', '20s']]);
  });

  it('colours stars, bugs, files, tickets, tabs and times', () => {
    expect(spans('shipped v2.0, +3 stars, output +30%')).toEqual([['star', '+3 stars'], ['loc', '+30%']]);
    expect(spans('squashed bug #12, +1,200 lines')).toEqual([['bug', 'bug #12'], ['loc', '+1,200 lines']]);
    expect(spans('squash 3 bugs')).toEqual([['bug', '3 bugs']]);
    expect(spans('git commit ~/dotfiles/keybindings.json -m "level 2"')).toEqual([['name', '~/dotfiles/keybindings.json'], ['str', '&quot;level 2&quot;']]);
    expect(spans('npm i vim-motions --count 10')).toEqual([['name', 'vim-motions'], ['num', '10']]);
    expect(spans('sprint started: TKT-142 "Fix it", 5,000 lines in 0:40')).toEqual([
      ['name', 'TKT-142'], ['str', '&quot;Fix it&quot;'], ['loc', '5,000 lines'], ['time', '0:40'],
    ]);
    expect(spans('new tab unlocked: 3:ship')).toEqual([['name', '3:ship']]);
    expect(spans('(25% speed, 2h 0m)')).toEqual([['loc', '25%'], ['time', '2h 0m']]);
    expect(spans('+10% offline rate and +1h offline cap per level')).toEqual([['loc', '+10%'], ['time', '+1h']]);
  });

  it('colours taps and crits', () => {
    expect(spans('tap 300 times')).toEqual([['tap', '300 times']]);
    expect(spans('needs ~3.2 taps/s at current output')).toEqual([['tap', '~3.2 taps/s']]);
    expect(spans('types 4 taps a second for you')).toEqual([['tap', '4 taps a second']]);
    expect(spans('+15% critical tap chance')).toEqual([['tap', '+15% critical tap chance']]);
    expect(spans('land 20 critical taps')).toEqual([['tap', '20 critical taps']]);
    expect(spans('automation covers this one on its own')).toEqual([['auto', 'automation']]);
  });

  it('leaves versions alone and escapes everything', () => {
    expect(spans('Reach v10.0')).toEqual([]);
    expect(spans('every 3rd day adds turbo.sh')).toEqual([['name', 'turbo.sh']]);
    expect(hl('a <b> & "c"')).toBe('a &lt;b&gt; &amp; <span class="h h-str">&quot;c&quot;</span>');
  });
});
