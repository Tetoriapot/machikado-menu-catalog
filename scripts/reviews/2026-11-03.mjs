// November review: edits are staged in memory and validated before any catalog write.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { auditCatalog } from '../audit-catalog.ts';
const date='2026-11-03', ledgerPath=`docs/reviews/${date}.json`;
assert.ok(!fs.existsSync(ledgerPath),'Review already applied; do not replace its ledger.');
const baselineCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=fs.readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).sort();
const docs=files.map(file=>({file,data:JSON.parse(fs.readFileSync(`src/data/shops/${file}`,'utf8'))}));
const shops=docs.flatMap(d=>d.data.shops), original=structuredClone(shops);
const drafts=JSON.parse(fs.readFileSync('scripts/era-shop-drafts.json','utf8'));
const items=s=>s.menuSections.flatMap(x=>x.items);
const reasons=new Map(), additions=[], checks=[];
const hash=ids=>createHash('sha256').update([...ids].sort((a,b)=>a<b?-1:a>b?1:0).join('\n')).digest('hex');
const select=(era,category)=>shops.filter(s=>s.era===era&&s.category===category);
const record=(id,reason,sources=[],basis='editorial-estimate')=>reasons.set(id,{reason,sources,basis});
function edit(s,item,patch,reason,sources=[],basis='editorial-estimate') {
 assert.ok(item,`${s.id}: item missing`);const oldName=item.name;
 Object.assign(item,patch);record(item.id,reason,sources,basis);
 const draft=drafts.find(d=>d.era===s.era&&d.category===s.category);
 if(draft){const update=text=>text.split('\n').map(line=>{
  const [name,price,kind,description]=line.split('|');if(name!==oldName)return line;
  const nextKind=patch.recommendationGroup==='main'?'food':['side','dessert'].includes(patch.recommendationGroup)?patch.recommendationGroup:patch.kind??kind;
  return [patch.name??name,patch.price??price,nextKind,patch.description??description].join('|');
 }).join('\n');draft.common=update(draft.common);draft.specials=draft.specials.map(update);}
}
function group(era,category,changes,reason,sources=[],basis='editorial-estimate') {
 for(const [name,value] of Object.entries(changes)){let found=0;
  for(const s of select(era,category))for(const i of items(s).filter(i=>i.name===name)){edit(s,i,typeof value==='number'?{price:value}:value,reason,sources,basis);found++;}
  assert.ok(found,`Missing ${era}/${category}/${name}`);
 }
}
function add(id,section,name,price,kind,description,reason,sources=[]) {
 const s=shops.find(s=>s.id===id);assert.ok(s);assert.ok(!items(s).some(i=>i.name===name));
 const sequence=additions.filter(a=>a.shopId===id).length+1;
 const item={id:`${id}-review-20261103-${sequence}`,name,price,kind,description,recommendationGroup:kind==='food'?'main':kind};
 s.menuSections[section].items.push(item);
 additions.push({shopId:id,sectionId:s.menuSections[section].id,item,reason,sources,basis:'editorial-estimate'});
}


