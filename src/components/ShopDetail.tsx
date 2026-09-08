import { useMemo, useState, useEffect } from 'react';
import { Bookmark, ArrowLeft, Copy, Share2, Maximize, Shuffle, Clock, MapPin, Sparkles, Store, Printer } from 'lucide-react';
import { categories, priceLabels, locationLabels, eraLabels, scaleLabels } from '../data';
import type { Shop } from '../data/types';
import { money, recommendItems, itemText, menuText, gmText } from '../lib/catalog';
import { toMenuDocument } from '../lib/menu-document';
import { menuPlainText, menuTotal } from '../lib/menu-export';
import SessionShopEditor from './SessionShopEditor';
import type { SessionFolder, SessionEntry } from '../lib/library';
import ShareMenuDialog from './ShareMenuDialog';
import MenuExportDialog from './MenuExportDialog';
import { ShopIcon } from './Icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  originalName: string; folder?: SessionFolder; onManage: () => void;
  onSaveEntry: (entry: SessionEntry) => void; onUsed: () => void; onRandom: () => void;
  onNotify: (message: string) => void; focusedItem?: string; shop: Shop; saved: boolean;
  onSave: () => void; onBack: () => void; onCopy: (text: string, label: string) => void;
};
export default function ShopDetail({shop, saved, onSave, onBack, onCopy, focusedItem, onNotify, originalName, folder, onManage, onSaveEntry, onUsed, onRandom}: Props) {
  useEffect(() => {
    if (!focusedItem) return;
    const frame = requestAnimationFrame(() => {const target = document.getElementById(focusedItem); target?.scrollIntoView({block: 'center'}); target?.focus({preventScroll: true});});
    return () => cancelAnimationFrame(frame);
  }, [focusedItem]);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const category = categories.find(c => c.id === shop.category)!;
  const items = useMemo(() => shop.menuSections.flatMap(s => s.items), [shop]);
  const [picks, setPicks] = useState(() => recommendItems(items));
  const selectedMenu = toMenuDocument(shop, {itemIds: selectedIds});
  const notes = folder?.entries.find(e => e.shopId === shop.id)?.notes;
  const gm = `${gmText(shop)}${notes ? `\n\n【この卓のGMメモ】\n${notes}` : ''}`;
  const selectItem = (id: string, checked: boolean) => setSelectedIds(ids => checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
  return <div className="detail-page">
    <button onClick={onBack} className="back-link"><ArrowLeft size={16}/>店舗一覧に戻る</button>
    <div className="detail-masthead"><div>
      <div className="detail-kicker"><ShopIcon name={category.icon}/><span>{category.label}</span><span>CATALOG / {shop.id.replace(/-/g, ' ').toUpperCase()}</span></div>
      <h1>{shop.name}</h1>{originalName !== shop.name && <p className="original-shop-name">元の店舗：{originalName}</p>}
      <div className="tags">{shop.tags.map(t => <span key={t}>{t}</span>)}<span>{eraLabels[shop.era]}</span></div>
    </div><button className={`button ${saved ? 'saved' : ''}`} onClick={onSave} aria-pressed={saved}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/>{saved ? '保存済み' : 'お気に入り'}</button></div>
    <div className="detail-secondary-actions"><button className="text-button" onClick={onRandom}><Shuffle size={15}/>条件を保って別の店</button></div>
    <p className="detail-description">{shop.description}</p>
    <div className="detail-facts"><span><MapPin size={16}/>{locationLabels[shop.locationType]}</span><span><Clock size={16}/>{shop.openingHours}</span><span><Store size={16}/>{scaleLabels[shop.scale]}</span><span>価格帯：{priceLabels[shop.priceLevel]}</span></div>
    {shop.scene && <div className="shop-scene">{Object.entries({'名物': shop.scene.signature, '店内': shop.scene.interior, '接客': shop.scene.service, '街とのつながり': shop.scene.localFlavor}).map(([label, text]) => <p key={label}><b>{label}</b>{text}</p>)}</div>}
    <div className="detail-actions">
      <a className="button primary" href={`#/shop/${shop.id}?mode=pl`}><Maximize size={17}/>メニュー表として表示<span className="pl-chip">PL用</span></a>
      <button className="button" onClick={() => onCopy(menuText(shop), 'メニュー全文')}><Copy size={16}/>メニューをコピー</button>
      <button className="button" onClick={() => setShareOpen(true)}><Share2 size={16}/>PLに共有</button>
      <button className="button" onClick={() => setExportOpen(true)}><Printer size={16}/>印刷・画像・データ出力</button>
    </div>
    <SessionShopEditor shopId={shop.id} folder={folder} onManage={onManage} onSave={onSaveEntry} onUsed={onUsed}/>
    <section className="recommendations"><div className="recommend-heading"><h2><Sparkles size={17}/>今日のおすすめ</h2><div className="button-row">
      <button className="text-button" disabled={!picks.length} onClick={() => onCopy(menuPlainText(toMenuDocument(shop, {itemIds: picks.map(i => i.id)}), true), 'おすすめ')}><Copy size={15}/>おすすめをコピー</button>
      <button className="text-button" onClick={() => setPicks(recommendItems(items))}><Shuffle size={15}/>選び直す</button>
    </div></div><div className="recommend-grid">{picks.map((item, i) => <div key={item.id}><span className="pick-number">0{i + 1}</span><p>{item.name}<b>{money(item.price)}</b></p></div>)}</div>{!picks.length && <p className="muted-text">この店舗は料金・サービスの一覧です。</p>}</section>
    <Tabs defaultValue="menu" className="detail-tabs"><TabsList variant="line"><TabsTrigger value="menu">メニュー <span>{items.length}</span></TabsTrigger><TabsTrigger value="gm">GM用テキスト</TabsTrigger></TabsList>
      <TabsContent value="menu"><div className="menu-topline"><nav aria-label="メニューの分類">{shop.menuSections.map(s => <button className="text-button" key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({behavior: 'smooth', block: 'start'})}>{s.title}</button>)}</nav><span>{shop.priceNote || '表示価格はすべて税込'}</span></div>
        <div className="menu-selection-toolbar">
          <label><Checkbox checked={selectedIds.length === items.length} indeterminate={selectedIds.length > 0 && selectedIds.length < items.length} onCheckedChange={checked => setSelectedIds(checked ? items.map(i => i.id) : [])}/>全商品を選択</label>
          <p role="status">{selectedIds.length}品を選択 <b>各1点の合計 {money(menuTotal(selectedMenu))}</b></p>
          <div className="button-row"><button className="button" disabled={!selectedIds.length} onClick={() => onCopy(menuPlainText(selectedMenu, true), '選択商品の名前と価格')}><Copy size={15}/>名前と価格をコピー</button><button className="button" disabled={!selectedIds.length} onClick={() => onCopy(menuPlainText(selectedMenu), '選択商品（説明付き）')}>説明付きでコピー</button><button className="button" disabled={!selectedIds.length} onClick={() => setExportOpen(true)}>選択分を印刷・出力</button><button className="text-button" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>選択解除</button></div>
          <small>合計は表示額を1点ずつ足した目安です。時間・人数・追加料金は価格の補足をご確認ください。</small>
        </div>
        <div className="detail-menu">{shop.menuSections.map(section => <section id={section.id} key={section.id}><h2>{section.title}<span>{section.items.length}品</span></h2>{section.items.map(item => <article id={item.id} tabIndex={-1} className={`menu-item ${focusedItem === item.id ? 'matched-item' : ''} ${selectedIds.includes(item.id) ? 'selected-item' : ''}`} key={item.id}>
          <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={checked => selectItem(item.id, Boolean(checked))} aria-label={`${item.name}を選択`}/>
          <div><h3>{item.name}{item.recommended && <span>定番</span>}</h3><p>{item.description}</p></div><b>{money(item.price)}</b><button className="icon-button" aria-label={`${item.name}をコピー`} onClick={() => onCopy(itemText(item), '商品')}><Copy size={15}/></button>
        </article>)}</section>)}</div>
      </TabsContent>
      <TabsContent value="gm"><div className="gm-panel"><h2>セッションへ、そのまま持ち出す。</h2><div className="detail-actions"><button className="button primary" onClick={() => onCopy(gm, 'GM用テキスト')}><Copy size={16}/>GM用テキストをコピー</button><button className="button" onClick={() => onCopy(shop.description, '店舗説明')}><Copy size={16}/>店舗説明だけコピー</button></div><pre>{gm}</pre></div></TabsContent>
    </Tabs>
    <p className="fiction-note">この店舗・商品・価格は創作用の架空設定です。実在店舗の情報ではありません。</p>
    <ShareMenuDialog shop={shop} itemIds={selectedIds.length ? selectedIds : undefined} open={shareOpen} onOpenChange={setShareOpen} onCopy={onCopy} onNotify={onNotify}/>
    {exportOpen && <MenuExportDialog shop={shop} selectedIds={selectedIds} open={exportOpen} onOpenChange={setExportOpen} onCopy={onCopy} onNotify={onNotify}/>}
  </div>;
}
