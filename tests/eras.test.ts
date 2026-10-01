import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import type { Shop, ShopSummary, Era } from '../src/data/types.ts';
import { eraLabels, eraCurrencies } from '../src/data/eras.ts';
import { defaultFilters, matchesFilters, matchingItems, sample, itemText, menuText, gmText, parseRoute } from '../src/lib/catalog.ts';
import { money, currencyUnit } from '../src/lib/currency.ts';
import { toMenuDocument, renderMenuHtml } from '../src/lib/menu-document.ts';
import { menuPlainText, menuTotal, renderMenuCsv, renderMenuJson, renderMenuSvg } from '../src/lib/menu-export.ts';
import { parseBackup, randomPool, type LibraryBackup } from '../src/lib/library.ts';

const summaries=JSON.parse(readFileSync('src/data/generated-index.json','utf8')).shops as ShopSummary[];
const shops:Shop[]=readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).flatMap(file=>JSON.parse(readFileSync(`src/data/shops/${file}`,'utf8')).shops);
const historical=shops.filter(s=>s.era!=='modern');
const settings={heisei:1998,showa:1968,victorian:1890,'america-1920s':1926} as const;

test('通常の検索・抽選は現代195店舗に限定し、4時代へ切り替えると各30店舗になる',()=>{
 assert.deepEqual(Object.values(eraLabels),['現代','平成','昭和','ヴィクトリア朝イギリス','1920年代のアメリカ']);
 assert.equal(defaultFilters.era,'modern');
 const normal=summaries.filter(s=>matchesFilters(s,defaultFilters));assert.equal(normal.length,195);
 assert.ok(sample(normal,30,()=>.4).every(s=>s.era==='modern'));
 assert.ok(summaries.slice(0,195).every(s=>s.era==='modern'));
 for(const era of Object.keys(settings) as (keyof typeof settings)[]){
  const results=summaries.filter(s=>matchesFilters(s,{...defaultFilters,era}));assert.equal(results.length,30);
  assert.equal(new Set(results.map(s=>s.category)).size,10);
  const used=results.slice(0,27).map(s=>s.id);const pool=randomPool(results,used,true);assert.equal(pool.length,3);
  assert.ok(sample(pool,3).every(s=>s.era===era&&!used.includes(s.id)));
  for(const category of new Set(results.map(s=>s.category)))assert.equal(summaries.filter(s=>matchesFilters(s,{...defaultFilters,era,category})).length,3);
 }
});

test('歴史店舗120店は舞台年・通貨・固有の名物と情景を持ち、名称と商品IDが一意',()=>{
 assert.equal(historical.length,120);assert.equal(new Set(shops.map(s=>s.name)).size,315);
 const allIds=new Set<string>();let count=0;
 for(const shop of shops){
  for(const id of [shop.id,...shop.menuSections.flatMap(s=>[s.id,...s.items.map(i=>i.id)])]){assert.ok(!allIds.has(id),id);allIds.add(id);}
 }
 for(const shop of historical){
  assert.equal(shop.setting?.year,settings[shop.era as keyof typeof settings]);assert.ok(shop.setting?.place);
  assert.equal(shop.currency,eraCurrencies[shop.era]);
  const items=shop.menuSections.flatMap(s=>s.items);assert.equal(items.filter(i=>!i.id.includes('-review-')).length,21);count+=items.length;
  assert.ok(items.every(i=>Number.isSafeInteger(i.price)&&i.price>=0));
  const signatures=items.filter(i=>i.id.includes('-signature-'));assert.equal(signatures.length,3);
  for(const sibling of historical.filter(s=>s.era===shop.era&&s.category===shop.category&&s.id!==shop.id)){
   const siblingNames=sibling.menuSections.flatMap(s=>s.items.map(i=>i.name));
   assert.ok(signatures.every(i=>!siblingNames.includes(i.name)),shop.id);assert.notDeepEqual(shop.scene,sibling.scene);
  }
  for(const field of ['interior','service','signature','localFlavor'] as const)assert.ok((shop.scene?.[field].length??0)>10,`${shop.id}:${field}`);
  assert.doesNotMatch(JSON.stringify(shop),/スマートフォン|スマホ|QRコード|Wi-?Fi|USB|キャッシュレス|電子マネー|タッチパネル|オンライン注文/i,shop.id);
  assert.ok(shop.priceNote?.includes('架空価格'));
 }
 assert.equal(count,2541);
});

