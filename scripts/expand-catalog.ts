// Editorial additions for the September content expansion. Existing IDs and items stay intact.
// Run once with Node's type stripping; rerunning skips sections already added.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Shop, MenuItem } from '../src/data/types.ts';
type Addition = { category: string; scenes?: [string, string]; titles?: [string, string]; menus: [string, string] };
const additions = JSON.parse(readFileSync('scripts/catalog-expansion.json', 'utf8')) as Addition[];
const updates: {path: string; data: {shops: Shop[]}}[] = [];
let changed = 0, added = 0;
const categories = new Set<string>();
for (const addition of additions) {
  if (categories.has(addition.category)) throw new Error(`Duplicate category ${addition.category}`);
  categories.add(addition.category);
  const path = `src/data/shops/${addition.category}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8')) as {shops: Shop[]};
  if (addition.menus.length !== 2) throw new Error(`Expected a pair: ${addition.category}`);
  // This historical migration applies only to the original two shops.
  for (const index of [0, 1]) {
    const shop = data.shops.find(shop => shop.id === `${addition.category}-${index + 1}`);
    if (!shop) throw new Error(`Missing original shop: ${addition.category}-${index + 1}`);
    const sectionId = `${shop.id}-section-editorial`;
    if (shop.menuSections.some(section => section.id === sectionId)) continue;
    const names = new Set(shop.menuSections.flatMap(s => s.items).map(i => i.name));
    const items: MenuItem[] = addition.menus[index].trim().split('\n').map((row, number) => {
      const fields = row.split('|');
      if (fields.length !== 4) throw new Error(`Invalid row: ${row}`);
      const [name, rawPrice, group, description] = fields;
      const price = Number(rawPrice);
      if (!name || names.has(name) || !Number.isSafeInteger(price) || price < 0 || description.length < 8) throw new Error(`Invalid or duplicate item in ${shop.id}: ${name}`);
      names.add(name);
      if (!['food', 'side', 'dessert', 'drink', 'goods', 'fee', 'addon', 'service'].includes(group)) throw new Error(`Invalid kind: ${group}`);
      const kind = group === 'side' || group === 'dessert' ? 'food' : group as MenuItem['kind'];
      const recommendationGroup = kind === 'food' ? group === 'food' ? 'main' : group as 'side' | 'dessert' : kind === 'drink' || kind === 'goods' ? kind : undefined;
      return {id: `${shop.id}-editorial-${number + 1}`, name, price, description, kind, ...(recommendationGroup ? {recommendationGroup} : {}), recommended: number === 0 && ['food', 'drink', 'goods'].includes(kind)};
    });
    if (addition.scenes) {
      const fields = addition.scenes[index].split('|');
      if (fields.length !== 3 || fields.some(value => value.length < 12)) throw new Error(`Incomplete scene: ${shop.id}`);
      const [interior, service, localFlavor] = fields;
      shop.scene = {interior, service, signature: `${items[0].name}と${items[1].name}`, localFlavor};
    }
    shop.menuSections.push({id: sectionId, title: addition.titles?.[index] ?? 'この店ならではの品', items});
    changed++; added += items.length;
  }
  updates.push({path, data});
}
// Validate the full batch before writing any canonical file.
for (const {path, data} of updates) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`Expanded ${changed} shops with ${added} items; retained all existing menu sections and IDs.`);
