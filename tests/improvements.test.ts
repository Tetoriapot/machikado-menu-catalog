import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Shop,ShopSummary } from '../src/data/types.ts';
import { matchingItems,parseRoute,recommendItems,matchesFilters,defaultFilters } from '../src/lib/catalog.ts';
import { renderMenuHtml,toMenuDocument } from '../src/lib/menu-document.ts';
import { emptyLibrary, mergeBackup, parseBackup, randomPool, updateEntry, validateLibrary, type LibraryBackup } from '../src/lib/library.ts';
import { menuPlainText, menuTotal, renderMenuCsv, renderMenuJson, renderMenuSvg } from '../src/lib/menu-export.ts';
import { gmText } from '../src/lib/catalog.ts';
const summaries=(JSON.parse(readFileSync('src/data/generated-index.json','utf8')).shops as ShopSummary[]).filter(s=>s.era==='modern');
const shop=JSON.parse(readFileSync('src/data/shops/kissaten.json','utf8')).shops[0] as Shop;
const originalCategories=new Set((JSON.parse(readFileSync('scripts/third-shop-drafts.json','utf8')) as {category:string}[]).map(d=>d.category));
const legacySummaries=summaries.filter(s=>originalCategories.has(s.category));
test('先行増補した100店舗の2,104品と情景、480品の追加内容を保持する', () => {
 const originals=legacySummaries.filter(s=>/-[12]$/.test(s.id));
 assert.equal(originals.length,100);assert.equal(originals.reduce((n,s)=>n+s.itemCount,0),2104);
 let additions=0;
 for(const summary of originals){
  assert.ok(summary.itemCount>=21,summary.id);
  for(const field of ['interior','service','signature','localFlavor'] as const)assert.ok((summary.scene?.[field].length??0)>0,`${summary.id}: ${field}`);
  const items=summary.menuIndex.filter(i=>i.id.includes('-editorial-'));assert.ok(items.length===3||items.length===6);additions+=items.length;
  const sibling=originals.find(s=>s.category===summary.category&&s.id!==summary.id)!;
  assert.ok(items.every(i=>!sibling.menuIndex.some(other=>other.name===i.name)),summary.id);
 }
 assert.equal(additions,480);
});

test('従来の50カテゴリに第三店舗があり、各店21品のうち9品は従来の二店と異なる',()=>{
 assert.equal(legacySummaries.length,150);assert.equal(legacySummaries.reduce((n,s)=>n+s.itemCount,0),3154);
 const categories=new Set(legacySummaries.map(s=>s.category));assert.equal(categories.size,50);
 const newShops=legacySummaries.filter(s=>s.id.endsWith('-3'));assert.equal(newShops.length,50);
 for(const category of categories){
  const siblings=summaries.filter(s=>s.category===category);assert.equal(siblings.length,3,category);
  const fresh=siblings.find(s=>s.id===`${category}-3`)!;assert.ok(fresh);assert.equal(fresh.itemCount,21);
  for(const field of ['interior','service','signature','localFlavor'] as const)assert.ok((fresh.scene?.[field].length??0)>0,`${category}: ${field}`);
  const newItems=fresh.menuIndex.filter(i=>i.id.includes('-original-'));assert.equal(newItems.length,9);
  for(const sibling of siblings.filter(s=>s.id!==fresh.id)){
   const oldNames=new Set(sibling.menuIndex.map(i=>i.name));
   assert.ok(newItems.every(i=>!oldNames.has(i.name)),category);
   assert.ok(fresh.menuIndex.filter(i=>oldNames.has(i.name)).length<=12,category);
   assert.notEqual(fresh.name,sibling.name);assert.notDeepEqual(fresh.scene,sibling.scene);
  }
 }
 // Keep the original first and second editions ahead of new additions.
 assert.ok(legacySummaries.slice(0,100).every(s=>/-[12]$/.test(s.id)));
 assert.ok(legacySummaries.slice(100).every(s=>s.id.endsWith('-3')));
});

