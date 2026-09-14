// One-time editorial migration. The ledger preserves every changed field and source.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const date = '2026-09-14';
const ledgerPath = `docs/reviews/${date}.json`;
assert.ok(!fs.existsSync(ledgerPath), 'This review has already been applied. Do not overwrite its ledger.');
const files = fs.readdirSync('src/data/shops').filter(f => f.endsWith('.json')).sort();
const docs = files.map(file => ({ file, data: JSON.parse(fs.readFileSync(`src/data/shops/${file}`, 'utf8')) }));
const shops = docs.flatMap(d => d.data.shops);
const original = structuredClone(shops);
const drafts = JSON.parse(fs.readFileSync('scripts/era-shop-drafts.json', 'utf8'));
const reasons = new Map();
const additions = [];
const items = shop => shop.menuSections.flatMap(s => s.items);
const hash = ids => createHash('sha256').update([...ids].sort().join('\n')).digest('hex');
const note = (id, reason, sources = []) => reasons.set(id, { reason, sources });
const selected = (era, category) => shops.filter(s => s.era === era && s.category === category);
function edit(shop, item, patch, reason, sources = []) {
  const oldName = item.name;
  Object.assign(item, patch);
  note(item.id, reason, sources);
  // Keep the historical seed's original 21 items in agreement with the catalog.
  const draft = drafts.find(d => d.era === shop.era && d.category === shop.category);
  if (draft) {
    const update = text => text.split('\n').map(line => {
      const [name, price, kind, description] = line.split('|');
      if (name !== oldName) return line;
      const nextKind = patch.kind ?? kind;
      const draftKind = ['side', 'dessert'].includes(patch.recommendationGroup) ? patch.recommendationGroup : patch.recommendationGroup === 'main' ? 'food' : nextKind;
      return [patch.name ?? name, patch.price ?? price, draftKind, patch.description ?? description].join('|');
    }).join('\n');
    draft.common = update(draft.common);
    draft.specials = draft.specials.map(update);
  }
}
function group(era, category, changes, reason, sources = []) {
  for (const [name, patch] of Object.entries(changes)) {
    let found = 0;
    for (const shop of selected(era, category)) for (const item of items(shop).filter(i => i.name === name)) {
      edit(shop, item, typeof patch === 'number' ? { price: patch } : patch, reason, sources); found++;
    }
    assert.ok(found > 0, `Missing item: ${era}/${category}/${name}`);
  }
}
function shopEdit(shop, patch, reason, sources = []) { Object.assign(shop, patch); note(shop.id, reason, sources); }
function add(shop, section, name, price, kind, description, reason) {
  const item = { id: `${shop.id}-review-20260914-1`, name, price, kind, description };
  if (['food', 'drink', 'goods'].includes(kind)) item.recommendationGroup = kind === 'food' ? 'main' : kind;
  shop.menuSections[section].items.push(item);
  additions.push({ shopId: shop.id, sectionId: shop.menuSections[section].id, item, reason, basis: 'editorial-estimate' });
}

group('heisei', 'music-store', {
  '小ぶりなフォークギター': 19800, 'ショートスケールベース': 29800,
  '入門用ソプラノウクレレ': 6800, '小型鍵盤ハーモニカ': 3980, '木製タンバリン': 1200,
  '革端のギターストラップ': 1800, 'ギターピック 三枚': 300,
  '架空曲集『路地の六弦』': 1200, '五線ノート': 200, '楽器用クロス': 500,
  '練習用クラシックギター': 19800, '小型電子キーボード': 12800, '中古アコースティックギター': 6800,
}, '入門楽器が500円台、タンバリンが29,800円という品種間の逆転を修正。同時期のメーカー資料を桁の参考とし、無銘の架空入門品・中古品として推定。実在モデルの価格を転記していない。', ['yamaha-1998']);

