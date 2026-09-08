import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
import type { Shop,ItemKind,MenuItem } from '../src/data/types.ts';
const retailCategories=['supermarket','drugstore','convenience-store','hundred-yen','bookstore','used-books','stationery','florist','general-store','hardware','toy-store'];
function kindOf(shop:Shop,sectionIndex:number,item:MenuItem):ItemKind{
 const name=item.name;
 if(/席料|ドリンク券|クローク/.test(name))return 'fee';
 if((shop.category==='karaoke'||shop.category==='net-cafe')&&sectionIndex===0)return 'fee';
 if(/大盛り|麺大盛|追加|増量|変更/.test(name))return 'addon';
 if(/シャワー|印刷|スキャナー利用/.test(name))return 'service';
 if(/ドリンクバー/.test(name))return 'service';
 if(shop.category==='ramen'&&['味付け卵','海苔 三枚','味玉 二個','辛味香味油'].includes(name))return 'addon';
 if(retailCategories.includes(shop.category)&&!['supermarket','drugstore','convenience-store'].includes(shop.category))return 'goods';
 if((['convenience-store','supermarket'].includes(shop.category)&&sectionIndex===2&&!/茶|ジュース|炭酸|水|氷/.test(name))||(shop.category==='drugstore'&&sectionIndex<2)||(shop.category==='hospital'&&sectionIndex>0)||(shop.category==='hotel'&&sectionIndex===2)||(shop.category==='aquarium'&&sectionIndex===0))return 'goods';
 if(/パンフレット|ポストカード|ファイル|ノート|缶バッジ|バッグ|ステッカー|耳栓|歯磨|タオル|室内履き|筆記具|道路地図|保冷袋|茶葉|小袋の焙じ茶|ドリップコーヒー 二袋|保冷用氷/.test(name))return 'goods';
 if(shop.category==='ice-cream'&&sectionIndex===0)return 'food';
 if(/プリン|ゼリー|アイス(?!コーヒー|ティー|ラテ)|シャーベット|ソフト$|サンデー|パフェ|ケーキ|菓子|クッキー|饅頭|キャンディ|パン|コロッケ|ゼリー飲料/.test(name))return 'food';
 if(/ティー|ホットレモン|レモンジンジャー|茶ミルク/.test(name)||/^(ドリンク|飲みもの)$/.test(shop.menuSections[sectionIndex].title))return 'drink';
 if(/コーヒー|珈琲|ラテ|カフェオレ|カフェラテ|茶$|茶 |紅茶|麦茶|牛乳|ジュース|ラムネ|コーラ|ソーダ|スカッシュ|エール|レモネード|ラッシー|チャイ|ココア|シェイク|シードル|サワー|ビール|焼酎|日本酒|純米酒|梅酒|ワイン|ハイボール|カクテル|ジンフィズ|ジントニック|ウイスキー|シングルモルト|ブランデー|ラム$|ウォッカ|カシス|モスコミュール|オールドファッションド|炭酸|ウォーター|天然水|水 500|甘酒|フロート|グレープ|ノンアルコール|ドリンク/.test(name))return 'drink';
 return 'food';
}
for(const file of readdirSync('src/data/shops').filter(f=>f.endsWith('.json'))){
 const path=`src/data/shops/${file}`,data=JSON.parse(readFileSync(path,'utf8')) as {shops:Shop[]};
 for(const shop of data.shops){
  shop.menuSections.forEach((s,n)=>s.items.forEach(item=>{item.kind=kindOf(shop,n,item);item.recommendationGroup=item.kind==='drink'?'drink':item.kind==='goods'?'goods':item.kind==='food'?(/プリン|ケーキ|アイス|ゼリー|パフェ|寒天|菓子|タルト|団子|甘味/.test(item.name)?'dessert':n===0?'main':'side'):undefined;if(['fee','addon','service'].includes(item.kind))item.recommended=false;}));
  const charges=shop.menuSections.flatMap(s=>s.items).filter(i=>i.kind==='fee');
  if(shop.category==='bar')shop.priceNote=`税込価格。席料は別途、1人${charges.find(i=>i.name.includes('席料'))?.price??500}円です。`;
  if(shop.category==='karaoke')shop.priceNote='税込価格。室料は1人あたり。ドリンク・料理は別料金です。パックの時間条件は各項目をご確認ください。';
  if(shop.category==='net-cafe')shop.priceNote='税込価格。利用料は1人あたり。延長・設備利用は選択したプランと別料金です。';
  if(shop.category==='live-house')shop.priceNote='税込価格。入場料は公演ごとに別途設定。入場時ドリンク券は1人1枚必要です。';
 }
 writeFileSync(path,JSON.stringify(data,null,2)+'\n');
}
console.log('Explicit item kinds and price notes added to all category files.');