test('新規15カテゴリ45店舗は店ごとの9品と情景を持ち、カテゴリ検索で三店すべてに到達する',()=>{
 const expected=['tempura','unagi','korean','thai','indian','onigiri','takoyaki','tea-store','liquor-store','electronics','outdoor','music-store','museum','zoo','bathhouse'];
 const fresh=summaries.filter(s=>!originalCategories.has(s.category));assert.equal(fresh.length,45);assert.equal(fresh.reduce((n,s)=>n+s.itemCount,0),945);
 assert.deepEqual([...new Set(fresh.map(s=>s.category))].sort(),[...expected].sort());
 for(const category of expected){
  const data=JSON.parse(readFileSync(`src/data/shops/${category}.json`,'utf8')) as {category:{label:string};shops:Shop[]};
  assert.deepEqual(parseRoute(`#/categories/${category}`),{kind:'catalog',category});
  const selected=summaries.filter(s=>matchesFilters(s,{...defaultFilters,category}));assert.equal(selected.length,3);
  for(const s of selected){
   assert.equal(s.itemCount,21);assert.ok(matchesFilters(s,{...defaultFilters,query:data.category.label}));
   const unique=s.menuIndex.filter(i=>i.id.includes('-original-'));assert.equal(unique.length,9);
   for(const sibling of selected.filter(x=>x.id!==s.id)){
    const names=new Set(sibling.menuIndex.map(i=>i.name));assert.ok(unique.every(i=>!names.has(i.name)),s.id);
    assert.equal(s.menuIndex.filter(i=>names.has(i.name)).length,12);assert.notEqual(s.name,sibling.name);assert.notDeepEqual(s.scene,sibling.scene);
   }
   for(const field of ['interior','service','signature','localFlavor'] as const)assert.ok((s.scene?.[field].length??0)>0,`${s.id}:${field}`);
   assert.ok(matchingItems(s,unique[0].name).some(i=>i.id===unique[0].id));
  }
 }
});

test('全195店舗の保存を復元でき、銭湯の利用料は商品おすすめへ混ぜず配布物には残す',()=>{
 const validIds=summaries.map(s=>s.id);
 const backup:LibraryBackup={format:'machikado-session-library',version:1,favorites:validIds,recent:[],library:{activeId:'all-shops',folders:[{id:'all-shops',name:'全店舗資料',entries:validIds.map(shopId=>({shopId,alias:'',notes:''})),usedIds:validIds}]}};
 assert.deepEqual(parseBackup(JSON.stringify(backup),validIds),backup);
 const bath=JSON.parse(readFileSync('src/data/shops/bathhouse.json','utf8')).shops[0] as Shop;
 const items=bath.menuSections.flatMap(s=>s.items);assert.ok(items.some(i=>i.kind==='fee'));
 assert.ok(recommendItems(items).every(i=>!['fee','service','addon'].includes(i.kind)));
 const player=renderMenuHtml(toMenuDocument(bath));assert.ok(player.includes('大人入浴 一回'));assert.ok(player.includes(bath.priceNote!));
 for(const value of Object.values(bath.scene!))assert.ok(!player.includes(value));
});