const source=['bls-445-1926'];
group('america-1920s','general-store',{
 '米 一ポンド':{price:12,description:'米国産の精白米を一ポンド（約454g）量り売り。砕米を混ぜない普通品。'},
 '乾燥豆 一ポンド':{price:10,description:'煮込み用の小粒の白いんげん豆（ネイビービーンズ）。一ポンド（約454g）を量り売り。'},
},'1926年のBLS全国平均は米11.6セント、ネイビービーンズ9.3セント/ポンド。従来の8・5セントを誤記とは断定せず、品種を明示した普通価格帯の架空店として12・10セントへ見直す。地域別の実売価格を再現したものではない。',source,'reference-based-estimate');
const portions={
 '干しぶどう 小袋':'半ポンド（約227g）入り一袋。',
 '乾燥りんご 小袋':'四分の一ポンド（約113g）入り一袋。',
 '乾燥プルーン 小袋':'四分の三ポンド（約340g）入り一袋。',
 'ピーナツバター 小瓶':'正味半ポンド（約227g）の瓶一本。',
 '苺ジャム 小瓶':'正味半ポンド（約227g）の瓶一本。',
 'マーマレード 小瓶':'正味半ポンド（約227g）の瓶一本。',
 'からし粉 小缶':'正味一オンス（約28g）の缶一個。',
 '食卓塩 小袋':'半ポンド（約227g）入り一袋。',
 '糖蜜 小壺':'正味半ポンド（約227g）の壺一個。',
 '酢 小瓶':'半米液量パイント（約237ml）の瓶一本。',
 '紅茶 茶葉小袋':'四分の一ポンド（約113g）入り一袋。',
 '珈琲豆 小袋':'半ポンド（約227g）入り一袋。',
 'ココア 小缶':'正味四分の一ポンド（約113g）の缶一個。',
 '缶入りクラッカー':'正味半ポンド（約227g）の缶一個。',
 'トマトの缶詰':'正味一ポンド四オンス（約567g）のNo.2缶一個。',
 '桃の瓶詰め':'果肉とシロップを合わせた正味一ポンド（約454g）の瓶一本。',
};
for(const s of select('america-1920s','general-store')) {
 for(const i of items(s)) if(portions[i.name])edit(s,i,{description:i.description+' '+portions[i.name]},'販売単位を明確にするため、架空店の包装仕様を定義。トマトのNo.2缶はBLSの規格を参考にした。他の小包装を当時の標準規格とはしない。価格は据え置く。',i.name==='トマトの缶詰'?source:[],'quantity-clarification');
 const observed=items(s).filter(i=>['小麦粉 一ポンド','コーンミール 一ポンド','珈琲豆 小袋','紅茶 茶葉小袋','干しぶどう 小袋','乾燥プルーン 小袋','トマトの缶詰'].includes(i.name));
 checks.push({shopId:s.id,itemIds:observed.map(i=>i.id),decision:'price-retained',sources:source,reason:'1926年全国平均の単位を揃えて比較。小麦粉6.0・コーンミール5.1・珈琲51.0・茶76.7・干しぶどう14.7・プルーン17.0セント/ポンド、トマト12.1セント/No.2缶。小包装や店舗差を踏まえて既存価格を維持。燕麦の粒は圧扁燕麦の統計とは同一商品ではないため価格比較から除外。'});
 s.priceNote+=' 包装品は説明の正味量で一品。容器代を含みます。ポンド・オンスは重量、米液量パイントは容量で、半米液量パイントは約237mlです。';record(s.id,'正味量・容器代と米国の液量単位を明記。英国の半パイント約284mlとは区別する。');
}
for(const era of ['victorian','america-1920s']) for(const s of select(era,'confectionery')) {
 for(const i of items(s))if(/レモンドロップ 小袋|ペパーミント飴 小袋|マシュマロの小袋/.test(i.name))edit(s,i,{description:i.description+' 正味二オンス（約57g）入り一袋。'},'小袋の正味量を創作上の仕様として定義。設定年の小売広告との直接照合は未完了のため価格は据え置く。',[],'quantity-clarification');
}
for(const s of select('victorian','stationery')) {
 for(const i of items(s))if(['黒インク 小瓶','赤インク 小瓶','糊の小瓶'].includes(i.name))edit(s,i,{description:i.description+' 内容量は二英液量オンス（約57ml）、瓶一本。容器代を含む。'},'重量のオンスと区別して液量を定義。1890年のメーカー包装・小売価格を確認したものではなく、既存価格を維持する。',[],'quantity-clarification');
}
for(const s of select('america-1920s','cinema')) {
 const i=items(s).find(i=>i.name==='ピーナツの小袋');edit(s,i,{description:'殻をむいたピーナツを正味二オンス（約57g）詰めた一袋。'},'売店の一袋を定義。1926年の映画館売店の直接価格は未確認で、価格を維持する。',[],'quantity-clarification');
}
group('america-1920s','delicatessen',{
 'ポテトサラダ 小箱':{description:'じゃがいもを和えた惣菜。正味四オンス（約113g）の持ち帰り用小箱一個。'},
 'コールスロー 小箱':{description:'刻みキャベツの惣菜。正味四オンス（約113g）の持ち帰り用小箱一個。'},
 '豆の煮込み 小箱':{description:'柔らかく煮た豆と煮汁を合わせて正味六オンス（約170g）。持ち帰り用小箱一個。'},
 '冷製ハム 小包み':{description:'調理済みの冷たいハムを四分の一ポンド（約113g）切り分け、紙で包む。'},
},'自動候補に含まれない小箱・小包みも数量を定義。調理済み惣菜を生鮮食品の統計と同一視せず、当時のデリカテッセン価格は未確認として据え置く。',[],'quantity-clarification');
const fresh=[
 ['general-store-america-1920s-1',1,'白砂糖 一ポンド',7,'goods','菓子や保存食に使うグラニュー糖。約454gを量り、紙袋に入れる。','BLSの1926年平均6.9セント/ポンドを参考に7セントの架空品を追加。',source],
 ['general-store-america-1920s-1',0,'乾燥マカロニ 半ポンド',11,'goods','乾燥した短い管状のパスタ。正味八オンス（約227g）入り一袋。','BLSは7〜16オンス包装をポンド換算し、1926年平均20.2セント。半ポンド換算10.1セントを参考に小袋11セントとした。',source],
 ['general-store-america-1920s-2',1,'無糖の濃縮乳 十六オンス缶',12,'goods','砂糖を加えず水分を減らした牛乳。正味十六重量オンス（約454g）の缶一個。','BLSの無糖濃縮乳15〜16オンス缶11.5セントを参考に12セント。液量オンスや加糖練乳と区別する。',source],
 ['general-store-america-1920s-2',0,'煮豆のNo.2缶',12,'goods','煮た白いんげん豆とソースを合わせた正味一ポンド四オンス（約567g）の缶一個。','BLSのbaked beans、No.2缶の規格と1926年平均11.9セントを参考に12セントの保存食を追加。',source],
 ['general-store-america-1920s-3',0,'朝食用コーンフレーク 八オンス箱',11,'goods','とうもろこしの薄片を焼いた朝食用食品。正味八オンス（約227g）の箱一個。牛乳は別売り。','BLSの8オンス箱10.9セントを参考に11セント。ポンド当たりの値として扱わない。',source],
 ['general-store-america-1920s-3',2,'購入した珈琲豆の挽き分け',0,'service','この店で購入した珈琲豆を一袋ごとに、粗挽きか細挽きにする。豆の代金は別、挽く作業の追加料金は不要。','豆の販売と作業料金を分けた架空店のサービス。当時の無料サービスの実例を確認したものではない。',[]],
];
for(const row of fresh)add(...row);
const audit=auditCatalog(shops);assert.deepEqual(audit.errors,[]);
const added=new Set(additions.map(a=>a.item.id));
assert.equal(hash(original.map(s=>s.id)),hash(shops.map(s=>s.id)));
assert.equal(hash(original.flatMap(items).map(i=>i.id)),hash(shops.flatMap(items).filter(i=>!added.has(i.id)).map(i=>i.id)));
const changes=[],shopChanges=[];
for(const s of shops){const before=original.find(o=>o.id===s.id);
 for(const i of items(s).filter(i=>!added.has(i.id))){const old=items(before).find(o=>o.id===i.id);const fields=Object.keys(i).filter(k=>JSON.stringify(i[k])!==JSON.stringify(old[k]));
  if(fields.length)changes.push({shopId:s.id,itemId:i.id,before:Object.fromEntries(fields.map(k=>[k,old[k]??null])),after:Object.fromEntries(fields.map(k=>[k,i[k]])),...reasons.get(i.id)});
 }
 const fields=Object.keys(s).filter(k=>k!=='menuSections'&&JSON.stringify(s[k])!==JSON.stringify(before[k]));
 if(fields.length)shopChanges.push({shopId:s.id,before:Object.fromEntries(fields.map(k=>[k,before[k]??null])),after:Object.fromEntries(fields.map(k=>[k,s[k]])),...reasons.get(s.id)});
}
const counts=list=>({shops:list.length,items:list.flatMap(items).length});
const sourceHash=filename=>createHash('sha256').update(fs.readFileSync(`tmp/pdfs/${filename}`)).digest('hex');