group('heisei', 'convenience-store', {
  'のり弁当': 350, 'レジ横チキン': 150, '昆布おにぎり': 100, '小さな牛乳 200ml': 100,
  'ポテトコロッケパン': 150, '紙パックりんご飲料': { price: 100, description: '200ml入りの紙パック。冷たいりんごの果汁飲料。' },
}, '同店の100〜120円のおにぎりと単品量を基準に、昆布450円・弁当180円等の逆転を是正。1998年の特定店の実売価格ではなく編集上の推定。');
group('heisei', 'family-restaurant', {
  'きのこ和風パスタ': { price: 620, recommendationGroup: 'main' },
  'マルゲリータ': { price: 680, recommendationGroup: 'main', description: '一人用の約20cmピザ。トマト、チーズ、バジルをのせて焼く。' },
  'フライドポテト': 250, 'お子さまプレート': { price: 480, recommendationGroup: 'main' },
  '家族で分ける前菜プレート': { price: 680, description: '二〜三人で分ける盛り合わせ。小さな揚げ物、ハム、温野菜を一皿に。' },
  'チョコブラウニー': { recommendationGroup: 'dessert' },
}, '一人前の主食や家族用の盛り合わせがポテト単品より安い無説明の逆転を修正。分量とおすすめ分類を明示した架空料金。');
group('heisei', 'bookstore', {
  '単行本『夜明けの書架』': 1500, '短編集『窓辺の手紙』': { price: 1200, description: '手紙をめぐる架空の短編集。四六判の単行本。' },
  '文庫ミステリー『七番街の鍵』': 580, '文庫小説『街灯の帰り道』': 620,
}, '通常の文庫と単行本の価格帯の取り違えを編集上の推定で修正。限定版・大型本という設定はない。');
group('heisei', 'kissaten', { '厚切りバタートースト': 300 }, '単品トースト650円が飲み物付き480円のモーニングより高い設定を修正。単品量に基づく架空価格。');
group('showa', 'kissaten', { '厚切りバタートースト': 60, '珈琲ゼリー': 80 }, '軽食と甘味の分量に対して突出した価格を同店の価格関係から調整。1968年の架空価格。');
group('heisei', 'ramen', {
  '半チャーハン': 250, 'ライス': 150, '海苔 三枚': 50, '瓶ビール': 450,
  'なると追加 三枚': 50, 'ゆで卵 一個': 100, '冷たい麦茶': 100,
}, '半量ご飯・具材追加・飲み物の分量と同店の麺価格の整合を修正。瓶ビールは店内提供の中瓶として推定。');
group('heisei', 'bento', { '小盛り白飯への変更': { price: 0, description: '弁当の白飯を小盛りに変更。追加料金なし、弁当本体の値引きはありません。' } }, '減量変更の条件を明記し、根拠のない追加230円を廃止。');
group('heisei', 'net-cafe', {
  '二人の交代利用 九十分': { price: 800, description: '端末一台を二人が交代で使う合計九十分の料金。二人分を含み、同時利用はできません。入店時に選択。' },
  '文書作成 二時間': { price: 900, description: '一人・端末一台の文書作成二時間パック。入店時に選択。通常一時間500円の二回分より100円引き。' },
  '調べもの端末 二時間': { price: 1000, description: '一人・端末一台の通信利用二時間パック。入店時に選択。通常一時間550円の二回分より100円引き。' },
  'カラー印刷 一枚': { price: 100, description: 'A4片面一枚。文書や画像をカラー印刷。端末利用料は別。' },
  '白黒印刷 一枚': { description: 'A4片面一枚の白黒印刷。端末利用料は別。' },
}, '同じ設備の長時間パックが通常の積算より大幅に高い矛盾を修正。人数・時間・印刷サイズ・別料金を明記。');

