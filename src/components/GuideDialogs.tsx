import { BookOpen, History, Search, Share2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { categories, shops, itemCount } from '../data';
import { changelog } from '../data/changelog';
import { useTheme } from './ThemeProvider';

type GuideDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

function CloseGuide() {
  return <DialogClose className="icon-button guide-close" aria-label="閉じる"><X size={20} /></DialogClose>;
}

export function HelpDialog({ open, onOpenChange }: GuideDialogProps) {
  const { preference, setPreference } = useTheme();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="guide-dialog" showCloseButton={false}>
      <header className="guide-header">
        <p className="guide-eyebrow"><BookOpen size={16} /> GUIDE</p>
        <DialogTitle className="guide-title">Help・使い方</DialogTitle>
        <DialogDescription>セッション中に、お店を探して、メニューを渡すまで。</DialogDescription>
        <CloseGuide />
      </header>
      <div className="guide-content" tabIndex={0} role="region" aria-label="使い方の本文">
        <section className="guide-start">
          <h2>まずは、この3ステップ</h2>
          <ol className="guide-steps">
            <li><Search size={18} /><div><b>お店を探す</b><p>商品名を検索するか、カテゴリから選びます。「適当な店を出す」でも一軒を選べます。</p></div></li>
            <li><BookOpen size={18} /><div><b>メニューを開く</b><p>「メニューを見る」で商品と価格を確認。しおりマークでお気に入りに保存できます。</p></div></li>
            <li><Share2 size={18} /><div><b>PLに見せる</b><p>「メニュー表として表示」で紙面表示へ。「PLに共有」から閲覧専用URLや配布用HTMLも渡せます。</p></div></li>
          </ol>
        </section>
        <div className="guide-topics">
          <details><summary>検索・絞り込み・ランダム</summary><div>
            <p>店舗名・商品名・説明・タグをまとめて検索できます。空白で区切ると、すべての言葉に合う店舗を探します。商品名の一致結果を押すと、その商品へ移動します。</p>
            <p>価格帯は店舗全体の目安、商品予算は1品の価格上限です。立地・規模・雰囲気も組み合わせられます。検索欄へは <kbd>/</kbd> キーでも移動できます。</p>
            <p>抽選は現在の条件から選びます。「この卓で出した店舗を除外」をオンにすると、同じ卓での重複を避けられます。候補がなくなったら条件をゆるめるか、使用済みの記録をリセットしてください。</p>
          </div></details>
          <details><summary>時代の選び方と、価格の単位</summary><div>
            <p>通常は「現代」です。時代の選択欄から平成（1998年）・昭和（1968年）・ヴィクトリア朝イギリス（1890年）・1920年代のアメリカ（1926年）に切り替えられます。歴史設定は各30店舗を収録しています。</p>
            <p>再読込や絞り込みの「解除」で現代に戻ります。歴史店舗の直接リンクを開いた場合は、その店舗の時代を表示します。</p>
            <p>日本は円、英国は旧通貨（£1＝20s、1s＝12d）、米国はドルです。商品予算は円・ペンス・セントで入力します。たとえば米国で1ドル以内なら「100」。価格は創作用の架空設定です。</p>
          </div></details>
          <details><summary>PL表示・共有・印刷とファイル保存</summary><div>
            <p>PL表示では「操作を隠す」でメニューだけにできます。画面上端をタップするか <kbd>Esc</kbd> キーで操作を戻せます。全画面中はブラウザの全画面解除が先に働く場合があります。</p>
            <p>閲覧専用URLは元の店名と全商品を表示します。卓で設定した別名や商品選択を渡す場合は、配布用HTML・画像などに書き出してください。配布用HTMLは通信なしでも開けます。</p>
            <p>商品を選ぶと各1点の合計を表示します。短文コピー・説明付きコピー、印刷（PDF保存）、HTML・PNG・SVG・CSV・JSONに対応。出力設定で店名、対象商品、説明、文字サイズ、縦横を調整できます。</p>
            <p>PL用の紙面と出力ファイルは、ダークモードでも明るい紙面を保ちます。GMメモはPL配布物には入りません。</p>
          </div></details>
          <details><summary>お気に入り・セッションの保存と復元</summary><div>
            <p>「セッション管理」で卓を作成し、店舗詳細の「○○の店舗設定」を開いて「この卓に追加」で登録します。卓ごとに店名の別名、GMメモ、使用済み店舗を管理できます。</p>
            <p>お気に入り・最近20店舗・セッションは、このブラウザに保存します。端末やブラウザ間の自動同期はありません。</p>
            <p>「セッション管理」で保存ファイルを書き出し、別端末で読み込めば移行できます。既存の内容に追加し、競合する卓は別名で残します。この保存ファイルにはGMメモも含まれます。</p>
            <p>サイトの保存データを消去すると記録が失われます。大切な卓は保存ファイルを手元に残してください。</p>
          </div></details>
          <details><summary>ダークモードと表示設定</summary><div>
            <p>画面右上の月・太陽ボタンで切り替えます。初回は端末の設定に合わせ、手動で選んだ後はこのブラウザに選択を保存します。</p>
            <div className="guide-theme-setting"><span>現在：{preference === 'system' ? '端末の設定に合わせる' : preference === 'dark' ? 'ダークモード' : 'ライトモード'}</span><button className="button" disabled={preference === 'system'} onClick={() => setPreference('system')}>端末の設定に合わせる</button></div>
          </div></details>
          <details><summary>うまく動かないとき</summary><div>
            <p>店舗が見つからないときは、時代や「お気に入り」「この卓」の絞り込みも確認してください。検索欄を空にし、「解除」で条件を戻せます。</p>
            <p>メニューの読込に失敗したときは通信を確認して「再試行」を押してください。コピーが許可されない場合は、表示されるテキストを選択して手動でコピーできます。</p>
            <p>保存できない旨が表示された場合、その回は画面内で利用できますが、再読込で記録が失われることがあります。ブラウザのサイトデータの保存設定を確認してください。</p>
          </div></details>
        </div>
        <p className="guide-about">まちかどメニュー帖は、創作・TRPG向けの架空店舗資料集です。全時代で{categories.length}カテゴリ・{shops.length}店舗・延べ{itemCount.toLocaleString('ja-JP')}商品・サービスを収録。店舗名・商品・価格はすべて架空の設定です。収録内容は編集用初稿で、人による最終確認は未実施です。</p>
      </div>
      <footer className="guide-footer"><span><kbd>Esc</kbd> でも閉じられます</span><DialogClose className="button primary">閉じる</DialogClose></footer>
    </DialogContent>
  </Dialog>;
}

export function ChangelogDialog({ open, onOpenChange }: GuideDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="guide-dialog" showCloseButton={false}>
      <header className="guide-header">
        <p className="guide-eyebrow"><History size={16} /> WHAT’S NEW</p>
        <DialogTitle className="guide-title">更新履歴</DialogTitle>
        <DialogDescription>メニュー帖に加わった機能と、収録内容の記録。</DialogDescription>
        <CloseGuide />
      </header>
      <div className="guide-content" tabIndex={0} role="region" aria-label="更新履歴の本文">
        <ol className="changelog-list">{changelog.map((release, index) => <li key={release.date}>
          <div className="release-date"><time dateTime={release.date}>{release.date.replaceAll('-', '.')}</time>{index === 0 && <span>最新</span>}</div>
          <h2>{release.title}</h2>
          <ul>{release.changes.map(change => <li key={change}>{change}</li>)}</ul>
        </li>)}</ol>
      </div>
      <footer className="guide-footer"><span>これまでの改善も、ここから。</span><DialogClose className="button primary">閉じる</DialogClose></footer>
    </DialogContent>
  </Dialog>;
}
