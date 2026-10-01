// October review: edits are staged in memory and validated before any catalog write.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { auditCatalog } from '../audit-catalog.ts';
const date='2026-10-01', ledgerPath=`docs/reviews/${date}.json`;
assert.ok(!fs.existsSync(ledgerPath),'Review already applied; do not replace its ledger.');
const baselineCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=fs.readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).sort();
const docs=files.map(file=>({file,data:JSON.parse(fs.readFileSync(`src/data/shops/${file}`,'utf8'))}));
const shops=docs.flatMap(d=>d.data.shops), original=structuredClone(shops);
const drafts=JSON.parse(fs.readFileSync('scripts/era-shop-drafts.json','utf8'));
const items=s=>s.menuSections.flatMap(x=>x.items);
const reasons=new Map(), additions=[], checks=[];
const hash=ids=>createHash('sha256').update([...ids].sort().join('\n')).digest('hex');
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
 const item={id:`${id}-review-20261001-1`,name,price,kind,description,recommendationGroup:kind==='food'?'main':kind};
 s.menuSections[section].items.push(item);
 additions.push({shopId:id,sectionId:s.menuSections[section].id,item,reason,sources,basis:'editorial-estimate'});
}

// Observed current prices are references, not mandatory prices for fictional shops.
for(const s of select('modern','supermarket')) {
 for(const i of items(s).filter(i=>i.name==='牛乳 1L')) edit(s,i,{price:258,description:'生乳100%の成分無調整牛乳。1L紙パック一個の販売価格。'},'公式PBの1L成分無調整牛乳257.04円を価格水準の参考に、税込258円の架空料金へ見直した。実在品の再現や全国平均ではない。',['topvalu-milk-20261001'],'reference-based-estimate');
 for(const i of items(s).filter(i=>i.name==='卵 十個')) edit(s,i,{description:'サイズ混合の通常飼育卵、十個入り一パック。特別な銘柄や平飼い卵の設定ではない。'},'高付加価値の平飼い卵との誤比較を避けるため仕様を明確化。通常卵の同条件資料は未確認で258円を据え置く。',[],'quantity-clarification');
}
for(const s of select('modern','michi-no-eki')) {
 const i=items(s).find(i=>i.name==='地場米 2kg');
 edit(s,i,{description:'架空の地元産うるち米を精米した2kg袋。小口で仕入れる地域銘柄という設定。'},'9月14〜20日の全国スーパー平均2,934円/5kg、銘柄米平均2,966円/5kgを確認。2kg直売の地域銘柄とは条件が違うため、既存1,380〜1,520円を維持。',['maff-rice-20260925'],'reference-checked-unchanged-price');
 checks.push({shopId:s.id,itemIds:[i.id],decision:'price-retained',sources:['maff-rice-20260925'],scope:'米2kgのみ。全メニューの価格照合ではない。'});
}
for(const s of select('modern','convenience-store')) {
 const checked=items(s).filter(i=>['鮭おにぎり','ツナマヨおにぎり','昆布おにぎり'].includes(i.name));
 if(checked.length)checks.push({shopId:s.id,itemIds:checked.map(i=>i.id),decision:'price-retained',sources:['lawson-riceball-20260929'],reason:'改定後171〜211円の公式価格例を確認。架空店の148〜168円は安価な自店商品として据え置き、一律にチェーン価格へ合わせない。'});
}
for(const c of ['supermarket','michi-no-eki','convenience-store']) for(const s of select('modern',c)) {
 s.priceNote='表示額は税込の架空設定です。商品名・説明に記した数量で一品を数えます。量り売りは記載の重さを一単位とし、セット内訳の単品料金は重ねて加算しません。地域や店の特色による価格差を含みます。';
 record(s.id,'食品・物販の会計単位と税込の設定であることを明示。');
}
group('modern','supermarket',{
 '朝食用ヨーグルト 四個組':{description:'プレーンヨーグルト75gのカップ四個。四個で一組の販売価格。'},
 '小袋の焙じ茶':{description:'普段飲みの焙じ茶葉50g入り一袋。抽出した飲み物ではなく茶葉の販売。'},
},'比較や会計に必要な一組・一袋の内容量を創作上の仕様として明示。価格は据え置く。',[],'quantity-clarification');

