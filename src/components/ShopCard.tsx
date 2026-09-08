import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import { categories, locationLabels, priceLabels } from '../data';
import type { ShopSummary } from '../data/types';
import { money, matchingItems } from '../lib/catalog';
import { ShopIcon } from './Icons';

export default function ShopCard({shop,index,saved,onSave,query='',maxItemPrice='',displayName}:{shop:ShopSummary;index:number;saved:boolean;onSave:()=>void;query?:string;maxItemPrice?:string;displayName?:string}) {
  const category=categories.find(c=>c.id===shop.category)!;
  const yen={'very-cheap':'¥',cheap:'¥',normal:'¥¥',expensive:'¥¥¥',luxury:'¥¥¥¥'}[shop.priceLevel];
  const matches=matchingItems(shop,query,maxItemPrice);
  return <article className={`shop-card color-${index%5}`}>
    <div className="card-top"><span className="shop-icon"><ShopIcon name={category.icon} size={25}/></span><span className="category-pill">{category.label}</span><button className={`icon-button ${saved?'saved':''}`} aria-label={`${shop.name}をお気に入り${saved?'から削除':'に追加'}`} aria-pressed={saved} onClick={onSave}><Bookmark size={19} fill={saved?'currentColor':'none'}/></button></div>
    <a href={`#/shop/${shop.id}`} className="shop-title"><h3>{displayName||shop.name}</h3></a>
    {displayName&&displayName!==shop.name&&<p className="original-shop-name">元の店舗：{shop.name}</p>}<div className="shop-meta"><span><MapPin size={13}/>{locationLabels[shop.locationType]}</span><span>{yen}<i>・{priceLabels[shop.priceLevel]}</i></span></div>
    <p className="shop-description">{shop.description}</p><div className="tags">{shop.tags.map(t=><span key={t}>{t}</span>)}</div>
    {query.trim()||maxItemPrice?<div className="search-matches">{matches.length?<><p>見つかった商品 <span>{matches.length}品</span></p>{matches.slice(0,3).map(item=><a key={item.id} href={`#/shop/${shop.id}?item=${item.id}`} aria-label={`${item.name} ${money(item.price)} の詳細へ`}><strong>{item.name}</strong><b>{money(item.price)}</b><ArrowUpRight size={14}/></a>)}</>:<p>店舗名・店舗情報が検索条件に一致</p>}</div>:<div className="menu-preview"><span>{shop.preview[0].name}</span><b>{money(shop.preview[0].price)}</b></div>}
    <div className="card-bottom"><span>{shop.itemCount}品のメニュー</span><a href={`#/shop/${shop.id}`}>メニューを見る<ArrowUpRight size={16}/></a></div>
  </article>;
}
