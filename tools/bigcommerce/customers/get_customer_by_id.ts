import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({ customer_id, include } = {}) => {
    logger.info('Tool Called: get_customer_by_id')
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  try {
    if (!customer_id) throw new Error('Customer ID is required.');

    const queryParams = new URLSearchParams();
    if (include) queryParams.append('include', include);

    const url = `${baseUrl}/${storeHash}/v3/customers/${customer_id}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: get_customer_by_id')
    return await response.json();
  } catch (error) {
    logger.error(`Tool Called: ${error}`);
    return { error: `An error occurred while getting customer: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_customer_by_id',
      description: 'Get a specific customer by their ID from the BigCommerce API.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'Customer ID to retrieve.' },
          include: { type: 'string', description: 'Optional related resources to include (addresses, storecredit, attributes, formfields).' },
        },
        required: ['customer_id'],
      },
    },
  },
};

export { apiTool };