test('舞台・店名・名物から該当店舗へ到達し、歴史店舗の共有URLを解釈できる',()=>{
 for(const shop of historical){
  const summary=summaries.find(s=>s.id===shop.id)!;
  assert.ok(matchesFilters(summary,{...defaultFilters,era:shop.era,query:`${shop.setting!.year} ${shop.setting!.place}`}));
  assert.ok(matchesFilters(summary,{...defaultFilters,era:shop.era,query:shop.name}));
  const item=shop.menuSections[0].items[0];assert.ok(matchingItems(summary,item.name).some(i=>i.id===item.id));
  assert.deepEqual(parseRoute(`#/menu/${shop.id}`),{kind:'shop',id:shop.id,pl:true,readOnly:true});
  assert.deepEqual(parseRoute(`#/shop/${shop.id}?item=${item.id}`),{kind:'shop',id:shop.id,pl:false,item:item.id});
 }
});

test('旧英国通貨は12ペンス・20シリングで桁上げし、米ドルはセント単位から表示する',()=>{
 assert.equal(money(1200),'¥1,200');
 for(const [amount,expected] of [[0,'0d'],[11,'11d'],[12,'1s'],[239,'19s 11d'],[240,'£1'],[253,'£1 1s 1d']] as const)assert.equal(money(amount,'GBP-predecimal'),expected);
 assert.equal(money(5,'USD'),'$0.05');assert.equal(money(125,'USD'),'$1.25');
});

test('価格条件・選択合計・コピー・全配布形式で円／ペンス／セントの単位を維持する',()=>{
 for(const era of Object.keys(settings) as Era[]){
  const shop=historical.find(s=>s.era===era)!;const summary=summaries.find(s=>s.id===shop.id)!;
  const items=shop.menuSections.flatMap(s=>s.items);const selected=items.slice(0,2);const item=items.find(i=>['food','drink','goods'].includes(i.kind)&&i.price>0)!;
  assert.ok(matchesFilters(summary,{...defaultFilters,era,query:item.name,maxItemPrice:String(item.price)}));
  assert.ok(matchingItems(summary,item.name,String(item.price)).some(i=>i.id===item.id));
  assert.ok(!matchingItems(summary,item.name,String(item.price-1)).some(i=>i.id===item.id));
  const menu=toMenuDocument(shop,{itemIds:selected.map(i=>i.id)});assert.equal(menuTotal(menu),selected[0].price+selected[1].price);
  const exports=[menuText(shop),gmText(shop),menuPlainText(menu),renderMenuHtml(menu),renderMenuSvg(menu).svg];
  for(const output of exports)for(const i of selected)assert.ok(output.includes(money(i.price,shop.currency)),`${shop.id}: ${i.id}`);
  assert.ok(itemText(item,shop.currency).includes(money(item.price,shop.currency)));
  assert.ok(renderMenuCsv(menu).includes(`価格（${currencyUnit(shop.currency)}）`));
  const json=JSON.parse(renderMenuJson(menu));assert.equal(json.currency,shop.currency);assert.equal(json.priceUnit,currencyUnit(shop.currency));
  assert.deepEqual(json.sections.flatMap((s:{items:{price:number}[]})=>s.items.map(i=>i.price)),selected.map(i=>i.price));
  if(era==='victorian'||era==='america-1920s')for(const output of exports)assert.ok(!output.includes('¥'));
  for(const output of [menuPlainText(menu),renderMenuHtml(menu),renderMenuSvg(menu).svg,renderMenuJson(menu),renderMenuCsv(menu)])assert.ok(!output.includes(shop.scene!.localFlavor));
  assert.ok(gmText(shop).includes(shop.setting!.place));
 }
});

test('315店舗すべてのお気に入り・卓・使用済みを欠落なく保存し、履歴だけ20件に制限する',()=>{
 const ids=shops.map(s=>s.id);
 const backup:LibraryBackup={format:'machikado-session-library',version:1,favorites:ids,recent:ids,library:{activeId:'all-eras',folders:[{id:'all-eras',name:'五つの時代',entries:ids.map(shopId=>({shopId,alias:'',notes:'GMメモ'})),usedIds:ids}]}};
 const restored=parseBackup(JSON.stringify(backup),ids);
 assert.deepEqual(restored.favorites,ids);assert.deepEqual(restored.library,backup.library);assert.equal(restored.recent.length,20);
});
