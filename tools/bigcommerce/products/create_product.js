import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({
  name,
  type = 'physical',
  price = 0,
  weight = 0,
  sku = '',
  inventory_tracking = 'none',
} = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: create_product');

  try {
    const url = `${baseUrl}/${storeHash}/v3/catalog/products`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const body = JSON.stringify({
      name,
      type,
      price,
      weight,
      sku,
      inventory_tracking,
    });

    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: create_product');
    return data;
  } catch (error) {
    logger.error('Tool Failed: create_product', error);
    return { error: `An error occurred while creating product: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'create_product',
      description: 'Create a new product in BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name.' },
          type: { type: 'string', description: 'Product type (default: physical).' },
          price: { type: 'number', description: 'Product price (default: 0).' },
          weight: { type: 'number', description: 'Product weight (default: 0).' },
          sku: { type: 'string', description: 'Optional SKU (default: empty string).' },
          inventory_tracking: { type: 'string', description: 'Inventory tracking type (default: none).' },
        },
        required: ['name'],
      },
    },
  },
};

export { apiTool };
