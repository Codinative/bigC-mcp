import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({
  limit = 50,
  page = 1,
  sort = 'date_created:desc',
}, context: ContextModel) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;;

  logger.info('Tool Called: get_orders');

  try {
    const queryParams = new URLSearchParams();

    if (sort) queryParams.append('sort', sort);
    if (limit) queryParams.append('limit', limit.toString());
    if (page) queryParams.append('page', page.toString());

    const url = `${baseUrl}/${storeHash}/v2/orders?${queryParams.toString()}`;

    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();

    logger.info('Tool Successful: get_orders');
    return data;
  } catch (error) {
    const er = error as Error;
    logger.error('Tool Failed: get_orders', error);
    return { error: `An error occurred while getting orders: ${er.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_orders',
      description: 'Retrieve a paginated list of orders from BigCommerce with sorting support.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Number of results per page. Default: 50.' },
          page: { type: 'integer', description: 'Page number. Default: 1.' },
          sort: { type: 'string', description: 'Sort by field (e.g., "date_created:desc"). Default: "date_created:desc".' },
        },
        required: [],
      },
    },
  },
};

export { apiTool };
