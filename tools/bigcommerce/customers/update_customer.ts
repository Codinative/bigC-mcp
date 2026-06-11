import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';
import { ContextModel } from '../../../types/index.js';

dotenv.config();

interface UpdateCustomersModel {
  customer_id: string
  email: string
  first_name: string
  last_name: string
  company: string
  phone: string
  notes: string
  tax_exempt_category: string
  customer_group_id: string
}

const executeFunction = async ({ 
  customer_id, 
  email, 
  first_name, 
  last_name, 
  company, 
  phone, 
  notes, 
  tax_exempt_category, 
  customer_group_id 
}: UpdateCustomersModel, context: ContextModel) => {

  logger.info('Tool Called: update_customer')
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.store_hash;

  try {
    if (!customer_id) throw new Error('Customer ID is required.');

    const body = {
      id: customer_id,
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

    const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify([body]) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    logger.info('Tool Successful: update_customer')
    return await response.json();
  } catch (error) {
    const er = error as Error;
    logger.error(`Tool Failed: ${error}`);
    return { error: `An error occurred while updating customer: ${er.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'update_customer',
      description: 'Update an existing customer in BigCommerce by ID.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'ID of the customer to update.' },
          email: { type: 'string', description: 'Customer email address.' },
          first_name: { type: 'string', description: 'Customer first name.' },
          last_name: { type: 'string', description: 'Customer last name.' },
          company: { type: 'string', description: 'Company name (optional).' },
          phone: { type: 'string', description: 'Phone number (optional).' },
          notes: { type: 'string', description: 'Internal notes about the customer.' },
          tax_exempt_category: { type: 'string', description: 'Tax exemption category (if applicable).' },
          customer_group_id: { type: 'integer', description: 'ID of customer group (optional).' },
        },
        required: ['customer_id'],
      },
    },
  },
};

export { apiTool };
