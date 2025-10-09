/**
 * Function to get all customers from the API with optional filtering.
 *
 * @param {Object} args - Arguments for the request.
 * @param {string} [args.id] - Filter by customer IDs (comma-separated).
 * @param {string} [args.email] - Filter by customer email address.
 * @param {string} [args.name] - Filter by customer name (exact match).
 * @param {string} [args.name_like] - Filter by customer name (partial match).
 * @param {string} [args.company] - Filter by company name.
 * @param {string} [args.phone] - Filter by phone number.
 * @param {string} [args.customer_group_id] - Filter by customer group ID.
 * @param {string} [args.registration_ip_address] - Filter by registration IP address.
 * @param {string} [args.date_created] - Filter by exact customer creation date.
 * @param {string} [args.date_created_min] - Filter customers created after this date.
 * @param {string} [args.date_created_max] - Filter customers created before this date.
 * @param {string} [args.date_modified] - Filter by exact customer modification date.
 * @param {string} [args.date_modified_min] - Filter customers modified after this date.
 * @param {string} [args.date_modified_max] - Filter customers modified before this date.
 * @param {string} [args.sort] - Sort field and direction (e.g., 'date_created:desc').
 * @param {string} [args.include] - Include additional resources (addresses, storecredit, attributes).
 * @param {number} [args.limit] - Number of results to return (max 250, default 50).
 * @param {number} [args.page] - Page number for pagination (default 1).
 * @returns {Promise<Object>} - The result of the API call to get all customers.
 */
import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

// Load environment variables
dotenv.config();

const executeFunction = async ({
  id = '',
  email = '',
  name = '',
  name_like = '',
  company = '',
  phone = '',
  customer_group_id = '',
  registration_ip_address = '',
  date_created = '',
  date_created_min = '',
  date_created_max = '',
  date_modified = '',
  date_modified_min = '',
  date_modified_max = '',
  sort = 'date_created:desc',
  include = 'addresses,storecredit,attributes,formfields',
  limit = 50,
  page = 1
} = {}) => {

  logger.info(`Tool Called: search_customers & params: ${ {name, email, name_like}}`)

  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  try {
    const queryParams = new URLSearchParams();

    if (id) queryParams.append('id:in', id);
    if (email) queryParams.append('email:in', email);
    if (name) queryParams.append('name:in', name);
    if (name_like) queryParams.append('name:like', name_like);
    if (company) queryParams.append('company:in', company);
    if (phone) queryParams.append('phone:in', phone);
    if (customer_group_id) queryParams.append('customer_group_id:in', customer_group_id.toString());
    if (registration_ip_address) queryParams.append('registration_ip_address:in', registration_ip_address);
    if (date_created) queryParams.append('date_created', date_created);
    if (date_created_min) queryParams.append('date_created:min', date_created_min);
    if (date_created_max) queryParams.append('date_created:max', date_created_max);
    if (date_modified) queryParams.append('date_modified', date_modified);
    if (date_modified_min) queryParams.append('date_modified:min', date_modified_min);
    if (date_modified_max) queryParams.append('date_modified:max', date_modified_max);
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);
    if (limit) queryParams.append('limit', limit.toString());
    if (page) queryParams.append('page', page.toString());

    const url = `${baseUrl}/${storeHash}/v3/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText.substring(0, 500));
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();

    if (responseText.trim().startsWith('<')) {
      const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
      const errorTitle = titleMatch ? titleMatch[1] : 'Unknown error';
      throw new Error(`BigCommerce API Error: ${errorTitle}`);
    }

    logger.info('Tool Successful: search_customers')
    const data = JSON.parse(responseText);
    return data;
  } catch (error) {
    logger.error(`Tool Failed: search_customers`);
    return {
      error: `An error occurred while getting all customers: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    };
  }
};


const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'search_customers',
      description:
        'Get all customers from the BigCommerce API with optional filters. Each field has a default value so the agent can modify only the needed ones.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', default: '', description: 'Customer IDs (comma-separated, default = none)' },
          email: { type: 'string', default: '', description: 'Customer email (default = none)' },
          name: { type: 'string', default: '', description: 'Full name (default = none)' },
          name_like: { type: 'string', default: '', description: 'Partial match for name (default = none)' },
          company: { type: 'string', default: '', description: 'Company name (default = none)' },
          phone: { type: 'string', default: '', description: 'Phone number (default = none)' },
          customer_group_id: { type: 'string', default: '', description: 'Customer group ID(s), comma-separated (default = none)' },
          registration_ip_address: { type: 'string', default: '', description: 'Registration IP (default = none)' },
          date_created: { type: 'string', default: '', description: 'Exact creation date (default = none)' },
          date_created_min: { type: 'string', default: '', description: 'Created after (default = none)' },
          date_created_max: { type: 'string', default: '', description: 'Created before (default = none)' },
          date_modified: { type: 'string', default: '', description: 'Exact modification date (default = none)' },
          date_modified_min: { type: 'string', default: '', description: 'Modified after (default = none)' },
          date_modified_max: { type: 'string', default: '', description: 'Modified before (default = none)' },
          sort: { type: 'string', default: 'date_created:desc', description: 'Sort order (default = date_created:desc)' },
          include: { type: 'string', default: 'addresses,storecredit,attributes,formfields', description: 'Extra resources to include (default = all common subresources)' },
          limit: { type: 'integer', default: 50, description: 'Results per page (default = 50)' },
          page: { type: 'integer', default: 1, description: 'Page number (default = 1)' }
        },
        required: []
      }
    }
  }
};

export { apiTool };