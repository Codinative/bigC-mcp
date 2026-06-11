import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

interface SearchProductModel{
  keyword: string
  limit: number
  page: number
}

const executeFunction = async ({
  keyword = '',
  limit = 50,
  page = 1,
}: SearchProductModel, context: ContextModel) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;

  logger.info('Tool Called: search_products');

  try {
    const queryParams = new URLSearchParams({ keyword, limit: limit.toString(), page: page.toString() });
    const url = `${baseUrl}/${storeHash}/v3/catalog/products?${queryParams.toString()}`;

    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: search_products');
    return data;
  } catch (error) {
    const er = error as Error;
    logger.error('Tool Failed: search_products', error);
    return { error: `An error occurred while searching products: ${er.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products by keyword or SKU in BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search keyword for product name or SKU.' },
          limit: { type: 'integer', description: 'Results per page. Default: 50.' },
          page: { type: 'integer', description: 'Page number. Default: 1.' },
        },
        required: [],
      },
    },
  },
};

export { apiTool };
