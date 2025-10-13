import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js'

dotenv.config();

const executeFunction = async ({
  date_min = '2024-01-01T00:00:00Z',
  date_max = '2024-12-31T23:59:59Z',
  group_by = 'day'
} = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: get_sales_report');

  try {
    // Sanitize / ensure proper format
    const formatDate = (d) => new Date(d).toISOString();

    const queryParams = new URLSearchParams({
      min_date_created: formatDate(date_min),
      max_date_created: formatDate(date_max),
      group_by
    });

    const url = `${baseUrl}/${storeHash}/v2/orders?${queryParams.toString()}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();

    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, o) => sum + (o.total_inc_tax || 0), 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    logger.info('Tool Successful: get_sales_report');
    return { totalOrders, totalRevenue, avgOrderValue, date_min, date_max };
  } catch (error) {
    logger.error('Tool Failed: get_sales_report', error);
    return { error: `An error occurred while fetching sales report: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_sales_report',
      description: 'Fetch total revenue, orders, and average order value for a given date range.',
      parameters: {
        type: 'object',
        properties: {
          date_min: { type: 'string', description: 'Start date (ISO format). Default: 2024-01-01.' },
          date_max: { type: 'string', description: 'End date (ISO format). Default: 2024-12-31.' },
          group_by: { type: 'string', description: 'Grouping interval: day, week, month. Default: day.', enum: ['day', 'week', 'month'] }
        },
        required: []
      }
    }
  }
};

export { apiTool };
