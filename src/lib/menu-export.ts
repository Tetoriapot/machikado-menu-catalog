import type { MenuDocument, DocumentOptions } from './menu-document.ts';
import { escapeHtml } from './menu-document.ts';

export function menuPlainText(menu: MenuDocument, short = false): string {
  return [menu.name, ...menu.sections.map(section => `【${section.title}】\n${section.items.map(item => `${item.name}　¥${item.price.toLocaleString('ja-JP')}${!short && item.description ? `\n${item.description}` : ''}`).join('\n')}`), menu.priceNote].join('\n\n');
}

export function menuTotal(menu: MenuDocument): number {
  return menu.sections.flatMap(s => s.items).reduce((sum, item) => sum + item.price, 0);
}

// A leading apostrophe prevents user-entered titles being interpreted as spreadsheet formulas.
function csvCell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\s\uFEFF]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function renderMenuCsv(menu: MenuDocument): string {
  const rows: (string | number)[][] = [['店舗名', '分類', '商品名', '税込価格（円）', '説明', '価格の補足']];
  for (const section of menu.sections) for (const item of section.items) rows.push([menu.name, section.title, item.name, item.price, item.description, menu.priceNote]);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function renderMenuJson(menu: MenuDocument): string {
  // Reconstruct the public schema instead of serializing a Shop or session object.
  return JSON.stringify({format: 'machikado-player-menu', version: 1, currency: 'JPY', name: menu.name, priceNote: menu.priceNote, sections: menu.sections.map(s => ({title: s.title, items: s.items.map(i => ({name: i.name, price: i.price, description: i.description}))}))}, null, 2);
}

function wrapText(text: string, width: number, font: number): string[] {
  const lines: string[] = []; let line = ''; let used = 0;
  for (const char of Array.from(text)) {
    if (char === '\r') continue;
    const size = /[\x20-\x7e]/.test(char) ? font * .62 : font;
    if (char === '\n' || (used + size > width && line)) { lines.push(line); line = ''; used = 0; }
    if (char !== '\n') { line += char; used += size; }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

export function renderMenuSvg(menu: MenuDocument, options: DocumentOptions = {}): {svg: string; width: number; height: number} {
  const font = Math.min(28, Math.max(14, options.fontSize ?? 17)) * 1.5;
  const width = options.layout === 'landscape' ? 1400 : 900;
  const columns = options.layout === 'landscape' ? 2 : 1;
  const margin = 55, gap = 48, columnWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const e = escapeHtml; const parts: string[] = [];
  const text = (value: string, x: number, y: number, size: number, color = '#2f432d', anchor = 'start') => parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${e(value)}</text>`);
  text('MENU', width / 2, 55, 18, '#657659', 'middle');
  const titleLines = wrapText(menu.name, width - margin * 2, font * 1.7);
  titleLines.forEach((line, i) => text(line, width / 2, 110 + i * font * 2.2, font * 1.7, '#2f432d', 'middle'));
  const positions = Array.from({length: columns}, () => 145 + titleLines.length * font * 2.2);
  for (const section of menu.sections) {
    const column = positions.indexOf(Math.min(...positions)); const x = margin + column * (columnWidth + gap); let y = positions[column];
    for (const line of wrapText(section.title, columnWidth, font * 1.1)) { text(line, x, y, font * 1.1); y += font * 1.45; }
    parts.push(`<path d="M${x} ${y - 10}h${columnWidth}" stroke="#a3b18f"/>`);
    y += font;
    for (const item of section.items) {
      const price = `¥${item.price.toLocaleString('ja-JP')}`;
      const priceWidth = price.length * font * .64 + 25;
      const lines = wrapText(item.name, columnWidth - priceWidth, font);
      lines.forEach((line, i) => text(line, x, y + i * font * 1.45, font));
      text(price, x + columnWidth, y, font, '#2f432d', 'end');
      y += lines.length * font * 1.45;
      if (item.description) for (const line of wrapText(item.description, columnWidth, font * .8)) { text(line, x, y, font * .8, '#56694b'); y += font * 1.2; }
      y += font * .75;
    }
    positions[column] = y + font;
  }
  let footerY = Math.max(...positions) + 10;
  parts.push(`<path d="M${margin} ${footerY - 25}h${width - margin * 2}" stroke="#cbd5be"/>`);
  for (const line of wrapText(menu.priceNote, width - margin * 2, 18)) { text(line, margin, footerY, 18, '#657659'); footerY += 28; }
  const height = Math.ceil(footerY + 30);
  return {width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(menu.name)}のメニュー"><rect width="100%" height="100%" fill="#fffef7"/><g font-family="Yu Gothic, Hiragino Kaku Gothic ProN, sans-serif">${parts.join('')}</g></svg>`};
}
