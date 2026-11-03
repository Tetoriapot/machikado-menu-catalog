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
  const expectedShops = new Map<string, Record<string, unknown>>();
  for (const r of records) for (const c of r.shopChanges) {
    assert.ok(c.reason); expectedShops.set(c.shopId, { ...expectedShops.get(c.shopId), ...c.after });
  }
  for (const [id, fields] of expectedShops) {
    const actual = shops.find(s => s.id === id)!; assert.ok(actual);
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(actual[key as keyof Shop], value, id);
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
  assert.equal(clean.candidates.filter(c => c.code === 'unspecified-quantity').length, 0);
  const ambiguous = structuredClone(shops.find(s => s.id === 'stationery-victorian-1')!);
  const ink = items(ambiguous).find(i => i.name === '黒インク 小瓶')!;
  ink.description = '内容量の記載がないインク。';
  assert.ok(auditCatalog([ambiguous]).candidates.some(c => c.code === 'unspecified-quantity' && c.itemId === ink.id));
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


test('昭和の並酒は量に応じた料金になり、英国食料品店は包装の内容量を説明する', () => {
  const tavern = shops.find(s => s.id === 'izakaya-showa-2')!;
  const one = items(tavern).find(i => i.name === '日本酒 一合')!;
  const two = items(tavern).find(i => i.name === '燗酒 二合')!;
  assert.equal(two.price, one.price * 2);
  assert.match(one.description, /180ml/); assert.match(two.description, /360ml/);
  const grocers = shops.filter(s => s.era === 'victorian' && s.category === 'grocer');
  assert.equal(grocers.length, 3);
  assert.equal(auditCatalog(grocers).candidates.filter(c => c.code === 'unspecified-quantity').length, 0);
  for (const shop of grocers) {
    const bottle = items(shop).find(i => i.name === '酢 小瓶')!;
    assert.match(bottle.description, /半英パイント.*284ml/);
    const doc = menuPlainText(toMenuDocument(shop, { itemIds: [bottle.id] }));
    assert.ok(doc.includes(bottle.description));
    assert.ok(doc.includes('容器代を含みます'));
  }
});


void test('米英の容量と重量を区別し、無料の挽き分けは豆代を含まず出力・合計できる', () => {
  const american = shops.find(s => s.id === 'general-store-america-1920s-3')!;
  const vinegar = items(american).find(i => i.name === '酢 小瓶')!;
  assert.match(vinegar.description, /半米液量パイント.*237ml/);
  const inkShop = shops.find(s => s.id === 'stationery-victorian-1')!;
  const ink = items(inkShop).find(i => i.name === '黒インク 小瓶')!;
  assert.match(ink.description, /二英液量オンス.*57ml/);
  const beans = items(american).find(i => i.name === '珈琲豆 小袋')!;
  const grinding = items(american).find(i => i.name === '購入した珈琲豆の挽き分け')!;
  assert.equal(grinding.kind, 'service'); assert.equal(grinding.price, 0);
  assert.match(grinding.description, /豆の代金は別/);
  assert.ok(!recommendItems(items(american)).some(i => i.id === grinding.id));
  const doc = toMenuDocument(american, { itemIds: [beans.id, grinding.id] });
  assert.equal(menuTotal(doc), beans.price);
  assert.ok(menuPlainText(doc).includes(grinding.description));
  for (const shop of shops.filter(s => s.category === 'delicatessen' && s.era === 'america-1920s')) {
    const salad = items(shop).find(i => i.name === 'ポテトサラダ 小箱')!;
    assert.match(salad.description, /正味四オンス.*113g/);
    assert.ok(menuPlainText(toMenuDocument(shop, { itemIds: [salad.id] })).includes(salad.description));
  }
});
