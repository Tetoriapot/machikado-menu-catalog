export type SessionEntry={shopId:string;alias:string;notes:string};
export type SessionFolder={id:string;name:string;entries:SessionEntry[];usedIds:string[]};
export type SessionLibrary={folders:SessionFolder[];activeId:string|null};
export type LibraryBackup={format:'machikado-session-library';version:1;library:SessionLibrary;favorites:string[];recent:string[]};
export const emptyLibrary=():SessionLibrary=>({folders:[],activeId:null});
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown,max:number,label:string)=>{if(typeof value!=='string'||value.length>max)throw new Error(`${label}の形式が正しくありません。`);return value;};
const validList=(value:unknown,validIds:readonly string[],limit=validIds.length):string[]=>{if(!Array.isArray(value)||value.length>Math.max(1000,validIds.length)||value.some(x=>typeof x!=='string'))throw new Error('店舗IDの一覧が正しくありません。');return [...new Set(value.filter(id=>validIds.includes(id)))].slice(0,limit);};
export function validateLibrary(value:unknown,validIds:readonly string[]):SessionLibrary{
 if(!object(value)||!Array.isArray(value.folders)||value.folders.length>100)throw new Error('セッションは100件まで保存できます。');
 const folderIds=new Set<string>();const folders=value.folders.map(raw=>{
  if(!object(raw))throw new Error('セッションの形式が正しくありません。');
  const id=text(raw.id,100,'セッションID');if(!/^[a-zA-Z0-9-]+$/.test(id)||folderIds.has(id))throw new Error('セッションIDが重複または不正です。');folderIds.add(id);
  const name=text(raw.name,80,'セッション名').trim();if(!name)throw new Error('セッション名が空です。');
  if(!Array.isArray(raw.entries)||raw.entries.length>Math.max(200,validIds.length))throw new Error('店舗の件数が多すぎます。');
  const entries:SessionEntry[]=[];const seen=new Set<string>();
  for(const entry of raw.entries){if(!object(entry))throw new Error('店舗設定が正しくありません。');const shopId=text(entry.shopId,100,'店舗ID');const alias=text(entry.alias,80,'別名');const notes=text(entry.notes,5000,'GMメモ');if(validIds.includes(shopId)&&!seen.has(shopId)){seen.add(shopId);entries.push({shopId,alias,notes});}}
  return {id,name,entries,usedIds:validList(raw.usedIds,validIds)};
 });
 return {folders,activeId:typeof value.activeId==='string'&&folderIds.has(value.activeId)?value.activeId:null};
}
export function parseBackup(raw:string,validIds:readonly string[]):LibraryBackup{
 if(raw.length>2_000_000)throw new Error('ファイルは2MB以下にしてください。');
 let data:unknown;try{data=JSON.parse(raw);}catch{throw new Error('JSONファイルを読み込めませんでした。');}
 if(!object(data)||data.format!=='machikado-session-library'||data.version!==1)throw new Error('まちかどメニュー帖の保存ファイル（バージョン1）を選んでください。');
 return {format:data.format,version:1,library:validateLibrary(data.library,validIds),favorites:validList(data.favorites,validIds),recent:validList(data.recent,validIds,20)};
}
export function mergeBackup(current:LibraryBackup,incoming:LibraryBackup,newId:()=>string):LibraryBackup{
 const folders=[...current.library.folders];let preferred=current.library.activeId;
 for(const source of incoming.library.folders){const existing=folders.find(f=>f.id===source.id);if(existing&&JSON.stringify(existing)===JSON.stringify(source))continue;const folder=existing?{...source,id:newId(),name:`${source.name.slice(0,72)}（取込）`}:source;if(folders.some(f=>f.id===folder.id))throw new Error('セッションIDが重複しました。もう一度お試しください。');folders.push(folder);if(!preferred&&incoming.library.activeId===source.id)preferred=folder.id;}
 if(folders.length>100)throw new Error('取り込むとセッションが100件を超えます。');
 return {format:'machikado-session-library',version:1,library:{folders,activeId:preferred},favorites:[...new Set([...current.favorites,...incoming.favorites])],recent:[...new Set([...current.recent,...incoming.recent])].slice(0,20)};
}
export function updateEntry(library:SessionLibrary,folderId:string,entry:SessionEntry):SessionLibrary{
 return {...library,folders:library.folders.map(folder=>folder.id===folderId?{...folder,entries:folder.entries.some(e=>e.shopId===entry.shopId)?folder.entries.map(e=>e.shopId===entry.shopId?entry:e):[...folder.entries,entry]}:folder)};
}
export function randomPool<T extends {id:string}>(shops:readonly T[],usedIds:readonly string[],exclude:boolean,currentId?:string):T[]{return shops.filter(s=>s.id!==currentId&&(!exclude||!usedIds.includes(s.id)));}