// The primary 1968 table is a bread retail benchmark, not a restaurant tariff.
group('showa','bakery',{
 '山型食パン 一斤':{price:60,description:'一斤を約400gとする当店の設定。毎朝焼く山型食パン一個。'},
 'バゲット':{description:'約250gの細長いパン一本。皮を香ばしく焼く。'},
 'バターロール':{price:15,description:'約40gの小さな丸パン一個。バターを練り込んだ生地。'},
 'コッペパン':{price:20,description:'約80gの柔らかなパン一個。具や塗り物は付かない。'},
 'ぶどうパン':{price:30,description:'干しぶどう入りの約100gの丸パン一個。'},
 'ジャムパン':{price:25,description:'いちごジャムを包んだ約80gのパン一個。'},
 '丸いミルクパン':{price:15,description:'牛乳を生地に混ぜた約50gの丸パン一個。'},
 '白あんの丸パン':{price:25,description:'白あんを包んだ約80gのパン一個。'},
 '砂糖揚げパン':{price:25,description:'約80gのコッペパン一個を揚げ、砂糖をまぶす。'},
 '砂糖ねじりパン':{price:20,description:'約60gのねじったパン一個に砂糖をまぶす。'},
 '胚芽入り角食パン':{description:'胚芽を混ぜた角食パン一斤。約400gの一個で販売する。'},
},'昭和43年の鳥取県統計年鑑・表135に普通品食パン134円/kg（年平均）。400gなら53.6円という参考計算と商品間の量の関係から再設定。各菓子パン価格は資料記載値ではなく推定。',['tottori-bread-1968'],'reference-based-estimate');

