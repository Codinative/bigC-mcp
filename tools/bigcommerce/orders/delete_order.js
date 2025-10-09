import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({ order_id } = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: delete_order');

  try {
    if (!order_id) throw new Error('Order ID is required.');

    const url = `${baseUrl}/${storeHash}/v2/orders/${order_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: delete_order');
    return { success: true, message: `Order ${order_id} deleted successfully.` };
  } catch (error) {
    logger.error('Tool Failed: delete_order', error);
    return { error: `An error occurred while deleting order: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'delete_order',
      description: 'Delete an order by ID from BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'integer', description: 'Order ID to delete (required).' },
        },
        required: ['order_id'],
      },
    },
  },
};

export { apiTool };
