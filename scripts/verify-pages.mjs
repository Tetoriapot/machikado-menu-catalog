import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

// Validate the actual build for both account sites and project subdirectories.
// No GitHub account, production connection, or development server is needed.
const dist = resolve('dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const index = JSON.parse(await readFile('src/data/generated-index.json', 'utf8'));
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => match[1]).filter(url => !/^(?:[a-z]+:|#|\/\/)/i.test(url));
assert.ok(references.some(url => /\.js(?:\?|$)/.test(url)), 'JavaScript entry is missing');
assert.ok(references.some(url => /\.css(?:\?|$)/.test(url)), 'Stylesheet is missing');

async function checkLocalFile(reference, site) {
  const url = new URL(reference, site);
  assert.equal(url.origin, site.origin);
  assert.ok(url.pathname.startsWith(site.pathname), `URL escapes the repository path: ${reference}`);
  const path = resolve(dist, decodeURIComponent(url.pathname.slice(site.pathname.length)));
  const fromDist = relative(dist, path);
  assert.ok(fromDist && fromDist !== '..' && !fromDist.startsWith(`..${sep}`), `Invalid asset: ${reference}`);
  const content = await readFile(path);
  assert.ok(content.length > 0, `Empty asset: ${reference}`);
  return content;
}

for (const pathname of ['/', '/machikado-menu-catalog/']) {
  const site = new URL(`https://example.github.io${pathname}`);
  for (const reference of references) await checkLocalFile(reference, site);
  const ids = [];
  let itemCount = 0;
  for (const category of index.categories) {
    const data = JSON.parse(await checkLocalFile(`data/${category.id}.json`, site));
    assert.equal(data.category.id, category.id);
    for (const shop of data.shops) {
      ids.push(shop.id);
      itemCount += shop.menuSections.reduce((count, section) => count + section.items.length, 0);
      // Shared shop and PL routes stay on index.html; no server rewrite is needed.
      for (const route of [`#/shop/${shop.id}`, `#/menu/${shop.id}`]) {
        const link = new URL(route, site);
        assert.equal(link.pathname, site.pathname);
        assert.equal(link.hash, route);
      }
    }
  }
  assert.deepEqual(ids.sort(), index.shops.map(shop => shop.id).sort());
  assert.equal(itemCount, index.itemCount);
  console.log(`Pages path ${pathname}: ${ids.length} shops, ${itemCount} items, assets and shared URLs verified.`);
}

// Only static build output is uploaded by pages.yml.
const topLevel = await readdir(dist);
for (const forbidden of ['.git', '.openai', '.env', 'node_modules', 'src']) {
  assert.ok(!topLevel.includes(forbidden), `Unexpected private/source directory in dist: ${forbidden}`);
}