// Resolve portion inversions; do not call these verified 1968 restaurant prices.
group('showa','udon',{
 'ちくわ天':{price:20,description:'ちくわ半本分を青海苔入りの衣で揚げる。'},
 'さつまいも天':{price:15,description:'輪切りのさつまいも一枚を揚げる。'},
 'かぼちゃ天':{price:20,description:'かぼちゃの厚切り一枚を揚げる。'},
 '野菜かき揚げ':{price:30,description:'玉ねぎと人参の約10cmのかき揚げ一枚。'},
 'ごぼうの細切りかき揚げ':{price:30,description:'細切りごぼうの約10cmのかき揚げ一枚。'},
 '温泉卵':{price:20,description:'麺への追加用の卵一個。小皿で出す。'},
 '鮭胡麻むすび':{price:50,description:'鮭と胡麻を混ぜた約100gのおむすび一個。'},
 '玉ねぎの小かき揚げ':{price:20,description:'玉ねぎの約7cmのかき揚げ一枚。'},
 '蓮根の薄切り天ぷら':{price:25,description:'蓮根の薄切り二枚を薄衣で揚げる。'},
 'いんげんの天ぷら':{price:25,description:'いんげん三本をまとめて揚げる。'},
 '梅胡麻むすび':{price:40,description:'梅と胡麻を合わせた約100gのおむすび一個。'},
 '温かい番茶':{price:20,description:'温かい番茶を湯のみ一杯で出す。'},
},'60円のかけうどんより単品の卵・野菜天が高い無説明の設定を、個数・量を定めて修正。1968年の店内価格の一次資料とは未照合。');
group('showa','soba',{
 '山の根菜かき揚げ 小皿':{price:40,description:'ごぼうと人参の小さなかき揚げ二枚。蕎麦は付かない。'},
 '蕎麦茶の急須':{price:30,description:'約300mlの急須一つと湯のみ二個。二人で分けられる。'},
 'かけそば':{recommendationGroup:'main'},'たぬきそば':{recommendationGroup:'main'},
 '月見そば':{recommendationGroup:'main'},'山菜そば':{recommendationGroup:'main'},'にしんそば':{recommendationGroup:'main'},
},'海老入り天ぷら盛り50円に対して根菜小皿120円という逆転を修正。温かい一人前の蕎麦を主食として分類。価格は店内関係からの推定。');
group('showa','izakaya',{
 '冷奴':{price:40,description:'豆腐約100gに葱と生姜を添える小皿。'},
 'たたききゅうり':{price:40,description:'きゅうり半本を塩とごま油で和える小皿。'},
 'ポテトサラダ':{price:50,description:'じゃがいも約100gの小鉢。ゆで卵を刻んで混ぜる。'},
 '漬物盛り合わせ':{price:50,description:'大根、きゅうり、白菜を合わせて約80g盛る。'},
 '切り干し大根の煮付け':{price:40,description:'甘辛く煮た切り干し大根約60gの小鉢。'},
 '鶏の唐揚げ':{price:100,description:'生姜醤油に漬けた鶏もも肉の唐揚げ四個。'},
 '日本酒 一合':{price:80,description:'店の並酒を一合（約180ml）。冷や・燗を同じ料金で選べる。'},
 '燗酒 二合':{description:'一合80円と同じ並酒を二合（約360ml）、徳利で温めて出す。'},
 '番茶':{price:20,description:'温かい番茶を湯のみ一杯で出す。'},
 '白菜の即席漬け':{price:40,description:'軽く漬けた白菜約60gの小皿。'},
 '胡瓜と味噌の小皿':{price:40,description:'きゅうり半本に少量の味噌を添える。'},
 '生姜の瓶サイダー':{price:40,description:'生姜風味の瓶サイダー約200mlを一本。'},
},'並酒一合150円・二合160円の無説明の料金差と、肉料理より高い少量小鉢の設定を整理。量を明記した架空価格で、店内価格の史料照合済みではない。');

const portions={
 '干しぶどう 小袋':'半ポンド（約227g）入り一袋。',
 '乾燥りんご 小袋':'四分の一ポンド（約113g）入り一袋。',
 '干し杏 小袋':'四分の一ポンド（約113g）入り一袋。',
 '苺ジャム 小瓶':'正味半ポンド（約227g）の瓶一本。',
 'マーマレード 小瓶':'正味半ポンド（約227g）の瓶一本。',
 '黒すぐりジャム':'正味半ポンド（約227g）の瓶一本。',
 'からし粉 小缶':'正味一オンス（約28g）の缶一個。',
 '食卓塩 小袋':'半ポンド（約227g）入り一袋。',
 '糖蜜 小壺':'正味半ポンド（約227g）の壺一個。',
 '酢 小瓶':'半英パイント（約284ml）の瓶一本。',
 '紅茶 茶葉小袋':'四分の一ポンド（約113g）入り一袋。',
 '珈琲豆 小袋':'半ポンド（約227g）入り一袋。',
 '濃い焙煎の珈琲袋':'半ポンド（約227g）入り一袋。',
 'ココア 小缶':'正味四分の一ポンド（約113g）の缶一個。',
 '玉ねぎの酢漬け瓶':'正味半ポンド（約227g）の瓶一本。',
 'にしんの塩漬け':'小ぶりなにしん二尾で一組。',
};
for(const s of select('victorian','grocer')) {
 for(const i of items(s)) if(portions[i.name])edit(s,i,{description:i.description+' '+portions[i.name]},'小袋・小瓶などの分量を卓用の商品仕様として定義。1890年の実包装規格を史料で確認したものではなく、価格は据え置き。',[],'quantity-clarification');
 s.priceNote+=' 小袋・瓶詰めは説明の正味量で一品。容器代を含みます。ポンド・オンスは重量、英パイントは容量です。';record(s.id,'内容量・容器代・重量と容量の区別を明示。');
}

