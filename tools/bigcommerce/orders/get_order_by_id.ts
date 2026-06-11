import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({ order_id }:{order_id: string}, context: ContextModel) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;

  logger.info('Tool Called: get_order_by_id');

  try {
    if (!order_id) throw new Error('Order ID is required.');

    const url = `${baseUrl}/${storeHash}/v2/orders/${order_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: get_order_by_id');
    return data;
  } catch (error) {
    const er = error as Error;
    logger.error('Tool Failed: get_order_by_id', error);
    return { error: `An error occurred while fetching order: ${er.message}` };
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