group('showa', 'teishoku', {
  'ひじき煮': 30, '冷奴': 40, '納豆': 30, 'ご飯大盛り': 20, '味噌汁単品': 20,
  'ほうれん草のおひたし': 40, '麦茶': 20, '食後のコーヒー': 50, '瓶入り牛乳': 30,
}, '150〜250円の定食に対して小鉢・汁単品が過大になる関係を修正。分量と食後条件に基づく1968年の架空料金。');
group('showa', 'ramen', {
  '半チャーハン': 50, 'ライス': 30, '海苔 三枚': 10, 'なると追加 三枚': 10,
  'ゆで卵 一個': 20, '冷たい麦茶': 20,
}, '麺や半量焼き飯に対して具材・飲料が突出する不整合を編集上の推定で修正。');
for (const c of ['teishoku', 'ramen', 'chinese']) group('showa', c, { '瓶ビール': 180 }, '1968年の大瓶小売126円という統計の二次集計を補助線に、店内中瓶40〜80円の設定を見直した推定値。一次統計の原表・地域別の店内提供価格は未照合。', ['beer-1968']);
group('showa', 'chinese', {
  '青菜のにんにく炒め': 80, 'ジャスミン茶': 30, '小さな卵スープ': 40,
  '杏仁豆腐': { recommendationGroup: 'dessert' },
}, '小皿・茶・小椀の価格を同店の主菜との関係から修正し、杏仁豆腐を甘味へ分類。');
group('showa', 'unagi', {
  'うな丼': { price: 350, description: '並のうな重より鰻を少なめにした一人前の丼。吸い物は別。' },
  '小うな重と季節の煮物膳': { price: 500, description: '小さなうな重に煮物、吸い物、漬物を添えた一人前の膳。' },
  '冷酒 一合': 100, '温かい麦茶': 30,
}, '少量のうな丼900円が並うな重450円を上回る矛盾を修正。セットの範囲と飲み物の価格を整理した架空設定。');

for (const shop of shops) {
  for (const item of items(shop)) {
    if (shop.category === 'kissaten' && item.name === 'アメリカン') edit(shop, item, { kind: 'drink', recommendationGroup: 'drink' }, '珈琲を料理として推薦していた分類を修正。');
    if (shop.category === 'michi-no-eki' && ['木の箸', '絵葉書'].includes(item.name)) edit(shop, item, { kind: 'goods', recommendationGroup: 'goods' }, '食べられない販売雑貨を料理から物販へ修正。');
    if (shop.category === 'supermarket' && item.name === 'ミネラルウォーター 2L') edit(shop, item, { kind: 'drink', recommendationGroup: 'drink' }, '飲料水の分類を飲み物に統一。');
    if (shop.category === 'bakery' && ['victorian', 'america-1920s'].includes(shop.era) && item.name.includes('一斤')) {
      const uk = shop.era === 'victorian';
      edit(shop, item, { name: item.name.replace('一斤', uk ? '二ポンド' : '一ポンド'), description: item.description + (uk ? ' 一個の重さは二ポンド（約907g）。' : ' 一個の重さは一ポンド（約454g）。') }, '日本のパンの「斤」と混同する表記を現地の重量へ変更。量は創作上の設定で、近接年の資料は英国パンの販売単位の参考に限定。', uk ? ['bread-hansard'] : []);
    }
    if (shop.era === 'america-1920s' && shop.category === 'delicatessen' && item.name.includes('半斤')) edit(shop, item, { name: item.name.replace('半斤', '半ポンド'), description: item.description + ' 半ポンド（約227g）分を包む。' }, '日本の斤と混同しないよう持ち帰りパンの重量を米国の単位で明記。価格は据え置き。');
  }
}

for (const shop of selected('modern', 'bathhouse')) {
  const cityBath = shop.id === 'bathhouse-1';
  const adult = items(shop).find(i => i.name === '大人入浴 一回');
  const child = items(shop).find(i => i.name === '子ども入浴 一回');
  edit(shop, adult, { ...(cityBath ? { price: 600 } : {}), description: '12歳以上一人一回の基本入浴料。' }, cityBath ? '2026年8月改定の東京銭湯の料金を参考にした架空銭湯の設定。全国共通の料金としては扱わない。' : '当施設独自の架空料金を維持し、対象年齢を明記。', cityBath ? ['tokyo-bath-2026'] : []);
  edit(shop, child, { ...(cityBath ? { price: 200 } : {}), description: '6歳以上12歳未満一人一回の入浴料。' }, '子どもの年齢区分を明記。あさひ湯のみ東京銭湯の料金を参考に修正。', cityBath ? ['tokyo-bath-2026'] : []);
  shopEdit(shop, { priceNote: shop.priceNote + (cityBath ? ' 基本入浴料は2026年8月の東京銭湯の料金を参考にした架空設定。セット・貸出・販売品は当店の設定料金です。' : ' 基本入浴料も当施設独自の架空設定です。') }, '地域・施設ごとの設定を区別。');
  add(shop, 0, '未就学児入浴 一回', 100, 'fee', '6歳未満一人一回。付き添いの大人の入浴料は別。', '未就学児の会計を追加。あさひ湯は東京の年齢区分と料金を参考、他二施設は独自の架空料金。');
}
const cinema = shops.find(s => s.id === 'cinema-2');
edit(cinema, items(cinema).find(i => i.name === 'ポップコーンセット'), { description: 'チーズポップコーンMと、コーラMまたはアイスティーM一杯。' }, '単品にない塩味を指定していたセットを、その店で販売する品に合わせる。');
edit(cinema, items(cinema).find(i => i.name === '友だちスナックセット'), { description: 'ナチョス、チーズポップコーンM、コーラM二杯。二人向けのセット。' }, 'セットの味・サイズ・人数を明示。');

