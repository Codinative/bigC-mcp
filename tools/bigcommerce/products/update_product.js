import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';


dotenv.config();

const executeFunction = async ({
  product_id,
  name = null,
  price = null,
  weight = null,
  sku = null,
  inventory_tracking = null,
} = {}) => {
    
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: update_product');

  try {
    const url = `${baseUrl}/${storeHash}/v3/catalog/products/${product_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (weight) updateData.weight = weight;
    if (sku) updateData.sku = sku;
    if (inventory_tracking) updateData.inventory_tracking = inventory_tracking;

    const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(updateData) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: update_product');
    return data;
  } catch (error) {
    logger.error('Tool Failed: update_product', error);
    return { error: `An error occurred while updating product: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Update product details by product ID.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', description: 'Product ID to update.' },
          name: { type: 'string', description: 'New product name (optional).' },
          price: { type: 'number', description: 'New product price (optional).' },
          weight: { type: 'number', description: 'New product weight (optional).' },
          sku: { type: 'string', description: 'New SKU (optional).' },
          inventory_tracking: { type: 'string', description: 'New inventory tracking type (optional).' },
        },
        required: ['product_id'],
      },
    },
  },
};

export { apiTool };
