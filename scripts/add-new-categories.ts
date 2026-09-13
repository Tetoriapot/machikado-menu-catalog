// One-time authored category expansion. Canonical JSON is edited directly afterward.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { Category, Shop, MenuItem } from '../src/data/types.ts';
type Draft={name:string;description:string;location:Shop['locationType'];price:Shop['priceLevel'];hours:string;tags:string[];scene:string;menu:string;priceNote?:string};
type Bundle={category:Category;sections:[string,string,string];common:string;shops:[Draft,Draft,Draft]};
const bundles=JSON.parse(readFileSync('scripts/new-category-drafts.json','utf8')) as Bundle[];
const existing=readdirSync('src/data/shops').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`src/data/shops/${f}`,'utf8')) as {category:Category;shops:Shop[]});
const ids=new Set(existing.map(d=>d.category.id));const shopNames=new Set(existing.flatMap(d=>d.shops.map(s=>s.name)));
const batchIds=new Set<string>();const pending:{category:Category;shops:Shop[]}[]=[];
function parseMenu(raw:string,count:number):Omit<MenuItem,'id'>[]{
 const rows=raw.trim().split('\n');if(rows.length!==count)throw new Error(`Expected ${count} items, found ${rows.length}`);
 return rows.map(row=>{const fields=row.split('|');if(fields.length!==4)throw new Error(`Invalid row: ${row}`);
  const [name,value,group,description]=fields;const price=Number(value);
  if(!name||!Number.isSafeInteger(price)||price<0||description.length<8)throw new Error(`Invalid item: ${row}`);
  if(!['food','side','dessert','drink','goods','fee','addon','service'].includes(group))throw new Error(`Invalid group: ${group}`);
  const kind=group==='side'||group==='dessert'?'food':group as MenuItem['kind'];
  const recommendationGroup=kind==='food'?(group==='food'?'main':group as 'side'|'dessert'):kind==='drink'||kind==='goods'?kind:undefined;
  return {name,price,description,kind,...(recommendationGroup?{recommendationGroup}:{})};
 });
}
for(const bundle of bundles){
 const c=bundle.category;
 if(!/^[a-z][a-z-]+$/.test(c.id)||batchIds.has(c.id)||!c.label||!c.icon||!['飲食店','テイクアウト','小売店','施設・娯楽'].includes(c.group))throw new Error(`Invalid category ${c.id}`);
 batchIds.add(c.id);if(ids.has(c.id))continue;
 if(bundle.shops.length!==3||bundle.sections.length!==3||bundle.sections.some(t=>!t))throw new Error(`Three shops and sections required: ${c.id}`);
 const common=parseMenu(bundle.common,12);const names=new Set(common.map(i=>i.name));if(names.size!==12)throw new Error(`Duplicate staple in ${c.id}`);
 const shops=bundle.shops.map((draft,n):Shop=>{
  const id=`${c.id}-${n+1}`;const unique=parseMenu(draft.menu,9);
  for(const i of unique){if(names.has(i.name))throw new Error(`Reused signature item: ${c.id}/${i.name}`);names.add(i.name);}
  if(shopNames.has(draft.name))throw new Error(`Duplicate shop name ${draft.name}`);shopNames.add(draft.name);
  if(!draft.description||!draft.hours||draft.tags.length<2)throw new Error(`Incomplete shop ${id}`);
  if(!['city','suburb','local-city','rural','station','shopping-street','tourist'].includes(draft.location)||!['very-cheap','cheap','normal','expensive','luxury'].includes(draft.price))throw new Error(`Invalid filters ${id}`);
  const scene=draft.scene.split('|');if(scene.length!==3||scene.some(s=>s.length<12))throw new Error(`Incomplete scene ${id}`);
  return {id,name:draft.name,category:c.id,description:draft.description,openingHours:draft.hours,locationType:draft.location,priceLevel:draft.price,era:'modern',scale:'independent',tags:draft.tags,scene:{interior:scene[0],service:scene[1],signature:`${unique[0].name}と${unique[3].name}`,localFlavor:scene[2]},priceNote:draft.priceNote??'表示価格はすべて税込です。',menuSections:bundle.sections.map((title,s)=>({id:`${id}-section-${s+1}`,title,items:[...unique.slice(s*3,s*3+3).map((item,i)=>({...item,id:`${id}-original-${s*3+i+1}`,recommended:i===0&&Boolean(item.recommendationGroup)})),...common.slice(s*4,s*4+4).map((item,i)=>({...item,id:`${id}-staple-${s*4+i+1}`,recommended:false}))]}))};
 });pending.push({category:c,shops});
}
// Validate the entire pending batch before changing any canonical file.
for(const data of pending)writeFileSync(`src/data/shops/${data.category.id}.json`,JSON.stringify(data,null,2)+'\n');
console.log(`Added ${pending.length} categories, ${pending.length*3} shops and ${pending.length*63} items.`);
