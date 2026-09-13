import type { Currency } from '../data/types.ts';
// Integer storage: yen, old British pence, or US cents. No exchange-rate conversion.
export const currencyUnit=(currency:Currency='JPY')=>currency==='USD'?'セント':currency==='GBP-predecimal'?'ペンス':'円';
export function money(value:number,currency:Currency='JPY'):string{
 if(currency==='USD')return `$${(value/100).toFixed(2)}`;
 if(currency==='GBP-predecimal'){
  const pounds=Math.floor(value/240),shillings=Math.floor(value%240/12),pence=value%12;
  return [pounds?`£${pounds}`:'',shillings?`${shillings}s`:'',pence||(!pounds&&!shillings)?`${pence}d`:''].filter(Boolean).join(' ');
 }
 return `¥${value.toLocaleString('ja-JP')}`;
}
