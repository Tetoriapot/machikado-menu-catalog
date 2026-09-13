import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Shop, Category, MenuItem, Era } from '../src/data/types.ts';
import { eraLabels, eraCurrencies } from '../src/data/eras.ts';
type Profile={era:Exclude<Era,'modern'>;category:string;newCategory?:Category;sections:[string,string,string];common:string;shops:[string,string,string];specials:[string,string,string];hours:string;price?:Shop['priceLevel']};
const profiles=JSON.parse(readFileSync('scripts/era-shop-drafts.json','utf8')) as Profile[];
const years={heisei:1998,showa:1968,victorian:1890,'america-1920s':1926};
const data=new Map(readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).map(f=>{const d=JSON.parse(readFileSync(`src/data/shops/${f}`,'utf8')) as {category:Category;shops:Shop[]};return [d.category.id,d];}));
const shopNames=new Set([...data.values()].flatMap(d=>d.shops.map(s=>s.name)));const changed=new Set<string>(),seen=new Set<string>();let count=0;
function parse(raw:string,expected:number):Omit<MenuItem,'id'>[]{const rows=raw.trim().split('\n');if(rows.length!==expected)throw new Error(`Expected ${expected} items: ${rows.length}`);return rows.map(row=>{const [name,value,kind,description,...extra]=row.split('|'),price=Number(value);if(extra.length||!name||description?.length<5||!Number.isSafeInteger(price)||price<0||!['food','drink','goods','side','dessert','service','fee','addon'].includes(kind))throw new Error(`Bad row ${row}`);const k=kind==='side'||kind==='dessert'?'food':kind as MenuItem['kind'];const group=k==='food'?(kind==='food'?'main':kind as 'side'|'dessert'):k==='drink'||k==='goods'?k:undefined;return {name,price,kind:k,description,...(group?{recommendationGroup:group}:{})};});}
for(const profile of profiles){
 if(!(profile.era in years)||profile.shops.length!==3||profile.specials.length!==3||profile.sections.length!==3)throw new Error('Invalid historical profile');
 const key=`${profile.category}-${profile.era}`;if(seen.has(key))throw new Error(`Duplicate ${key}`);seen.add(key);
 let entry=data.get(profile.category);if(!entry){if(profile.newCategory?.id!==profile.category)throw new Error(`Unknown category ${profile.category}`);entry={category:profile.newCategory,shops:[]};data.set(profile.category,entry);}
 const common=parse(profile.common,18);if(new Set(common.map(i=>i.name)).size!==18)throw new Error(`Duplicate staples ${key}`);
 const names=new Set(common.map(i=>i.name));
 for(let n=0;n<3;n++){
  const special=parse(profile.specials[n],3);for(const i of special){if(names.has(i.name))throw new Error(`Duplicate special ${key}: ${i.name}`);names.add(i.name);}
  const id=`${key}-${n+1}`;if(entry.shops.some(s=>s.id===id))continue;
  // Authored shop brief: name | place | location | concept | interior | service | local connection.
  const fields=profile.shops[n].split('|');if(fields.length!==7||fields.some(f=>!f))throw new Error(`Incomplete brief ${id}`);
  const [name,place,location,concept,interior,service,localFlavor]=fields;
  if(shopNames.has(name))throw new Error(`Duplicate name ${name}`);shopNames.add(name);
  if(!['city','suburb','local-city','rural','station','shopping-street','tourist'].includes(location)||[interior,service,localFlavor].some(s=>s.length<12))throw new Error(`Invalid scene ${id}`);
  const currency=eraCurrencies[profile.era],year=years[profile.era];
  const note=currency==='GBP-predecimal'?'旧英国通貨の架空価格。£1＝20s、1s＝12d。':currency==='USD'?'米ドルの架空価格。$1＝100セント。':'円の架空価格。';
  const shop:Shop={id,name,category:profile.category,era:profile.era,currency,setting:{year,place},locationType:location as Shop['locationType'],priceLevel:profile.price??'normal',scale:'independent',tags:[eraLabels[profile.era],`${year}年`,concept],description:`${year}年の${place}を舞台にした${concept}。${localFlavor}`,openingHours:profile.hours,priceNote:`${year}年を想定した${note}表示額で会計する卓用設定です。`,scene:{interior,service,signature:special.map(i=>i.name).join('、'),localFlavor},menuSections:profile.sections.map((title,s)=>({id:`${id}-section-${s+1}`,title,items:[{...special[s],id:`${id}-signature-${s+1}`,recommended:Boolean(special[s].recommendationGroup)},...common.slice(s*6,s*6+6).map((item,i)=>({...item,id:`${id}-item-${s*6+i+1}`,recommended:false}))]}))};entry.shops.push(shop);changed.add(profile.category);count++;
 }
}
for(const id of changed)writeFileSync(`src/data/shops/${id}.json`,JSON.stringify(data.get(id),null,2)+'\n');
console.log(`Added ${count} historical shops with ${count*21} items.`);
