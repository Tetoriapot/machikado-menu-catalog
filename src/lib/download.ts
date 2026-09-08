export function safeFilename(value:string){return value.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/,'').slice(0,70)||'menu';}
export function downloadFile(content:BlobPart|Blob,name:string,mime:string){
 const blob=content instanceof Blob?content:new Blob([content],{type:mime});
 const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