const fresh=[
 ['supermarket-1',1,'家計用ブレンド米 5kg',2880,'goods','国産うるち米を混ぜた精米5kg一袋。銘柄指定のない普段炊き用。','全国スーパーのブレンド米平均2,783円/5kgを参考に、銘柄指定なしの架空米を追加。',['maff-rice-20260925']],
 ['supermarket-2',0,'まる葉の近郊うるち米 2kg',1480,'goods','近郊の架空産地から仕入れる精米2kg一袋。品種は入荷ごとに札で知らせる。','小口の地域米を追加。POS平均とは袋サイズ・産地条件が違うため同額換算しない。',['maff-rice-20260925']],
 ['supermarket-3',1,'一人暮らしの無洗米 1kg',780,'goods','洗わず炊ける加工済みの米1kg一袋。小分けで使い切りやすい。','少量袋と無洗米加工の価格差を含む架空設定。',['maff-rice-20260925']],
 ['michi-no-eki-1',0,'食べ比べの地場米 二合袋',260,'goods','精米300g入り一袋。家庭で味を試すための少量包装。','既存2kg米より割高な小分け単価を明示した追加商品。',['maff-rice-20260925']],
 ['michi-no-eki-2',0,'乾燥根菜の味噌汁具 30g',380,'goods','切り干し大根と人参の乾燥具材。一袋30g、だしと味噌は含まない。','料理用の少量保存食品を追加。価格は既存の乾物・野菜品揃えからの推定。',[]],
 ['michi-no-eki-3',2,'山里くるみの殻付き袋 200g',680,'goods','殻付きくるみ200gを一袋に。殻の重量を含み、割る道具は別。','土産の正味量との混同を防ぐ殻付き重量の商品を追加。',[]],
 ['convenience-store-1',0,'小ぶりな塩むすび 二個',198,'food','ご飯約70gずつの塩むすび二個入り。海苔や具は付かない。','具なし・小型二個という仕様で、通常の具入りおにぎりと比較できる軽食を追加。',[]],
 ['convenience-store-2',0,'ひじきと枝豆のおむすび',178,'food','約100gのご飯にひじきと枝豆を混ぜた一個。海苔は巻かない。','具材と一個の量を示す、店独自の持ち歩き用軽食を追加。',[]],
 ['convenience-store-3',1,'あたため白がゆ 250g',168,'food','一食250gの密封パウチ。塩味を控えた白がゆで、漬物は別。','温めて食べられる少量の主食を追加。価格は架空の小売設定。',[]],
 ['bakery-showa-1',0,'朝の小さな丸パン 四個袋',40,'food','一個約30gの丸パンを四個。具や塗り物は入れない。','食事パンの小分けを追加。年鑑の食パン単価は参考に留める。',['tottori-bread-1968']],
 ['bakery-showa-2',1,'胡瓜と卵の半分サンド',25,'food','薄切りパン二枚で作った小型サンドを二切れに。半人前ほどの量。','一人前の卵サンド35円に対して分量の少ない品を追加。',[]],
 ['bakery-showa-3',2,'黒糖ねじりの小さなパン',20,'food','約50gのねじったパン一個に黒糖をまぶす。','製パン所の少量のおやつを追加。価格は店内商品の量から推定。',[]],
 ['grocer-victorian-1',1,'白砂糖 一ポンド',3,'goods','茶や菓子作り用の白砂糖。約454gを量り、紙袋に入れる。','家庭料理向けの基本材料を追加。1890年の個別実売価格は未確認の創作設定。',[]],
 ['grocer-victorian-2',0,'玉ねぎ 一ポンド',1,'goods','皮付きの玉ねぎを合わせて約454g。煮込み用に大きさの違うものを混ぜる。','村の食料品店に生鮮の煮込み材料を追加。価格は創作設定。',[]],
 ['grocer-victorian-3',0,'乾燥レンズ豆 一ポンド',3,'goods','約454gの乾燥豆を紙袋へ。旅先でも鍋で煮られる食料。','港の店に別種の乾燥豆を追加。個別の当時価格は未確認の創作設定。',[]],
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
const sources=[
 {id:'maff-rice-20260925',title:'農林水産省 KSP-POS全国週次米価格',url:'https://www.maff.go.jp/j/nousan/kokumotu/ksppos.pdf',accessed:date,published:'2026-09-25',period:'2026-09-14/2026-09-20',pages:[1,2],sha256:sourceHash('rice-20260925.pdf'),type:'primary-statistics',observed:'全国約1,000スーパー、税込5kg換算。全体2,934円、銘柄米2,966円、ブレンド米等2,783円。両ページを画像で確認。',limits:'資料URLは更新される。直売所や少量袋の実売価格ではない。'},
 {id:'topvalu-milk-20261001',title:'TOPVALU 成分無調整牛乳',url:'https://www.topvalu.net/items/detail/4549414708639/',accessed:date,type:'official-product-page',observed:'1000ml・本体238円・税込257.04円の標準小売価格。',limits:'適用開始日はページで確認できない。実売価格は店舗により異なる。'},
 {id:'lawson-riceball-20260929',title:'ローソン おにぎりの価格改定でお米の消費拡大',url:'https://www.lawson.co.jp/company/news/detail/1531424_2504.html',accessed:date,published:'2026-08-24',effective:'2026-09-29',type:'official-price-announcement',observed:'改定後税込ツナマヨ171円、昆布184円、紅鮭211円。旧価格が残る個別商品ページより適用日付き告知を優先。',limits:'架空の独立店と同一仕様・同一コストではない。'},
 {id:'tottori-bread-1968',title:'鳥取県 昭和43年統計年鑑 第18章物価 表135',url:'https://www.pref.tottori.lg.jp/secure/634607/b1968s43_18_butu.pdf',accessed:date,period:'1968',pages:[3,4],printedPages:[186,187],sha256:sourceHash('tottori-1968.pdf'),type:'primary-statistics',observed:'普通品の食パン、1kg、昭和43年平均134.00円。表の単位と脚注を画像で確認。',limits:'地方の小売統計であり全国や飲食店の料金表ではない。400g=53.6円は比例計算。菓子パン・麺店・居酒屋の個別価格は確認できない。ビール価格はこの7ページには未収録。'},
];
const ledger={date,baselineCommit,before:counts(original),after:counts(shops),baselineItemIdsSha256:hash(original.flatMap(items).map(i=>i.id)),baselineShopIdsSha256:hash(original.map(s=>s.id)),summary:{editedItems:changes.length,priceChanges:changes.filter(c=>'price'in c.after).length,addedItems:additions.length,editedShops:new Set([...changes,...shopChanges,...additions].map(c=>c.shopId)).size},byEra:audit.eras,sources,checks,sourceRegister:'docs/catalog-review.md',scope:'全件構造走査。現代の米・牛乳・一部おにぎりと1968年普通食パンを資料照合。昭和の分量修正と英国の量り売り仕様は編集上の設定であり、全価格を考証済みとはしない。',remainingCandidates:audit.candidates,changes,shopChanges,additions};
for(const d of docs)if(d.data.shops.some(s=>JSON.stringify(s)!==JSON.stringify(original.find(o=>o.id===s.id))))fs.writeFileSync(`src/data/shops/${d.file}`,JSON.stringify(d.data,null,2)+'\n');
fs.writeFileSync('scripts/era-shop-drafts.json',JSON.stringify(drafts,null,2)+'\n');
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({summary:ledger.summary,after:ledger.after,byEra:ledger.byEra,remainingCandidates:audit.candidates.length},null,2));
