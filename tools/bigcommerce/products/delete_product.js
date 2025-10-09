import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({ product_id } = {}) => {

  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: delete_product');

  try {
    const url = `${baseUrl}/${storeHash}/v3/catalog/products/${product_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: delete_product');
    return { success: true, message: `Product ${product_id} deleted successfully.` };
  } catch (error) {
    logger.error('Tool Failed: delete_product', error);
    return { error: `An error occurred while deleting product: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'delete_product',
      description: 'Delete a product from BigCommerce by ID.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', description: 'Product ID to delete.' },
        },
        required: ['product_id'],
      },
    },
  },
};

export { apiTool };
