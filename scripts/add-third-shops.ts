// Add a separately authored third shop per category, preserving all existing records.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import type { Category, Shop, MenuItem, MenuSection } from '../src/data/types.ts';
type Draft = {category:string;name:string;description:string;location:Shop['locationType'];price:Shop['priceLevel'];hours:string;tags:string[];scene:string;menu:string;scale?:Shop['scale'];priceNote?:string};
const drafts=JSON.parse(readFileSync('scripts/third-shop-drafts.json','utf8')) as Draft[];
const files=readdirSync('src/data/shops').filter(f=>f.endsWith('.json'));
const catalog=new Map(files.map(file=>{const data=JSON.parse(readFileSync(`src/data/shops/${file}`,'utf8')) as {category:Category;shops:Shop[]};return [data.category.id,{file,data}];}));
const names=new Set([...catalog.values()].flatMap(({data})=>data.shops.map(s=>s.name)));
const seen=new Set<string>();const updates=new Set<string>();let added=0;
for(const draft of drafts){
 if(seen.has(draft.category))throw new Error(`Duplicate draft ${draft.category}`);seen.add(draft.category);
 const entry=catalog.get(draft.category);if(!entry)throw new Error(`Unknown category ${draft.category}`);
 const id=`${draft.category}-3`;if(entry.data.shops.some(s=>s.id===id))continue;
 if(names.has(draft.name))throw new Error(`Duplicate shop name ${draft.name}`);names.add(draft.name);
 const originals=[1,2].map(n=>entry.data.shops.find(s=>s.id===`${draft.category}-${n}`)!);
 if(originals.some(s=>!s))throw new Error(`Missing original shops ${draft.category}`);
 const existingNames=new Set(originals.flatMap(s=>s.menuSections.flatMap(section=>section.items.map(i=>i.name))));
 const rows=draft.menu.trim().split('\n');if(rows.length!==9)throw new Error(`Nine original items required: ${id}`);
 const authored=rows.map((row,index):MenuItem=>{
  const fields=row.split('|');if(fields.length!==4)throw new Error(`Invalid item row ${id}: ${row}`);
  const [name,rawPrice,group,description]=fields,price=Number(rawPrice);
  if(existingNames.has(name)||!name||!Number.isSafeInteger(price)||price<0||description.length<8)throw new Error(`Invalid or reused original item ${id}: ${name}`);
  existingNames.add(name);
  if(!['food','side','dessert','drink','goods','fee','addon','service'].includes(group))throw new Error(`Invalid item group ${id}: ${group}`);
  const kind=group==='side'||group==='dessert'?'food':group as MenuItem['kind'];
  const recommendationGroup=kind==='food'?(group==='food'?'main':group as 'side'|'dessert'):kind==='drink'||kind==='goods'?kind:undefined;
  return {id:`${id}-original-${index+1}`,name,price,description,kind,...(recommendationGroup?{recommendationGroup}:{}),recommended:index%3===0&&Boolean(recommendationGroup)};
 });
 const used=new Set(authored.map(i=>i.name));let stapleNumber=0;
 const menuSections:MenuSection[]=originals[0].menuSections.slice(0,3).map((section,index)=>{
  const pools=originals.map(s=>s.menuSections[index].items);const candidates:MenuItem[]=[];
  // Alternate sources and positions to curate a shared core instead of cloning a shop.
  for(let n=0;n<Math.max(...pools.map(p=>p.length));n++){if(pools[0][n])candidates.push(pools[0][n]);if(pools[1][pools[1].length-1-n])candidates.push(pools[1][pools[1].length-1-n]);}
  const staples:MenuItem[]=[];
  for(const item of candidates){if(used.has(item.name))continue;used.add(item.name);staples.push({...item,id:`${id}-staple-${++stapleNumber}`,recommended:false});if(staples.length===4)break;}
  if(staples.length!==4)throw new Error(`Not enough staple items: ${id}/${index}`);
  return {id:`${id}-section-${index+1}`,title:section.title,items:[...authored.slice(index*3,index*3+3),...staples]};
 });
 const scene=draft.scene.split('|');if(scene.length!==3||scene.some(s=>s.length<12))throw new Error(`Incomplete scene ${id}`);
 const shop:Shop={id,name:draft.name,category:draft.category,tags:draft.tags,priceLevel:draft.price,locationType:draft.location,era:'modern',scale:draft.scale??'independent',description:draft.description,openingHours:draft.hours,menuSections,scene:{interior:scene[0],service:scene[1],signature:`${authored[0].name}と${authored[3].name}`,localFlavor:scene[2]},...(draft.priceNote?{priceNote:draft.priceNote}:originals[0].priceNote?{priceNote:originals[0].priceNote}:{})};
 if(!shop.description||!shop.openingHours||shop.tags.length<2)throw new Error(`Incomplete shop ${id}`);
 entry.data.shops.push(shop);updates.add(draft.category);added++;
}
for(const category of updates){const entry=catalog.get(category)!;writeFileSync(`src/data/shops/${entry.file}`,JSON.stringify(entry.data,null,2)+'\n');}
console.log(`Added ${added} shops with ${added*21} items (${added*9} original items and ${added*12} curated staples).`);
