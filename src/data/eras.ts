import type { Era, Currency } from './types.ts';
export const eraLabels:Record<Era,string>={modern:'現代',heisei:'平成',showa:'昭和',victorian:'ヴィクトリア朝イギリス','america-1920s':'1920年代のアメリカ'};
export const eraCurrencies:Record<Era,Currency>={modern:'JPY',heisei:'JPY',showa:'JPY',victorian:'GBP-predecimal','america-1920s':'USD'};
