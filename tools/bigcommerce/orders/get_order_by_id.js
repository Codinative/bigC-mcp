import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({ order_id } = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: get_order_by_id');

  try {
    if (!order_id) throw new Error('Order ID is required.');

    const url = `${baseUrl}/${storeHash}/v2/orders/${order_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: get_order_by_id');
    return data;
  } catch (error) {
    logger.error('Tool Failed: get_order_by_id', error);
    return { error: `An error occurred while fetching order: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_order_by_id',
      description: 'Retrieve a specific order by its ID from BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'integer', description: 'Order ID to retrieve (required).' },
        },
        required: ['order_id'],
      },
    },
  },
};

export { apiTool };
