/**
 * Function to get all customers from the API with optional filtering.
 *
 */
import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

export const get_customers = async ({
  limit = 50,
  page = 1,
  sort = 'date_created:desc', // Default: newest customers first
  include = 'addresses'       // Default: include addresses info
} = {}, context: ContextModel) => {

    logger.info('Tool Called: get_customers')
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const storeHash = context.api_key;
  const token = context.store_hash;

  try {
    // Build query parameters dynamically
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('page', page.toString());
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);

    // Construct the full API URL
    const url = `${baseUrl}/${storeHash}/v3/customers?${queryParams.toString()}`;

    // Fetch customers from BigCommerce API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch customers (${response.status}): ${errorText}`);
    }

    logger.info('Tool Successful: get_customer')
    return await response.json();
  } catch (error) {
    const err = error as Error;
    logger.error(`Tool Failed: ${error}`);
    return { error: err.message };
  }
};


// ------------------------------
// Tool Definition
// ------------------------------
const apiTool = {
  function: get_customers,
  definition: {
    type: 'function',
    function: {
      name: 'get_customers',
      description: 'Get all customers from the BigCommerce API with optional sorting, inclusion, and pagination. Store hash and API key are automatically retrieved from environment variables.',
      parameters: {
        type: 'object',
        properties: {
          sort: {
            type: 'string',
            description: 'Sort field and direction (default: "date_created:desc").',
            default: 'date_created:desc',
          },
          include: {
            type: 'string',
            description: 'Include additional customer sub-resources (default: "addresses").',
            default: 'addresses',
          },
          limit: {
            type: 'integer',
            description: 'Number of results to return (max 250, default 50).',
            default: 50,
          },
          page: {
            type: 'integer',
            description: 'Page number for pagination (default 1).',
            default: 1,
          },
        },
        required: [],
      },
    },
  },
};


export { apiTool };
