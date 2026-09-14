import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseThemePreference, resolveTheme } from '../src/lib/theme.ts';

test('手動で選んだ表示を端末設定より優先し、未設定・不正な保存値は端末に合わせる', () => {
  for (const systemDark of [true, false]) {
    assert.equal(resolveTheme(parseThemePreference('dark'), systemDark), 'dark');
    assert.equal(resolveTheme(parseThemePreference('light'), systemDark), 'light');
    for (const saved of [null, '', 'invalid', 'system']) {
      assert.equal(resolveTheme(parseThemePreference(saved), systemDark), systemDark ? 'dark' : 'light');
    }
  }
});

test('初回描画のテーマがReactの判定と一致し、保存領域が拒否されても起動する', () => {
  const html = readFileSync('index.html', 'utf8');
  const script = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.ok(html.indexOf('id="theme-init"') < html.indexOf('id="root"'));
  for (const systemDark of [true, false]) {
    for (const saved of [null, 'light', 'dark', 'invalid', 'blocked']) {
      let renderedDark: boolean | undefined;
      let browserColor = '#214e40';
      runInNewContext(script, {
        localStorage: { getItem: () => { if (saved === 'blocked') throw new Error('SecurityError'); return saved; } },
        window: { matchMedia: () => ({ matches: systemDark }) },
        document: {
          documentElement: { classList: { toggle: (_: string, dark: boolean) => { renderedDark = dark; } } },
          querySelector: () => ({ setAttribute: (_: string, color: string) => { browserColor = color; } }),
        },
      });
      const expected = resolveTheme(parseThemePreference(saved), systemDark);
      assert.equal(renderedDark, expected === 'dark', `${saved}, systemDark=${systemDark}`);
      assert.equal(browserColor, expected === 'dark' ? '#19231f' : '#214e40');
    }
  }
});