const newItems = [
  ['music-store-heisei-1', 2, '六弦の調弦と手入れ案内 二十分', 500, 'service', 'ギター一台を店員と調弦し、拭き方を教わる。弦交換・修理は別。'],
  ['music-store-heisei-2', 1, 'ヘッドホン変換プラグ 一個', 500, 'goods', 'ミニ端子を標準端子に変える。手持ちの機器との接続を店頭で確認する。'],
  ['music-store-heisei-3', 2, '中古楽器の状態票付き試奏 三十分', 0, 'service', '購入検討時、一台の傷・音の出方・付属品を店員と確かめる。試奏は無料、修理は含まない。'],
  ['net-cafe-heisei-1', 2, '印刷物の中綴じ 十枚まで', 100, 'service', 'A4用紙を二つ折りにし二か所で綴じる。印刷代と端末利用料は別。'],
  ['net-cafe-heisei-2', 2, '和文入力の操作案内 十五分', 300, 'service', '文書用端末で文字入力と保存の手順を教わる。通常の席料金は別。'],
  ['net-cafe-heisei-3', 2, '名刺原稿の白黒印刷 十面一枚', 150, 'service', '作成済みの名刺原稿を厚紙一枚へ印刷。紙代込み、裁断と原稿作成は含まない。'],
  ['teishoku-showa-1', 0, '梅粥と卵焼きの小さな膳', 100, 'food', '茶碗一杯の白粥に梅干し、卵焼き二切れを添える。追加のご飯と汁は別。'],
  ['teishoku-showa-2', 1, '持ち帰り煮豆 一折', 50, 'food', '甘辛い煮豆を約100g、紙の折へ詰める。容器代込みで、箸を一膳添える。'],
  ['teishoku-showa-3', 0, '早番の味噌汁と卵ご飯', 80, 'food', '7〜10時限定。ご飯、生卵一個、豆腐の味噌汁、漬物を一盆で出す。'],
  ['grocer-victorian-1', 1, '粗糖 半ポンド', 2, 'goods', '茶や菓子作りに使う茶色い砂糖。半ポンド（約227g）を量って紙袋へ。'],
  ['grocer-victorian-2', 2, '朝の牛乳 一英パイント', 2, 'drink', '当日届いた牛乳を約568ml量る。持参した清潔な容器に注ぎ、容器代は含まない。'],
  ['grocer-victorian-3', 1, '有塩バター 四分の一ポンド', 4, 'goods', '約113gを量り、油を通しにくい紙で包む。食料を積み込む客にも少量で売る。'],
  ['diner-america-1920s-1', 0, 'りんご入りオートミール 一椀', 15, 'food', '燕麦を煮た粥に刻んだりんごと牛乳を添える。飲み物は別。'],
  ['diner-america-1920s-2', 0, 'バターミルク・パンケーキ 三枚', 20, 'food', '鉄板で焼く小ぶりな三枚。バターと糖蜜シロップ付き、飲み物は別。'],
  ['diner-america-1920s-3', 0, '鱈とじゃがいもの焼き団子 二個', 25, 'food', 'ほぐした塩鱈と芋をまとめて鉄板で焼く。トースト一枚付き。'],
];
for (const [id, section, name, price, kind, description] of newItems) add(shops.find(s => s.id === id), section, name, price, kind, description, '既存の品揃えに不足する少量食・朝食・量り売り・機器周辺品・作業サービスを追加。価格・分量は店舗内の関係を踏まえた創作上の推定。');

