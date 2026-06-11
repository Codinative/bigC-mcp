import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({ product_id }:{product_id: string}, context: ContextModel) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  
  const token = context.api_key;
  const storeHash = context.store_hash;

  logger.info('Tool Called: get_product_by_id');

  try {
    const url = `${baseUrl}/${storeHash}/v3/catalog/products/${product_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: get_product_by_id');
    return data;
  } catch (error) {
    const er = error as Error;
    logger.error('Tool Failed: get_product_by_id', error);
    return { error: `An error occurred while fetching product: ${er.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_product_by_id',
      description: 'Retrieve details of a specific product by ID.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', description: 'Product ID to retrieve.' },
        },
        required: ['product_id'],
      },
    },
  },
};

export { apiTool };