test('新店舗の商品検索・直接URL・卓の保存・PL出力が同じIDで連携する',()=>{
 const fresh=JSON.parse(readFileSync('src/data/shops/bookstore.json','utf8')).shops.find((s:Shop)=>s.id==='bookstore-3') as Shop;
 const item=fresh.menuSections[0].items[0],summary=summaries.find(s=>s.id===fresh.id)!;
 assert.ok(matchesFilters(summary,{...defaultFilters,query:item.name}));assert.equal(matchingItems(summary,item.name)[0].id,item.id);
 assert.deepEqual(parseRoute(`#/shop/${fresh.id}?item=${item.id}`),{kind:'shop',id:fresh.id,pl:false,item:item.id});
 const backup:LibraryBackup={format:'machikado-session-library',version:1,favorites:['kissaten-1',fresh.id],recent:[fresh.id],library:{activeId:'session-new',folders:[{id:'session-new',name:'港の卓',entries:[{shopId:fresh.id,alias:'町の書店',notes:'GM用の秘密'}],usedIds:[fresh.id]}]}};
 assert.deepEqual(parseBackup(JSON.stringify(backup),summaries.map(s=>s.id)),backup);
 const player=renderMenuHtml(toMenuDocument(fresh));assert.ok(player.includes(item.name));assert.ok(gmText(fresh).includes(fresh.scene!.interior));assert.ok(!player.includes(fresh.scene!.interior));
});
test('新しい情景をGMテキストに含め、PL配布物へは持ち出さない', () => {
 const book=JSON.parse(readFileSync('src/data/shops/bookstore.json','utf8')).shops[0] as Shop;
 const gm=gmText(book);const player=renderMenuHtml(toMenuDocument(book));
 for(const value of Object.values(book.scene!)){assert.ok(gm.includes(value));assert.ok(!player.includes(value));}
 assert.ok(player.includes('郷土資料『旧駅舎と商店街の百年』'));
 assert.ok(matchesFilters(summaries.find(s=>s.id===book.id)!,{...defaultFilters,query:'郷土資料'}));
});
test('検索結果には一致した商品と価格が出て、商品へのURLを解釈できる',()=>{
 const summary=summaries.find(s=>s.id===shop.id)!;const matches=matchingItems(summary,'プリン');assert.equal(matches[0].name,'自家製プリン');assert.equal(matches[0].price,550);assert.equal(matchingItems(summary,'昭和レトロ').length,0);assert.equal(matchingItems(summary,'').length,0);
 assert.deepEqual(parseRoute(`#/shop/${shop.id}?item=${matches[0].id}`),{kind:'shop',id:shop.id,pl:false,item:matches[0].id});
});
test('配布用HTMLは単体で表示できる資料で、GM設定を持ち出さず、入力をエスケープする',()=>{
 const withPrivate={...shop,notes:'秘密の犯人メモ',description:'秘密の店舗説明'};const document=toMenuDocument(withPrivate,{title:'<script>alert(1)</script>'});const html=renderMenuHtml(document);
 assert.ok(html.startsWith('<!doctype html>'));assert.ok(html.includes('自家製プリン'));assert.ok(html.includes('¥550'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('秘密'));assert.ok(!html.includes('fetch('));assert.ok(!html.includes('href='));assert.ok(!html.includes('src='));
 assert.deepEqual(parseRoute(`#/menu/${shop.id}`),{kind:'shop',id:shop.id,pl:true,readOnly:true});
});
test('同じ店種の主要店舗は品揃えと情景が異なる',()=>{
 for(const id of ['kissaten','family-restaurant','cafe','izakaya','ramen','teishoku','chinese','yakiniku','sushi','bar','convenience-store','supermarket','drugstore','hotel','hospital','student-cafeteria','karaoke','net-cafe','cinema','service-area']){
 const [a,b]=JSON.parse(readFileSync(`src/data/shops/${id}.json`,'utf8')).shops as Shop[];
 const ai=a.menuSections.flatMap(s=>s.items),bi=b.menuSections.flatMap(s=>s.items);const common=ai.filter(i=>bi.some(j=>j.name===i.name));
 assert.ok(common.length/Math.min(ai.length,bi.length)<.6,id);assert.ok(a.scene?.signature);assert.notEqual(a.scene?.signature,b.scene?.signature);
 }
});
test('おすすめは料金・サービス・追加を含まず、異なる分類から選ぶ',()=>{
 for(const s of summaries){for(let run=0;run<8;run++){const picks=recommendItems(s.menuIndex);assert.ok(picks.every(i=>['food','drink','goods'].includes(i.kind)));assert.equal(new Set(picks.map(i=>i.id)).size,picks.length);assert.ok(picks.length<=3);}}
 const bar=summaries.find(s=>s.id==='bar-1')!;assert.ok(bar.menuIndex.some(i=>i.kind==='fee'));assert.ok(!recommendItems(bar.menuIndex).some(i=>i.name.includes('席料')));
 const cinema=summaries.find(s=>s.id==='cinema-1')!;assert.equal(cinema.menuIndex.find(i=>i.name==='アイスティー M')?.kind,'drink');
 const ice=summaries.find(s=>s.id==='ice-cream-1')!;assert.equal(ice.menuIndex.find(i=>i.name==='抹茶 シングル')?.kind,'food');assert.equal(ice.menuIndex.find(i=>i.name==='アイスコーヒー')?.kind,'drink');
});
test('商品予算は一致する商品に適用され、席料の安さを拾わない',()=>{
 const kissa=summaries.find(s=>s.id==='kissaten-1')!;
 assert.ok(!matchesFilters(kissa,{...defaultFilters,query:'プリン',maxItemPrice:'500'}));assert.ok(matchesFilters(kissa,{...defaultFilters,query:'プリン',maxItemPrice:'550'}));
 assert.ok(matchingItems(kissa,'プリン','550').every(i=>i.price<=550));assert.ok(!matchesFilters(kissa,{...defaultFilters,maxItemPrice:'-1'}));
 const feeOnly={...kissa,menuIndex:kissa.menuIndex.map(i=>({...i,kind:'fee' as const,price:10}))};assert.ok(!matchesFilters(feeOnly,{...defaultFilters,maxItemPrice:'100'}));
});
test('卓のバックアップは別名・GMメモ・使用済みを復元し、異なる同名IDの卓を上書きしない', () => {
 const validIds = summaries.map(s => s.id);
 const current: LibraryBackup = {format:'machikado-session-library',version:1,favorites:[shop.id],recent:[shop.id],library:{activeId:'session-1',folders:[{id:'session-1',name:'雨の町',entries:[{shopId:shop.id,alias:'港の喫茶室',notes:'犯人が立ち寄る'}],usedIds:[shop.id]}]}};
 const incoming = structuredClone(current); incoming.library.folders[0].entries[0].notes = '別端末でのメモ'; incoming.favorites.push('unknown-shop'); incoming.library.folders[0].entries.push({shopId:'unknown-shop',alias:'旧店舗',notes:''});
 const parsed = parseBackup(JSON.stringify(incoming), validIds);
 assert.equal(parsed.library.folders[0].entries.length,1);assert.deepEqual(parsed.favorites,[shop.id]);
 const merged = mergeBackup(current, parsed, () => 'session-2');
 assert.equal(merged.library.folders.length,2);assert.equal(merged.library.folders[0].entries[0].notes,'犯人が立ち寄る');assert.equal(merged.library.folders[1].entries[0].notes,'別端末でのメモ');assert.equal(merged.library.activeId,'session-1');
 assert.deepEqual(parseBackup(JSON.stringify(merged),validIds),merged);
 assert.equal(mergeBackup(current,current,()=>{throw new Error('identical should not clone');}).library.folders.length,1);
 const changed = updateEntry(current.library,'session-1',{shopId:shop.id,alias:'変更後',notes:'新しいメモ'});
 assert.equal(changed.folders[0].entries.length,1);assert.equal(changed.folders[0].entries[0].alias,'変更後');assert.equal(current.library.folders[0].entries[0].alias,'港の喫茶室');
});
test('破損・未対応・巨大バックアップを拒否し、履歴は20件まで復元する', () => {
 const validIds=summaries.map(s=>s.id);
 const backup:LibraryBackup={format:'machikado-session-library',version:1,library:emptyLibrary(),favorites:[],recent:validIds};
 assert.equal(parseBackup(JSON.stringify(backup),validIds).recent.length,20);
 assert.throws(()=>parseBackup('not json',validIds));assert.throws(()=>parseBackup(JSON.stringify({...backup,version:99}),validIds));assert.throws(()=>parseBackup(' '.repeat(2_000_001),validIds));
 assert.throws(()=>validateLibrary({activeId:null,folders:[{id:'a',name:'卓',entries:[{shopId:shop.id,alias:'',notes:'x'.repeat(5001)}],usedIds:[]}]},validIds));
});
test('現在の候補と使用済みを考慮し、ランダム店舗は使い切るまで重複しない', () => {
 const candidates=summaries.filter(s=>s.category==='kissaten');const used:string[]=[];
 while(randomPool(candidates,used,true).length){const next=randomPool(candidates,used,true)[0];assert.ok(!used.includes(next.id));used.push(next.id);}
 assert.equal(used.length,candidates.length);assert.equal(randomPool(candidates,used,true).length,0);assert.equal(randomPool(candidates,used,false).length,candidates.length);
 assert.ok(randomPool(candidates,[],false,candidates[0].id).every(s=>s.id!==candidates[0].id));
});
test('商品選択・短文・合計・各出力が同じメニューを参照し、GM情報を含めない', () => {
 const all=shop.menuSections.flatMap(s=>s.items);const selected=[all[0],all[2]];
 const menu=toMenuDocument({...shop,description:'秘密の設定'},{title:'卓の店名',itemIds:[...selected.map(i=>i.id),'missing']});
 assert.equal(menu.sections.flatMap(s=>s.items).length,2);assert.equal(menuTotal(menu),selected.reduce((sum,i)=>sum+i.price,0));assert.ok(menuPlainText(menu,true).includes(selected[0].name));assert.ok(!menuPlainText(menu,true).includes(selected[0].description));assert.ok(menuPlainText(menu).includes(selected[0].description));
 const html=renderMenuHtml(menu,{layout:'landscape',fontSize:24});const svg=renderMenuSvg(menu,{layout:'landscape',fontSize:24});const csv=renderMenuCsv(menu);const json=renderMenuJson(menu);
 for(const output of [html,svg.svg,csv,json]){assert.ok(output.includes(selected[0].name));assert.ok(output.includes('卓の店名'));assert.ok(!output.includes(all[1].name));assert.ok(!output.includes('秘密'));}
 assert.ok(html.includes('A4 landscape'));assert.equal(svg.width,1400);assert.ok(svg.height>200);assert.equal(JSON.parse(json).sections.flatMap((s:{items:unknown[]})=>s.items).length,2);
 assert.equal(menuTotal(toMenuDocument(shop,{itemIds:[]})),0);
 const noDescription=toMenuDocument(shop,{itemIds:selected.map(i=>i.id),descriptions:false});assert.ok(!renderMenuHtml(noDescription).includes(selected[0].description));
});
test('SVGはテキストをエスケープし、CSVは改行・引用符・数式先頭の店名を保護する', () => {
 const menu={name:' =HYPERLINK("https://example.invalid")',priceNote:'税込',sections:[{title:'<script>秘密</script>',items:[{name:'<img onerror="x"> & 甘味',price:550,description:'一行目\n"二行目"'}]}]};
 const {svg}=renderMenuSvg(menu);assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<img'));assert.ok(svg.includes('&lt;img'));assert.ok(!svg.includes('foreignObject'));
 const csv=renderMenuCsv(menu);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\' =HYPERLINK(""https://example.invalid"")"'));assert.ok(csv.includes('"一行目\n""二行目"""'));
 const json=JSON.parse(renderMenuJson({...menu,secret:'GM note'} as typeof menu));assert.ok(!('secret' in json));assert.equal(json.sections[0].items[0].price,550);
});
