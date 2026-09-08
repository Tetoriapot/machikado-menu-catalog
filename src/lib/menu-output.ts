import { downloadFile } from './download';

export async function downloadMenuPng(svg: string, width: number, height: number, filename: string): Promise<void> {
  // Bound the canvas for devices with modest memory. The SVG remains full resolution.
  const scale = Math.min(1.5, 8000 / Math.max(width, height), Math.sqrt(16_000_000 / (width * height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PNGを作成できません。この端末ではSVGまたはHTMLをご利用ください。');
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {img.onload = () => resolve(); img.onerror = () => reject(new Error('画像を作成できませんでした。SVGまたはHTMLをご利用ください。')); img.src = url;});
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNGの保存に失敗しました。')), 'image/png'));
    downloadFile(blob, filename, 'image/png');
  } finally {URL.revokeObjectURL(url); canvas.width = 0; canvas.height = 0;}
}

export function printMenuHtml(html: string): void {
  const frame = document.createElement('iframe');
  frame.title = '印刷用メニュー';
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:800px;border:0';
  frame.onload = () => {
    const win = frame.contentWindow;
    if (win) {win.addEventListener('afterprint', () => frame.remove(), {once: true}); win.focus(); win.print();}
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 120_000);
}
