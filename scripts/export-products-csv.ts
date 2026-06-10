// Export all BigCommerce products to CSV (products.csv in project root)
import fs from 'fs';

const BASE_URL = 'https://api.bigcommerce.com/stores';
const API_TOKEN = process.env.BIGCOMMERCE_API_KEY;
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH;

if (!API_TOKEN || !STORE_HASH) {
  console.error('Missing BIGCOMMERCE_API_KEY or BIGCOMMERCE_STORE_HASH');
  process.exit(1);
}


async function fetchPage(page, limit) {
  const url = `${BASE_URL}/${STORE_HASH}/v3/catalog/products?page=${page}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': API_TOKEN,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
}

function toCsv(items) {
  const columns = [
    'id',
    'name',
    'sku',
    'price',
    'availability',
    'is_visible',
    'inventory_level'
  ];

  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value).replace(/"/g, '""');
    return `"${s}"`;
  };

  const header = columns.join(',');
  const rows = items.map((p) => columns.map((c) => escapeCell(p[c])).join(','));
  return [header, ...rows].join('\n');
}

async function main() {
  let page = 1;
  const limit = 250; // BigCommerce max per page is 250
  const all = [];

  for (; ;) {
    const json = await fetchPage(page, limit);
    const data = json?.data || [];
    all.push(...data);

    const pag = json?.meta?.pagination;
    if (!pag || page >= pag.total_pages) break;
    page += 1;
  }

  const csv = toCsv(all);
  fs.writeFileSync('products.csv', csv);
  console.log(`Wrote products.csv with ${all.length} rows`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});


