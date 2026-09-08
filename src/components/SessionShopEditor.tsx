import { useEffect,useState } from 'react';
import { BookmarkPlus,Check,Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SessionEntry,SessionFolder } from '../lib/library';
export default function SessionShopEditor({shopId,folder,onManage,onSave,onUsed}:{shopId:string;folder?:SessionFolder;onManage:()=>void;onSave:(entry:SessionEntry)=>void;onUsed:()=>void}){
 const entry=folder?.entries.find(e=>e.shopId===shopId);const [alias,setAlias]=useState(entry?.alias??'');const [notes,setNotes]=useState(entry?.notes??'');
 useEffect(()=>{setAlias(entry?.alias??'');setNotes(entry?.notes??'');},[shopId,folder?.id,entry?.alias,entry?.notes]);
 return <details className="session-shop-editor"><summary><Folder size={16}/>{folder?`${folder.name} の店舗設定`:'セッションに保存する'}{entry&&<Check size={16}/>}</summary>{folder?<form onSubmit={e=>{e.preventDefault();onSave({shopId,alias:alias.trim(),notes});}}><label>この卓での店名<Input aria-label="この卓での店名" maxLength={80} placeholder="空欄なら元の店名" value={alias} onChange={e=>setAlias(e.target.value)}/></label><label>GMだけのメモ<Textarea aria-label="GMだけのメモ" placeholder="登場人物、前回の出来事、店と事件の関係など" maxLength={5000} value={notes} onChange={e=>setNotes(e.target.value)}/></label><p>別名はこの卓の画面と配布ファイルに反映します。GMメモはPL表示・配布ファイルには入りません。</p><div className="button-row"><button className="button primary" type="submit"><BookmarkPlus size={16}/>{entry?'設定を保存':'この卓に追加'}</button><button className="button" type="button" disabled={folder.usedIds.includes(shopId)} onClick={onUsed}>{folder.usedIds.includes(shopId)?'使用済み':'この卓で使用済みにする'}</button><button className="text-button" type="button" onClick={onManage}>卓を切り替える</button></div></form>:<div><p>セッションを作ると、店舗の別名とGMメモを保存できます。</p><button className="button" onClick={onManage}>セッションを作成・選択</button></div>}</details>;
}
