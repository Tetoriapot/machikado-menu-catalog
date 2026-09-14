import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Shop } from '../src/data/types.ts';
import { eraCurrencies } from '../src/data/eras.ts';

type Finding = { shopId: string; itemId?: string; code: string; detail: string };
export function auditCatalog(shops: Shop[]) {
  const errors: Finding[] = [], candidates: Finding[] = [];
  const ids = new Set<string>();
  const eras: Record<string, { shops: number; items: number }> = {};
  const groups: Record<string, { shops: number; items: number }> = {};
  const years = { heisei: 1998, showa: 1968, victorian: 1890, 'america-1920s': 1926 };
  let itemCount = 0;
  const id = (value: string, shop: Shop, itemId?: string) => {
    if (!value || ids.has(value)) errors.push({ shopId: shop.id, itemId, code: 'duplicate-id', detail: value });
    ids.add(value);
  };
  for (const shop of shops) {
    id(shop.id, shop);
    if ((shop.currency ?? 'JPY') !== eraCurrencies[shop.era]) errors.push({ shopId: shop.id, code: 'currency', detail: `${shop.era}: ${shop.currency}` });
    if (shop.era !== 'modern' && (shop.setting?.year !== years[shop.era] || !shop.setting?.place)) errors.push({ shopId: shop.id, code: 'setting', detail: '舞台年または場所が不一致' });
    const all = shop.menuSections.flatMap(section => section.items);
    itemCount += all.length;
    for (const [key, target] of [[shop.era, eras], [`${shop.era}/${shop.category}`, groups]] as const) {
      target[key] ??= { shops: 0, items: 0 }; target[key].shops++; target[key].items += all.length;
    }
    if (all.length < 21) errors.push({ shopId: shop.id, code: 'short-menu', detail: String(all.length) });
    for (const field of ['name', 'description', 'openingHours'] as const) if (!shop[field]?.trim()) errors.push({ shopId: shop.id, code: 'missing-content', detail: field });
    const names = new Set<string>();
    for (const section of shop.menuSections) {
      id(section.id, shop);
      if (!section.title || !section.items.length) errors.push({ shopId: shop.id, code: 'empty-section', detail: section.id });
      for (const item of section.items) {
        id(item.id, shop, item.id);
        const report = (code: string, detail: string, candidate = false) => (candidate ? candidates : errors).push({ shopId: shop.id, itemId: item.id, code, detail });
        if (!item.name?.trim() || names.has(item.name)) report('item-name', item.name);
        names.add(item.name);
        if (!Number.isSafeInteger(item.price) || item.price < 0) report('price', String(item.price));
        if (!item.description || item.description.length < 4) report('description', item.name);
        if (!['food', 'drink', 'goods', 'fee', 'addon', 'service'].includes(item.kind)) report('kind', item.kind);
        if (['木の箸', '絵葉書'].includes(item.name) && item.kind !== 'goods') report('nonfood', item.name);
        if (shop.category === 'kissaten' && item.name === 'アメリカン' && item.kind !== 'drink') report('coffee-kind', item.name);
        if (['victorian', 'america-1920s'].includes(shop.era) && /斤/.test(item.name)) report('ambiguous-weight', item.name, true);
        if (['victorian', 'america-1920s'].includes(shop.era) && /小袋|小瓶|小缶|小壺/.test(item.name) && !/ポンド|オンス|パイント|\d+\s*(ml|g)/i.test(item.description)) report('unspecified-quantity', item.name, true);
        if (item.kind === 'addon' && /小盛り.*変更/.test(item.name) && item.price > 0) report('portion-fee', '減量で料金が増える条件を確認', true);
      }
    }
    if (shop.era === 'heisei' && shop.category === 'net-cafe') {
      for (const [hour, pack] of [['ワープロ利用 一時間', '文書作成 二時間'], ['インターネット席 一時間', '調べもの端末 二時間']]) {
        const base = all.find(i => i.name === hour), plan = all.find(i => i.name === pack);
        if (base && plan && plan.price > base.price * 2) candidates.push({ shopId: shop.id, itemId: plan.id, code: 'duration-price', detail: '二時間パックが通常料金二回分より高い。付帯サービス等を確認' });
      }
    }
  }
  return { shops: shops.length, items: itemCount, eras, groups, errors, candidates };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shops: Shop[] = readdirSync('src/data/shops').filter(f => f.endsWith('.json')).flatMap(file => JSON.parse(readFileSync(`src/data/shops/${file}`, 'utf8')).shops);
  const result = auditCatalog(shops);
  console.log(JSON.stringify(process.argv.includes('--json') ? result : {
    shops: result.shops, items: result.items, eras: result.eras,
    errors: result.errors, reviewCandidates: result.candidates.length,
    candidateCodes: Object.fromEntries([...new Set(result.candidates.map(c => c.code))].map(code => [code, result.candidates.filter(c => c.code === code).length])),
    note: '候補は要確認の目印であり誤りの断定ではありません。全商品の実売価格・史料照合を意味しません。詳細は --json。',
  }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
