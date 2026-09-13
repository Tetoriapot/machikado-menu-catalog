import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import type { Category, Shop } from '../src/data/types.ts';
const categories: Category[]=[];
const shops: Shop[]=[];
mkdirSync('public/data',{recursive:true});
for(const file of readdirSync('src/data/shops').filter(f=>f.endsWith('.json'))){
 const data=JSON.parse(readFileSync(`src/data/shops/${file}`,'utf8')) as {category:Category;shops:Shop[]};
 if(file!==`${data.category.id}.json`)throw new Error(`Category filename mismatch: ${file}`);
 categories.push(data.category);shops.push(...data.shops);
 copyFileSync(`src/data/shops/${file}`,`public/data/${file}`);
}
const first=['kissaten','cafe','family-restaurant','izakaya','ramen','bakery','teishoku','chinese','yakiniku','sushi','bar','convenience-store','supermarket','drugstore','hotel','hospital','student-cafeteria','karaoke','net-cafe','cinema','service-area'];
const fallbackRank=new Map(categories.map((c,i)=>[c.id,100+i]));
const rank=(id:string)=>first.includes(id)?first.indexOf(id):fallbackRank.get(id)!;
categories.sort((a,b)=>rank(a.id)-rank(b.id));
const edition=(id:string)=>Number(id.match(/-(\d+)$/)?.[1]??1);
shops.sort((a,b)=>edition(a.id)-edition(b.id)||rank(a.category)-rank(b.category));
const ids=new Set<string>();
for(const shop of shops){
 if(ids.has(shop.id))throw new Error(`Duplicate shop ${shop.id}`);ids.add(shop.id);
 if(!categories.some(c=>c.id===shop.category))throw new Error(`Unknown category ${shop.id}`);
 const items=shop.menuSections.flatMap(s=>s.items);
 if(items.length<21)throw new Error(`Too few items ${shop.id}`);
 for(const item of items){if(!item.name||!item.description||!Number.isInteger(item.price)||item.price<0)throw new Error(`Invalid item ${item.id}`);if(!['food','drink','goods','addon','fee','service'].includes(item.kind))throw new Error(`Invalid item kind ${item.id}`);if(ids.has(item.id))throw new Error(`Duplicate ID ${item.id}`);ids.add(item.id);}
}
const index=shops.map(({menuSections,...shop})=>{
 const items=menuSections.flatMap(s=>s.items);const category=categories.find(c=>c.id===shop.category)!;
 return {...shop,itemCount:items.length,preview:items.slice(0,1),menuIndex:items,searchText:[category.label,...menuSections.map(s=>s.title),...Object.values(shop.scene??{})].join(' ')};
});
writeFileSync('src/data/generated-index.json',JSON.stringify({categories,shops:index,itemCount:shops.reduce((n,s)=>n+s.menuSections.flatMap(x=>x.items).length,0)}));
console.log(`${categories.length} categories, ${shops.length} shops, ${index.reduce((n,s)=>n+s.itemCount,0)} menu items validated.`);
