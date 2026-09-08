import { Download,Link } from 'lucide-react';
import { Dialog,DialogContent,DialogTitle,DialogDescription,DialogClose } from '@/components/ui/dialog';
import type { Shop } from '../data/types';
import { renderMenuHtml,toMenuDocument } from '../lib/menu-document';
import { downloadFile,safeFilename } from '../lib/download';
export default function ShareMenuDialog({shop,open,onOpenChange,onCopy,onNotify,title,itemIds}:{shop:Shop;open:boolean;onOpenChange:(value:boolean)=>void;onCopy:(text:string,label:string)=>void;onNotify:(text:string)=>void;title?:string;itemIds?:string[]}){
 const download=()=>{try{downloadFile(renderMenuHtml(toMenuDocument(shop,{title,itemIds})),`${safeFilename(title||shop.name)}_PLメニュー.html`,'text/html;charset=utf-8');onNotify('配布用メニューを保存しました');}catch{onNotify('保存できませんでした。ブラウザのダウンロード設定を確認してください。');}};
 const shareUrl=()=>{const url=new URL(window.location.href);url.hash=`/menu/${shop.id}`;onCopy(url.href,'閲覧専用URL');};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="share-dialog" showCloseButton={false}><DialogTitle>PLにメニューを渡す</DialogTitle><DialogDescription>配布用ファイルには、店名・商品・価格・商品説明を載せます。GMメモやお気に入りは含まれません。</DialogDescription><div className="share-choice"><h3>ログイン不要で渡す</h3><p>{itemIds?`選択した${itemIds.length}品を出力します。`:'すべての商品を出力します。'}</p><p>HTMLファイルを保存して、チャットやメールに添付してください。受け取った人はブラウザで開けます。通信がない場所でも使えます。</p><button className="button primary" onClick={download}><Download size={17}/>配布用HTMLを保存</button></div><div className="share-choice"><h3>閲覧専用URLを渡す</h3><p>サイトを閲覧できる人向けです。本人限定の公開設定では、PLもアクセス権が必要です。URLは元の店舗メニューを表示し、別名や商品選択は反映しません。</p><button className="button" onClick={shareUrl}><Link size={16}/>閲覧専用URLをコピー</button></div><DialogClose className="button">閉じる</DialogClose></DialogContent></Dialog>;
}
