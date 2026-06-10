import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({
  limit = 10,
  sort_by = 'revenue'
} = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: get_top_products');

  try {
    const url = `${baseUrl}/${storeHash}/v2/orders/products`;

    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();

    const aggregated = {};
    for (const item of data) {
      const id = item.product_id;
      if (!aggregated[id]) aggregated[id] = { id, name: item.name, qty: 0, revenue: 0 };
      aggregated[id].qty += item.quantity;
      aggregated[id].revenue += item.total_inc_tax;
    }

    const sorted = Object.values(aggregated)
      .sort((a, b) => b[sort_by] - a[sort_by])
      .slice(0, limit);

    logger.info('Tool Successful: get_top_products');
    return sorted;
  } catch (error) {
    logger.error('Tool Failed: get_top_products', error);
    return { error: `An error occurred while getting top products: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_top_products',
      description: 'Get top-selling products by quantity or revenue.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Number of products to return. Default: 10.' },
          sort_by: { type: 'string', description: 'Sort by "qty" or "revenue". Default: "revenue".', enum: ['qty', 'revenue'] }
        },
        required: []
      }
    }
  }
};

export { apiTool };
