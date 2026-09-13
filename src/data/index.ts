import data from './generated-index.json';
import type { Category, Shop, ShopSummary, PriceLevel, LocationType, Era, ShopScale } from './types';
export const shops = data.shops as ShopSummary[];
export const categories = data.categories as Category[];
export const itemCount = data.itemCount;
export const priceLabels: Record<PriceLevel,string> = {'very-cheap':'激安',cheap:'安い',normal:'普通',expensive:'やや高い',luxury:'高級'};
export const locationLabels: Record<LocationType,string> = {city:'都心',suburb:'郊外','local-city':'地方都市',rural:'田舎',station:'駅前','shopping-street':'商店街',tourist:'観光地'};
export { eraLabels } from './eras';
export const scaleLabels: Record<ShopScale,string> = {independent:'個人店','small-chain':'小規模チェーン風','national-chain':'全国チェーン風',upscale:'高級店'};
const menuCache = new Map<string, Shop[]>();
export async function loadShop(id:string, signal?:AbortSignal):Promise<Shop>{
 const summary=shops.find(s=>s.id===id);
 if(!summary)throw new Error('店舗が見つかりません。');
 let rows=menuCache.get(summary.category);
 if(!rows){const response=await fetch(`${import.meta.env.BASE_URL}data/${summary.category}.json`,{signal});if(!response.ok)throw new Error('メニューを読み込めませんでした。接続を確認して再試行してください。');const body=await response.json() as {shops:Shop[]};rows=body.shops;menuCache.set(summary.category,rows);}
 const shop=rows.find(s=>s.id===id);if(!shop)throw new Error('店舗が見つかりません。');return shop;
}
