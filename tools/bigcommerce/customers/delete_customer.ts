import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({ customer_id } = {}) => {
    logger.info('Tool Called: delete_customer')
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  try {
    if (!customer_id) throw new Error('Customer ID is required.');

    const url = `${baseUrl}/${storeHash}/v3/customers?id:in=${customer_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: delete_customer')
    return { success: true, message: `Customer ${customer_id} deleted successfully.` };
  } catch (error) {
    logger.error(`Tool Failed: ${error}`);
    return { error: `An error occurred while deleting customer: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'delete_customer',
      description: 'Delete a customer by ID from BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'ID of the customer to delete.' },
        },
        required: ['customer_id'],
      },
    },
  },
};

export { apiTool };
