import type { Shop, ShopSummary, MenuItem } from '../data/types.ts';
export type Filters={query:string;category:string;price:string;location:string;era:string;scale:string;tag:string};
export const defaultFilters:Filters={query:'',category:'all',price:'all',location:'all',era:'all',scale:'all',tag:'all'};
export const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const synonyms:Record<string,string>={'ファミリーレストラン':'ファミレス','珈琲':'コーヒー','からあげ':'唐揚げ','らーめん':'ラーメン','こんびに':'コンビニ'};
export function matchesFilters(shop:ShopSummary,filters:Filters, extraText=''){
 if(filters.category!=='all'&&shop.category!==filters.category)return false;
 if(filters.price!=='all'&&shop.priceLevel!==filters.price)return false;
 if(filters.location!=='all'&&shop.locationType!==filters.location)return false;
 if(filters.era!=='all'&&shop.era!==filters.era)return false;
 if(filters.scale!=='all'&&shop.scale!==filters.scale)return false;
 if(filters.tag!=='all'&&!shop.tags.includes(filters.tag))return false;
 const haystack=normalize([shop.name,shop.description,shop.searchText,...shop.tags,shop.openingHours,extraText].join(' '));
 return filters.query.trim().split(/\s+/).filter(Boolean).every(word=>haystack.includes(normalize(synonyms[word]??word)));
}
export function sample<T>(items:readonly T[],count:number,rng= Math.random):T[]{const pool=[...items];for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,Math.max(0,count));}
export const money=(n:number)=>`¥${n.toLocaleString('ja-JP')}`;
export const itemText=(item:MenuItem)=>`${item.name} ${money(item.price)}\n${item.description}`;
export const menuText=(shop:Shop)=>`【${shop.name}】\n価格はすべて税込\n\n${shop.menuSections.map(s=>`${s.title}\n${s.items.map(itemText).join('\n\n')}`).join('\n\n')}`;
export const gmText=(shop:Shop)=>`【${shop.name}】\n${shop.description}\n営業時間：${shop.openingHours}\n\n${shop.menuSections.flatMap(s=>s.items).map(i=>`${i.name} ${money(i.price)}`).join('\n')}`;
export const remember=(ids:readonly string[],id:string)=>[id,...ids.filter(x=>x!==id)].slice(0,20);
export function readIds(raw:string|null,validIds:readonly string[]):string[]{try{const parsed:unknown=JSON.parse(raw??'[]');return Array.isArray(parsed)?[...new Set(parsed.filter((id):id is string=>typeof id==='string'&&validIds.includes(id)))]:[];}catch{return [];}}
export function parseRoute(hash:string):{kind:'catalog';category:string}|{kind:'shop';id:string;pl:boolean}|{kind:'missing'}{
 if(!hash||hash==='#'||hash==='#/' )return {kind:'catalog',category:'all'};
 const [path,query]=hash.replace(/^#/,'').split('?');
 const category=path.match(/^\/categories\/([a-z0-9-]+)$/);if(category)return {kind:'catalog',category:category[1]};
 const shop=path.match(/^\/shop\/([a-z0-9-]+)$/);if(shop)return {kind:'shop',id:shop[1],pl:new URLSearchParams(query).get('mode')==='pl'};
 return {kind:'missing'};
}