const sources=[{id:'bls-445-1926',title:'U.S. Bureau of Labor Statistics, Retail Prices 1890 to 1926, Bulletin 445',url:'https://fraser.stlouisfed.org/docs/publications/bls/bls_0445_1927.pdf',catalogUrl:'https://fraser.stlouisfed.org/title/retail-prices-161/retail-prices-1890-1926-5367',accessed:date,published:'1927-08',period:'1926',pages:[5,30,31,32,33,34,52,53,59,60,61],printedPages:[1,26,27,28,29,30,48,49,55,56,57],sha256:sourceHash('bls-445-1927.pdf'),type:'primary-statistics',observed:'各月15日の実売価格を約1,800店舗から調査。表10〜12の1926年全国年平均を原表画像で確認。単位はセント。小麦粉6.0、コーンミール5.1、米11.6、ネイビービーンズ9.3、砂糖6.9、珈琲51.0、茶76.7、プルーン17.0、干しぶどう14.7、マカロニ20.2は各1ポンド。無糖濃縮乳11.5/15〜16オンス缶、コーンフレーク10.9/8オンス箱、煮豆11.9/No.2缶、トマト12.1/No.2缶。No.2缶は1ポンド4オンス。',limits:'全国の都市小売統計。架空の中西部集落・町の実売価格や調理済みデリ・映画館売店の料金ではない。1927年公表だが比較した行は1926年。小袋の架空仕様・整数への丸めを史料記載値と区別する。'}];
const ledger={date,baselineCommit,before:counts(original),after:counts(shops),baselineItemIdsSha256:hash(original.flatMap(items).map(i=>i.id)),baselineShopIdsSha256:hash(original.map(s=>s.id)),summary:{editedItems:changes.length,priceChanges:changes.filter(c=>'price'in c.after).length,addedItems:additions.length,editedShops:new Set([...changes,...shopChanges,...additions].map(c=>c.shopId)).size},byEra:audit.eras,sources,checks,sourceRegister:'docs/catalog-review.md',scope:'全件構造走査。米国雑貨店の一部食料を1926年の一次統計と照合。残り60件の小包装候補と、雑貨店の缶・瓶3件、デリの小箱・小包み12件は数量を定義。菓子・文具・映画館・デリの価格史料照合は未完了。現代・平成・昭和の価格は今回再照合していない。',remainingCandidates:audit.candidates,unverified:[{groups:['victorian/confectionery','victorian/stationery','america-1920s/confectionery','america-1920s/cinema','america-1920s/delicatessen'],reason:'設定年の数量付き小売価格を直接確認できていない。英国菓子店の1909年資料は1890年に転用しない。1890年のClarke, Nickolls & Coombs価格表は所在の候補のみで原本未閲覧。'},{groups:['america-1920s/general-store'],reason:'ジャム、からし粉、糖蜜、酢、ココア、ピーナツバター等の同年同量価格は未照合。燕麦の粒と圧扁燕麦を混同しない。'}],nextTargets:['現代の通常卵・肉・昼食：未照合の店種から同数量・品質の公式資料を確認','昭和の飲食店：1968年のメニュー・広告、ビールの一次統計','1890年の菓子・文具と1926年のデリ・映画館：数量付き価格の一次資料','直近確認の現代米・牛乳・おにぎりの改定、次に古い部分照合から再確認'],changes,shopChanges,additions};
for(const d of docs)if(d.data.shops.some(s=>JSON.stringify(s)!==JSON.stringify(original.find(o=>o.id===s.id))))fs.writeFileSync('src/data/shops/'+d.file,JSON.stringify(d.data,null,2)+'\n');
fs.writeFileSync('scripts/era-shop-drafts.json',JSON.stringify(drafts,null,2)+'\n');
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({summary:ledger.summary,after:ledger.after,byEra:ledger.byEra,remainingCandidates:audit.candidates.length},null,2));