for (const shop of selected('heisei', 'net-cafe')) {
  const flavor = shop.id.endsWith('-1') ? '駅前で電車待ちの人がメールの確認や休憩に使う。夜は閉店前に使用時間を確かめる。' : shop.id.endsWith('-3') ? '昼は文書作業の人、夜は長距離移動の休憩客が来る。閉店時刻の22時までに作業を終えるよう案内する。' : shop.scene.localFlavor;
  const description = shop.id.endsWith('-1') ? '1998年の日本の架空都市・若葉市を舞台にした時間制のインターネット喫茶。駅前で電車待ちの人が利用する。' : shop.description;
  shopEdit(shop, { description, scene: { ...shop.scene, localFlavor: flavor }, priceNote: shop.priceNote + ' 利用パックは入店時に選び、含まれる通常利用料は重ねて加算しません。超過は十五分ごとの延長料金。印刷・物販・操作案内は別料金です。' }, '22時閉店と矛盾する終電後・明け方の描写を修正し、パック料金の加算方法を明示。');
}
const breakfastShop = shops.find(s => s.id === 'teishoku-showa-3');
shopEdit(breakfastShop, { openingHours: '7:00〜19:00（朝定食は7:00〜10:00）' }, '早番の朝食という店の設定と11時開店の矛盾を修正。');

const beforeIds = original.flatMap(s => items(s).map(i => i.id));
const addedIds = new Set(additions.map(a => a.item.id));
assert.equal(hash(shops.flatMap(s => items(s).filter(i => !addedIds.has(i.id)).map(i => i.id))), hash(beforeIds));
assert.equal(new Set(shops.flatMap(s => items(s).map(i => i.id))).size, beforeIds.length + additions.length);
const changes = [];
const shopChanges = [];
for (const shop of shops) {
  const old = original.find(s => s.id === shop.id);
  for (const item of items(shop).filter(i => !addedIds.has(i.id))) {
    const prior = items(old).find(i => i.id === item.id);
    const fields = Object.keys(item).filter(k => JSON.stringify(item[k]) !== JSON.stringify(prior[k]));
    if (fields.length) changes.push({ shopId: shop.id, itemId: item.id, before: Object.fromEntries(fields.map(k => [k, prior[k] ?? null])), after: Object.fromEntries(fields.map(k => [k, item[k]])), ...reasons.get(item.id) });
  }
  const fields = Object.keys(shop).filter(k => k !== 'menuSections' && JSON.stringify(shop[k]) !== JSON.stringify(old[k]));
  if (fields.length) shopChanges.push({ shopId: shop.id, before: Object.fromEntries(fields.map(k => [k, old[k] ?? null])), after: Object.fromEntries(fields.map(k => [k, shop[k]])), ...reasons.get(shop.id) });
}
const counts = list => ({ shops: list.length, items: list.reduce((n, s) => n + items(s).length, 0) });
const ledger = {
  date, baselineCommit: '080bccf3148301fa0e6c516f3c3d15fb21623b02', before: counts(original), after: counts(shops),
  baselineItemIdsSha256: hash(beforeIds), baselineShopIdsSha256: hash(original.map(s => s.id)),
  summary: { editedItems: changes.length, priceChanges: changes.filter(c => 'price' in c.after).length, addedItems: additions.length, editedShops: new Set([...changes, ...shopChanges, ...additions].map(c => c.shopId)).size },
  byEra: Object.fromEntries([...new Set(shops.map(s => s.era))].map(era => [era, counts(shops.filter(s => s.era === era))])),
  sourceRegister: 'docs/catalog-review.md',
  scope: '全315店舗の構造を走査。修正対象は価格の明確な内部矛盾・数量・分類・営業時間と一部資料の照合。全商品を市場価格や歴史史料で確認済みとはしない。',
  changes, shopChanges, additions,
};
// Validate all edits before writing any catalog file.
for (const d of docs) if (d.data.shops.some(s => JSON.stringify(s) !== JSON.stringify(original.find(o => o.id === s.id)))) fs.writeFileSync(`src/data/shops/${d.file}`, JSON.stringify(d.data, null, 2) + '\n');
fs.writeFileSync('scripts/era-shop-drafts.json', JSON.stringify(drafts, null, 2) + '\n');
fs.mkdirSync('docs/reviews', { recursive: true });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
console.log(JSON.stringify({ ...ledger.summary, after: ledger.after, byEra: ledger.byEra }, null, 2));
