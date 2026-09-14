import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Shop, MenuItem } from '../src/data/types.ts';
import { auditCatalog } from '../scripts/audit-catalog.ts';
import { recommendItems, matchingItems } from '../src/lib/catalog.ts';
import { toMenuDocument } from '../src/lib/menu-document.ts';
import { menuPlainText, menuTotal } from '../src/lib/menu-export.ts';

const shops: Shop[] = readdirSync('src/data/shops').filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(`src/data/shops/${f}`, 'utf8')).shops);
const records = readdirSync('docs/reviews').filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(`docs/reviews/${f}`, 'utf8')));
const items = (s: Shop) => s.menuSections.flatMap(section => section.items);
const hash = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n')).digest('hex');

test('月次変更台帳は既存の全IDを保持し、記録された変更・追加が検索データまで届く', () => {
  const additions = records.flatMap(r => r.additions) as { shopId: string; item: MenuItem }[];
  const addedIds = new Set(additions.map(a => a.item.id));
  assert.equal(hash(shops.map(s => s.id)), records[0].baselineShopIdsSha256);
  assert.equal(hash(shops.flatMap(s => items(s).filter(i => !addedIds.has(i.id)).map(i => i.id))), records[0].baselineItemIdsSha256);
  const expected = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    for (const a of r.additions) expected.set(a.item.id, { ...a.item });
    for (const c of r.changes) { assert.ok(c.reason); expected.set(c.itemId, { ...expected.get(c.itemId), ...c.after }); }
  }
  const summaries = JSON.parse(readFileSync('src/data/generated-index.json', 'utf8')).shops;
  for (const [id, fields] of expected) {
    const shop = shops.find(s => items(s).some(i => i.id === id))!;
    assert.ok(shop, id);
    const item = items(shop).find(i => i.id === id)!;
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(item[key as keyof MenuItem], value, `${id}: ${key}`);
    assert.ok(matchingItems(summaries.find((s: Shop) => s.id === shop.id), item.name).some(i => i.id === id), id);
  }
  assert.equal(shops.reduce((n, s) => n + items(s).length, 0), records[0].before.items + additions.length);
});

test('巡回検査は通貨・ID・商品分類の破損を検出し、容量未指定は検討候補として区別する', () => {
  const clean = auditCatalog(shops); assert.deepEqual(clean.errors, []);
  const broken = structuredClone(shops);
  const american = broken.find(s => s.era === 'america-1920s')!; american.currency = 'JPY';
  const coffee = broken.find(s => s.id === 'kissaten-1')!;
  items(coffee).find(i => i.name === 'アメリカン')!.kind = 'food';
  const target = items(coffee); target[1].id = target[0].id; target[0].price = -1;
  const codes = auditCatalog(broken).errors.map(e => e.code);
  for (const code of ['currency', 'coffee-kind', 'duplicate-id', 'price']) assert.ok(codes.includes(code), code);
  assert.ok(clean.candidates.some(c => c.code === 'unspecified-quantity'));
  assert.ok(clean.candidates.every(c => !clean.errors.includes(c)));
});

test('時間パックは通常利用より割高にならず、無料の変更・試奏と入浴料も出力・合計できる', () => {
  for (const [shopId, baseName, packName] of [
    ['net-cafe-heisei-2', 'ワープロ利用 一時間', '文書作成 二時間'],
    ['net-cafe-heisei-3', 'インターネット席 一時間', '調べもの端末 二時間'],
  ]) {
    const s = shops.find(s => s.id === shopId)!;
    const base = items(s).find(i => i.name === baseName)!, pack = items(s).find(i => i.name === packName)!;
    assert.ok(pack.price <= base.price * 2); assert.match(pack.description, /入店時/);
    const broken = structuredClone(s); items(broken).find(i => i.id === pack.id)!.price = base.price * 3;
    assert.ok(auditCatalog([broken]).candidates.some(c => c.code === 'duration-price'));
  }
  for (const id of ['bento-heisei-2', 'music-store-heisei-3', 'bathhouse-1']) {
    const shop = shops.find(s => s.id === id)!;
    const free = items(shop).filter(i => i.price === 0);
    if (id !== 'bathhouse-1') assert.ok(free.length);
    const chosen = [...free, items(shop).find(i => i.price > 0)!];
    const doc = toMenuDocument(shop, { itemIds: chosen.map(i => i.id) });
    assert.equal(menuTotal(doc), chosen.reduce((n, i) => n + i.price, 0));
    for (const i of chosen) assert.ok(menuPlainText(doc).includes(i.name));
    assert.ok(recommendItems(items(shop)).every(i => !['fee', 'service', 'addon'].includes(i.kind)));
  }
});
