import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { defaultFilters,matchesFilters,sample,readIds,remember,menuText,gmText,parseRoute,normalize } from '../src/lib/catalog.ts';
import type { Category,Shop,ShopSummary } from '../src/data/types.ts';
const index=JSON.parse(readFileSync('src/data/generated-index.json','utf8')) as {categories:Category[];shops:ShopSummary[];itemCount:number};
const allShops:Shop[]=readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).flatMap(file=>JSON.parse(readFileSync(`src/data/shops/${file}`,'utf8')).shops);
test('76カテゴリ・315店舗・6,619商品が揃い、現代の195店舗も保持する',()=>{
 assert.equal(index.categories.length,76);assert.equal(allShops.length,315);assert.equal(index.itemCount,6619);
 const modern=allShops.filter(s=>s.era==='modern');assert.equal(modern.length,195);assert.equal(new Set(modern.map(s=>s.category)).size,65);
 for(const category of new Set(modern.map(s=>s.category)))assert.equal(modern.filter(s=>s.category===category).length,3,category);
 for(const shop of allShops)assert.ok(shop.menuSections.flatMap(section=>section.items).length>=21,shop.id);
 assert.equal(allShops.length,index.shops.length);
});
test('全データのID・分類・価格・説明と静的出力の整合性',()=>{
 const ids=new Set<string>();
 for(const shop of allShops){assert.ok(!ids.has(shop.id));ids.add(shop.id);assert.ok(index.categories.some(c=>c.id===shop.category));assert.ok(shop.description);assert.ok(shop.openingHours);assert.ok(shop.menuSections.length);
  const itemNames=new Set<string>();for(const section of shop.menuSections){assert.ok(section.items.length);for(const item of section.items){assert.ok(!ids.has(item.id));ids.add(item.id);assert.ok(!itemNames.has(item.name));itemNames.add(item.name);assert.ok(Number.isInteger(item.price)&&item.price>=0);assert.ok(item.description?.length>3);}}
  assert.equal(index.shops.find(s=>s.id===shop.id)?.itemCount,shop.menuSections.flatMap(s=>s.items).length);
  const output=JSON.parse(readFileSync(`public/data/${shop.category}.json`,'utf8'));assert.deepEqual(output.shops.find((s:Shop)=>s.id===shop.id),shop);
 }
});
test('商品名・説明・複数語・読みの表記ゆれを検索できる',()=>{
 const pudding=index.shops.filter(s=>matchesFilters(s,{...defaultFilters,query:'プリン'}));assert.ok(new Set(pudding.map(s=>s.category)).size>=5);
 const kissa=index.shops.find(s=>s.id==='kissaten-1')!;
 assert.ok(matchesFilters(kissa,{...defaultFilters,query:'ぷりん'}));assert.ok(matchesFilters(kissa,{...defaultFilters,query:'珈琲'}));assert.ok(matchesFilters(kissa,{...defaultFilters,query:'プリン 昭和レトロ'}));assert.ok(!matchesFilters(kissa,{...defaultFilters,query:'プリン 未収録の料理'}));
 assert.equal(normalize('Ｃｏｆｆｅｅ ﾌﾟﾘﾝ'),'coffee ぷりん');
 const convenience=index.shops.find(s=>s.id==='convenience-store-1')!;assert.ok(matchesFilters(convenience,{...defaultFilters,query:'文房具'}));
});
test('条件を組み合わせ、ランダムも該当店舗だけから選ぶ',()=>{
 const results=index.shops.filter(s=>matchesFilters(s,{...defaultFilters,category:'izakaya',price:'cheap',scale:'independent',era:'modern'}));assert.ok(results.length>0);
 for(let i=0;i<30;i++){const selected=sample(results,1)[0];assert.equal(selected.category,'izakaya');assert.equal(selected.priceLevel,'cheap');}
 assert.equal(index.shops.filter(s=>matchesFilters(s,{...defaultFilters,category:'kissaten',price:'very-cheap'})).length,0);
 assert.equal(index.shops.filter(s=>matchesFilters(s,{...defaultFilters,era:'showa'})).length,30);
});
test('おすすめは重複せず空配列・少数品にも対応する',()=>{const items=allShops[0].menuSections.flatMap(s=>s.items);const selected=sample(items,3,()=>.4);assert.equal(selected.length,3);assert.equal(new Set(selected.map(x=>x.id)).size,3);assert.deepEqual(sample([],3),[]);assert.deepEqual(sample(['one'],3),['one']);});
test('保存値の破損・未知IDを除外し、履歴は重複なしの最新20件',()=>{
 const ids=index.shops.map(s=>s.id);assert.deepEqual(readIds('not json',ids),[]);assert.deepEqual(readIds('{"x":1}',ids),[]);assert.deepEqual(readIds(JSON.stringify([ids[0],ids[0],'unknown',null,7]),ids),[ids[0]]);
 let recent:string[]=[];for(const id of ids.slice(0,25))recent=remember(recent,id);assert.equal(recent.length,20);assert.equal(recent[0],ids[24]);recent=remember(recent,ids[10]);assert.equal(recent[0],ids[10]);assert.equal(new Set(recent).size,20);
});
test('コピー用テキストに店舗説明と全商品の名称・価格が含まれる',()=>{const shop=allShops.find(s=>s.id==='kissaten-1')!;const text=menuText(shop);for(const item of shop.menuSections.flatMap(s=>s.items)){assert.ok(text.includes(item.name));assert.ok(text.includes(item.description));assert.ok(text.includes(`¥${item.price.toLocaleString('ja-JP')}`));}assert.ok(gmText(shop).includes(shop.description));assert.ok(gmText(shop).includes(shop.openingHours));});
test('店舗・PL・カテゴリの共有URLと不正なURLを区別する',()=>{assert.deepEqual(parseRoute('#/shop/kissaten-1'),{kind:'shop',id:'kissaten-1',pl:false});assert.deepEqual(parseRoute('#/shop/kissaten-1?mode=pl'),{kind:'shop',id:'kissaten-1',pl:true});assert.deepEqual(parseRoute('#/categories/izakaya'),{kind:'catalog',category:'izakaya'});assert.deepEqual(parseRoute('#/unknown'),{kind:'missing'});assert.deepEqual(parseRoute('#/shop/../../something'),{kind:'missing'});assert.deepEqual(parseRoute(''),{kind:'catalog',category:'all'});});
