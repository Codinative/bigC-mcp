import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({ product_id }: {product_id: string}, context: ContextModel) => {

  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;

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
    const er = error as Error;
    logger.error('Tool Failed: delete_product', error);
    return { error: `An error occurred while deleting product: ${er.message}` };
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
