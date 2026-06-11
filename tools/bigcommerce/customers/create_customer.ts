import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({ 
    email = '', 
    first_name = '', 
    last_name = '', 
    company = '', 
    phone = '', 
    notes = '', 
    tax_exempt_category = '', 
    customer_group_id = 0 
}, context: ContextModel) => {

  logger.info('Tool Called: create_customer')
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;

  try {
    if (!email || !first_name || !last_name)
      throw new Error('Fields "email", "first_name", and "last_name" are required.');

    const body = {
      email,
      first_name,
      last_name,
      company,
      phone,
      notes,
      tax_exempt_category,
      customer_group_id,
    };

    const url = `${baseUrl}/${storeHash}/v3/customers`;
    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify([body]) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: create_customer')
    return await response.json();
  } catch (error) {
    const er = error as Error;
    logger.error(`Tool Failed: create_customer ${JSON.stringify(error)}`);
    return { error: `An error occurred while creating customer: ${er.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Create a new customer in BigCommerce.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Customer email address.' },
          first_name: { type: 'string', description: 'Customer first name.' },
          last_name: { type: 'string', description: 'Customer last name.' },
          company: { type: 'string', description: 'Company name (optional, defaults to empty string).' },
          phone: { type: 'string', description: 'Phone number (optional, defaults to empty string).' },
          notes: { type: 'string', description: 'Internal notes about the customer (defaults to empty string).' },
          tax_exempt_category: { type: 'string', description: 'Tax exemption category (optional, defaults to empty string).' },
          customer_group_id: { type: 'integer', description: 'Customer group ID (optional, defaults to 0).' },
        },
        required: ['email', 'first_name', 'last_name'],
      },
    },
  },
};

export { apiTool }