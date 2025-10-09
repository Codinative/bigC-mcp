import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({
  order_id,
  status_id = null,
  customer_message = null,
  staff_notes = null,
  billing_address = null,
  shipping_addresses = null,
  external_id = null,
  external_source = null,
  custom_fields = null
} = {}) => {

  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: update_order');

  try {
    if (!order_id) throw new Error('Order ID is required.');

    const url = `${baseUrl}/${storeHash}/v2/orders/${order_id}`;
    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Build request body dynamically to include only provided fields
    const body = {};
    if (status_id !== null) body.status_id = status_id;
    if (customer_message !== null) body.customer_message = customer_message;
    if (staff_notes !== null) body.staff_notes = staff_notes;
    if (billing_address !== null) body.billing_address = billing_address;
    if (shipping_addresses !== null) body.shipping_addresses = shipping_addresses;
    if (external_id !== null) body.external_id = external_id;
    if (external_source !== null) body.external_source = external_source;
    if (custom_fields !== null) body.custom_fields = custom_fields;

    if (Object.keys(body).length === 0)
      throw new Error('At least one field must be provided to update the order.');

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    logger.info('Tool Successful: update_order');
    return data;
  } catch (error) {
    logger.error('Tool Failed: update_order', error);
    return { error: `An error occurred while updating the order: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'update_order',
      description:
        'Update an existing order in BigCommerce. Can modify status, messages, addresses, custom fields, and more.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'integer', description: 'Order ID to update (required).' },
          status_id: {
            type: 'integer',
            description: 'Order status ID to set (optional, default: null).',
          },
          customer_message: {
            type: 'string',
            description: 'Message from the customer (optional, default: null).',
          },
          staff_notes: {
            type: 'string',
            description: 'Internal notes for staff (optional, default: null).',
          },
          billing_address: {
            type: 'object',
            description: 'Updated billing address object (optional, default: null).',
          },
          shipping_addresses: {
            type: 'array',
            description: 'Updated shipping addresses array (optional, default: null).',
            items: { type: 'object' },
          },
          external_id: {
            type: 'string',
            description: 'External system ID for syncing (optional, default: null).',
          },
          external_source: {
            type: 'string',
            description: 'External source name for syncing (optional, default: null).',
          },
          custom_fields: {
            type: 'array',
            description: 'Array of custom fields (optional, default: null).',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
              },
            },
          },
        },
        required: ['order_id'],
      },
    },
  },
};

export { apiTool };