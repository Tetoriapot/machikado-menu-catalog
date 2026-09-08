import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
export default function FilterSelect({label,value,options,onChange}:{label:string;value:string;options:Record<string,string>;onChange:(value:string)=>void}){
 const items=[{value:'all',label:`すべての${label}`},...Object.entries(options).map(([value,label])=>({value,label}))];
 return <Select value={value} onValueChange={v=>onChange(v??'all')} items={items}><SelectTrigger aria-label={label} className={`filter-select ${value!=='all'?'is-filtered':''}`}><SelectValue>{value==='all'?label:options[value]}</SelectValue></SelectTrigger><SelectContent align="start" alignItemWithTrigger={false}>{items.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>;
}
