/**
 * Function to get all orders from the BigCommerce API.
 *
 * @param {Object} args - Arguments for the request.
 * @param {string} [args.store_Hash] - Optional store hash. If not provided, uses BIGCOMMERCE_STORE_HASH from environment.
 * @param {number} [args.customer_id] - Filter orders by specific customer ID.
 * @param {string} [args.email] - Filter orders by customer email.
 * @param {number} [args.status_id] - Filter orders by status ID.
 * @param {number} [args.min_id] - Minimum order ID.
 * @param {number} [args.max_id] - Maximum order ID.
 * @param {number} [args.min_total] - Minimum order total amount.
 * @param {number} [args.max_total] - Maximum order total amount.
 * @param {string} [args.min_date_created] - Minimum date created (ISO 8601 format).
 * @param {string} [args.max_date_created] - Maximum date created (ISO 8601 format).
 * @param {string} [args.min_date_modified] - Minimum date modified (ISO 8601 format).
 * @param {string} [args.max_date_modified] - Maximum date modified (ISO 8601 format).
 * @param {number} [args.channel_id] - Filter by channel ID.
 * @param {string} [args.payment_method] - Filter by payment method.
 * @param {string} [args.cart_id] - Filter by cart ID.
 * @param {string} [args.external_order_id] - Filter by external order ID.
 * @param {string} [args.sort] - Sort field and direction (e.g., 'date_created:desc').
 * @param {number} [args.limit] - Number of results to return (default: 50).
 * @param {number} [args.page] - Page to return (default: 1).
 * @returns {Promise<Object>} - The result of the API call.
 */

import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({
  customer_id = '',
  email = '',
  status_id = 0,
  min_id = 0,
  max_id = 0,
  min_total = 0,
  max_total = 0,
  min_date_created = '',
  max_date_created = '',
  min_date_modified = '',
  max_date_modified = '',
  channel_id = '',
  payment_method = '',
  cart_id = '',
  external_order_id = '',
  sort = '',
  limit = 50,
  page = 1
} = {}, context: ContextModel) => {
  
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const apiKey = context.api_key;
  const storeHash = context.store_hash;

  logger.info('Tool Called: search_orders');

  try {
    const queryParams = new URLSearchParams();

    if (customer_id) queryParams.append('customer_id', customer_id.toString());
    if (email) queryParams.append('email', email);
    if (status_id) queryParams.append('status_id', status_id.toString());
    if (min_id) queryParams.append('min_id', min_id.toString());
    if (max_id) queryParams.append('max_id', max_id.toString());
    if (min_total) queryParams.append('min_total', min_total.toString());
    if (max_total) queryParams.append('max_total', max_total.toString());
    if (min_date_created) queryParams.append('min_date_created', min_date_created);
    if (max_date_created) queryParams.append('max_date_created', max_date_created);
    if (min_date_modified) queryParams.append('min_date_modified', min_date_modified);
    if (max_date_modified) queryParams.append('max_date_modified', max_date_modified);
    if (channel_id) queryParams.append('channel_id', channel_id.toString());
    if (payment_method) queryParams.append('payment_method', payment_method);
    if (cart_id) queryParams.append('cart_id', cart_id);
    if (external_order_id) queryParams.append('external_order_id', external_order_id);
    if (sort) queryParams.append('sort', sort);
    if (limit) queryParams.append('limit', limit.toString());
    if (page) queryParams.append('page', page.toString());

    const url = `${baseUrl}/${storeHash}/v2/orders${
      queryParams.toString() ? '?' + queryParams.toString() : ''
    }`;

    const headers = {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      throw new Error(JSON.stringify(errorData));
    }

    const responseText = await response.text();

    if (!responseText || responseText.trim() === '') {
      logger.info('Tool Successful: search_orders (no results)');
      return { data: [], meta: { total: 0 } };
    }

    const data = JSON.parse(responseText);
    logger.info('Tool Successful: search_orders');
    return data;
  } catch (error) {
    logger.error('Tool Failed: search_orders', error);
    return {
      error: `An error occurred while searching orders: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }`,
    };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'search_orders',
      description:
        'Search BigCommerce orders using flexible filters. All fields are optional so the AI can search by any criteria, including email, customer_id, totals, or date ranges.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: {
            type: 'integer',
            description: 'Filter by customer ID (optional, default: null).',
          },
          email: {
            type: 'string',
            description: 'Filter by customer email address (optional, default: null).',
          },
          status_id: {
            type: 'integer',
            description: 'Filter by order status ID (optional, default: null).',
          },
          min_id: {
            type: 'integer',
            description: 'Minimum order ID for filtering (optional, default: null).',
          },
          max_id: {
            type: 'integer',
            description: 'Maximum order ID for filtering (optional, default: null).',
          },
          min_total: {
            type: 'number',
            description: 'Minimum order total for filtering (optional, default: null).',
          },
          max_total: {
            type: 'number',
            description: 'Maximum order total for filtering (optional, default: null).',
          },
          min_date_created: {
            type: 'string',
            description:
              'Filter for orders created after this date (ISO 8601 format, optional, default: null).',
          },
          max_date_created: {
            type: 'string',
            description:
              'Filter for orders created before this date (ISO 8601 format, optional, default: null).',
          },
          min_date_modified: {
            type: 'string',
            description:
              'Filter for orders modified after this date (ISO 8601 format, optional, default: null).',
          },
          max_date_modified: {
            type: 'string',
            description:
              'Filter for orders modified before this date (ISO 8601 format, optional, default: null).',
          },
          channel_id: {
            type: 'integer',
            description: 'Filter by sales channel ID (optional, default: null).',
          },
          payment_method: {
            type: 'string',
            description:
              'Filter by payment method (e.g., "credit_card", "paypal", optional, default: null).',
          },
          cart_id: {
            type: 'string',
            description: 'Filter by cart ID (optional, default: null).',
          },
          external_order_id: {
            type: 'string',
            description: 'Filter by external order ID (optional, default: null).',
          },
          sort: {
            type: 'string',
            description:
              'Sort field and direction (e.g., "date_created:desc", "id:asc", optional, default: null).',
          },
          limit: {
            type: 'integer',
            description: 'Number of results per page (optional, default: 50).',
          },
          page: {
            type: 'integer',
            description: 'Page number for pagination (optional, default: 1).',
          },
        },
        required: [],
      },
    },
  },
};

export { apiTool };
