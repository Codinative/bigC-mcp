import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({
  customer_id
} = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: get_customer_lifetime_value');

  try {
    const url = `${baseUrl}/${storeHash}/v2/orders?customer_id=${customer_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const orders = await response.json();
    const totalSpend = orders.reduce((sum, o) => sum + (o.total_inc_tax || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount ? totalSpend / orderCount : 0;

    logger.info('Tool Successful: get_customer_lifetime_value');
    return { customer_id, totalSpend, orderCount, avgOrderValue };
  } catch (error) {
    logger.error('Tool Failed: get_customer_lifetime_value', error);
    return { error: `An error occurred while calculating CLV: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_customer_lifetime_value',
      description: 'Calculate the total spend, number of orders, and average order value for a customer.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'Customer ID to calculate lifetime value for.' }
        },
        required: ['customer_id']
      }
    }
  }
};

export { apiTool };
