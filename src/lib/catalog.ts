import type { Shop, ShopSummary, MenuItem } from '../data/types.ts';
export type Filters={query:string;category:string;price:string;location:string;era:string;scale:string;tag:string;maxItemPrice:string};
export const defaultFilters:Filters={query:'',category:'all',price:'all',location:'all',era:'all',scale:'all',tag:'all',maxItemPrice:''};
export const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const synonyms:Record<string,string>={'ファミリーレストラン':'ファミレス','珈琲':'コーヒー','からあげ':'唐揚げ','らーめん':'ラーメン','こんびに':'コンビニ'};
export const searchWords=(query:string)=>query.trim().split(/\s+/).filter(Boolean).map(word=>normalize(synonyms[word]??word));
export function matchingItems(shop:ShopSummary,query:string,maxItemPrice=''):MenuItem[]{
 const words=searchWords(query);if(!words.length&&!maxItemPrice)return [];
 return shop.menuIndex.map(item=>({item,score:words.reduce((n,word)=>n+(normalize(item.name).includes(word)?3:normalize([item.description,...(item.tags??[])].join(' ')).includes(word)?1:0),0)})).filter(x=>(!words.length||x.score>0)&&(!maxItemPrice||(['food','drink','goods'].includes(x.item.kind)&&x.item.price<=Number(maxItemPrice)))).sort((a,b)=>b.score-a.score).map(x=>x.item);
}
export function matchesFilters(shop:ShopSummary,filters:Filters, extraText=''){
 if(filters.category!=='all'&&shop.category!==filters.category)return false;
 if(filters.price!=='all'&&shop.priceLevel!==filters.price)return false;
 if(filters.location!=='all'&&shop.locationType!==filters.location)return false;
 if(filters.era!=='all'&&shop.era!==filters.era)return false;
 if(filters.scale!=='all'&&shop.scale!==filters.scale)return false;
 if(filters.tag!=='all'&&!shop.tags.includes(filters.tag))return false;
 if(filters.maxItemPrice){
   const limit=Number(filters.maxItemPrice);if(!Number.isFinite(limit)||limit<0)return false;
   const matches=matchingItems(shop,filters.query);
   const candidates=matches.length?matches:shop.menuIndex;
   if(!candidates.some(i=>['food','drink','goods'].includes(i.kind)&&i.price<=limit))return false;
 }
 const haystack=normalize([shop.name,shop.description,shop.searchText,...shop.menuIndex.flatMap(i=>[i.name,i.description,...(i.tags??[])]),...shop.tags,shop.openingHours,extraText].join(' '));
 return searchWords(filters.query).every(word=>haystack.includes(word));
}
export function sample<T>(items:readonly T[],count:number,rng= Math.random):T[]{const pool=[...items];for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,Math.max(0,count));}
export function recommendItems(items:readonly MenuItem[],count=3,rng=Math.random):MenuItem[]{
 const pool=items.filter(i=>['food','drink','goods'].includes(i.kind));if(!pool.length)return [];
 const signature=sample(pool.filter(i=>i.recommended),1,rng)[0]??sample(pool,1,rng)[0];
 const result=[signature];let remaining=sample(pool.filter(i=>i.id!==signature.id),pool.length,rng);
 while(result.length<count&&remaining.length){const diverse=remaining.find(i=>!result.some(p=>p.recommendationGroup===i.recommendationGroup));const next=diverse??remaining[0];result.push(next);remaining=remaining.filter(i=>i.id!==next.id);}
 return result.slice(0,count);
}
export const money=(n:number)=>`¥${n.toLocaleString('ja-JP')}`;
export const itemText=(item:MenuItem)=>`${item.name} ${money(item.price)}\n${item.description}`;
export const menuText=(shop:Shop)=>`【${shop.name}】\n${shop.priceNote||'価格はすべて税込'}\n\n${shop.menuSections.map(s=>`${s.title}\n${s.items.map(itemText).join('\n\n')}`).join('\n\n')}`;
export const gmText=(shop:Shop)=>`【${shop.name}】\n${shop.description}\n営業時間：${shop.openingHours}\n\n${shop.menuSections.flatMap(s=>s.items).map(i=>`${i.name} ${money(i.price)}`).join('\n')}`;
export const remember=(ids:readonly string[],id:string)=>[id,...ids.filter(x=>x!==id)].slice(0,20);
export function readIds(raw:string|null,validIds:readonly string[]):string[]{try{const parsed:unknown=JSON.parse(raw??'[]');return Array.isArray(parsed)?[...new Set(parsed.filter((id):id is string=>typeof id==='string'&&validIds.includes(id)))]:[];}catch{return [];}}
export function parseRoute(hash:string):{kind:'catalog';category:string}|{kind:'shop';id:string;pl:boolean;item?:string;readOnly?:boolean}|{kind:'missing'}{
 if(!hash||hash==='#'||hash==='#/' )return {kind:'catalog',category:'all'};
 const [path,query]=hash.replace(/^#/,'').split('?');
 const category=path.match(/^\/categories\/([a-z0-9-]+)$/);if(category)return {kind:'catalog',category:category[1]};
 const menu=path.match(/^\/menu\/([a-z0-9-]+)$/);if(menu)return {kind:'shop',id:menu[1],pl:true,readOnly:true};
 const shop=path.match(/^\/shop\/([a-z0-9-]+)$/);if(shop){const params=new URLSearchParams(query);const item=params.get('item');return {kind:'shop',id:shop[1],pl:params.get('mode')==='pl',...(item&&/^[a-z0-9-]+$/.test(item)?{item}:{})};}
 return {kind:'missing'};
}
