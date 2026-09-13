import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { Shop } from '../data/types';
import { toMenuDocument, renderMenuHtml, type DocumentOptions } from '../lib/menu-document';
import { menuPlainText, menuTotal, renderMenuCsv, renderMenuJson, renderMenuSvg } from '../lib/menu-export';
import { downloadFile, safeFilename } from '../lib/download';
import { downloadMenuPng, printMenuHtml } from '../lib/menu-output';
import { money } from '../lib/catalog';

type Format = 'html' | 'png' | 'svg' | 'csv' | 'json';
export default function MenuExportDialog({shop, selectedIds, open, onOpenChange, onCopy, onNotify}: {shop: Shop; selectedIds: string[]; open: boolean; onOpenChange: (value: boolean) => void; onCopy: (text: string, label: string) => void; onNotify: (message: string) => void}) {
  const [scope, setScope] = useState(selectedIds.length ? 'selected' : 'all');
  const [title, setTitle] = useState(shop.name);
  const [descriptions, setDescriptions] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [format, setFormat] = useState<Format>('html');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options: DocumentOptions = useMemo(() => ({title, descriptions, fontSize, layout, ...(scope === 'selected' ? {itemIds: selectedIds} : {})}), [title, descriptions, fontSize, layout, scope, selectedIds]);
  const menu = useMemo(() => toMenuDocument(shop, options), [shop, options]);
  const html = useMemo(() => renderMenuHtml(menu, options), [menu, options]);
  const count = menu.sections.reduce((sum, s) => sum + s.items.length, 0);
  const download = async () => {
    if (!count || busy) return;
    setBusy(true); setError('');
    try {
      const filename = `${safeFilename(menu.name)}_メニュー.${format}`;
      if (format === 'html') downloadFile(html, filename, 'text/html;charset=utf-8');
      else if (format === 'csv') downloadFile(renderMenuCsv(menu), filename, 'text/csv;charset=utf-8');
      else if (format === 'json') downloadFile(renderMenuJson(menu), filename, 'application/json;charset=utf-8');
      else {const result = renderMenuSvg(menu, options); if (format === 'svg') downloadFile(result.svg, filename, 'image/svg+xml;charset=utf-8'); else await downloadMenuPng(result.svg, result.width, result.height, filename);}
      onNotify(`${format.toUpperCase()}の保存を開始しました`);
    } catch (e) {setError(e instanceof Error ? e.message : '保存できませんでした。');}
    finally {setBusy(false);}
  };
  return <Dialog open={open} onOpenChange={value => {if (!busy) onOpenChange(value);}}><DialogContent className="menu-export-dialog" showCloseButton={false}>
    <DialogTitle>配布するメニューを整える</DialogTitle>
    <DialogDescription>商品・店名・文字サイズを調整して保存できます。GMメモは含まれません。</DialogDescription>
    <div className="export-workspace"><div className="export-settings">
      <label>表示する店名<Input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder={shop.name}/></label>
      <label>出力する商品<select value={scope} onChange={e => setScope(e.target.value)}><option value="all">全商品</option><option value="selected" disabled={!selectedIds.length}>選択した{selectedIds.length}品</option></select></label>
      <label className="checkbox-label"><Checkbox checked={descriptions} onCheckedChange={value => setDescriptions(Boolean(value))}/>商品説明を付ける</label>
      <label>文字サイズ：{fontSize}px<input type="range" min="14" max="28" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}/></label>
      <label>紙面の向き<select value={layout} onChange={e => setLayout(e.target.value as 'portrait' | 'landscape')}><option value="portrait">縦</option><option value="landscape">横</option></select></label>
      <p className="export-count">{count}品・各1点の合計 <b>{money(menuTotal(menu),menu.currency)}</b><small>時間・人数・追加料金は店舗の価格補足をご確認ください。</small></p>
      <button className="button" disabled={!count || busy} onClick={() => {try {printMenuHtml(html);} catch {setError('印刷を開けませんでした。HTMLを保存してブラウザから印刷してください。');}}}><Printer size={16}/>印刷 / PDF保存</button>
      <label>ファイル形式<select value={format} onChange={e => setFormat(e.target.value as Format)}><option value="html">HTML — 単体で開く・印刷する</option><option value="png">PNG — 画像として貼り付ける</option><option value="svg">SVG — 拡大できる画像</option><option value="csv">CSV — 表計算へ持ち出す</option><option value="json">JSON — データとして持ち出す</option></select></label>
      <button className="button primary" disabled={!count || busy} onClick={download}><Download size={16}/>{busy ? '作成しています…' : `${format.toUpperCase()}を保存`}</button>
      <button className="text-button" disabled={!count || busy} onClick={() => onCopy(menuPlainText(menu), '設定したメニュー')}>この内容をテキストでコピー</button>
      <p className="muted-text">HTMLはログイン・通信なしで開けます。PNG/SVGは紙面全体を1枚の画像にします。画像の組版は印刷用プレビューと多少異なります。</p>
    </div><div className="export-preview"><p>HTML・印刷用プレビュー</p><iframe title="配布用メニューのプレビュー" sandbox="" srcDoc={html}/></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <DialogClose className="button" disabled={busy}>閉じる</DialogClose>
  </DialogContent></Dialog>;
}
