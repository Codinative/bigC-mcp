import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js'
import { ContextModel } from '../../../types/index.js';

dotenv.config();

const executeFunction = async ({
  date_min = '2024-01-01T00:00:00Z',
  date_max = '2024-12-31T23:59:59Z',
  group_by = 'day' // keep this for local grouping, not API
} = {}, context: ContextModel) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = context.api_key;
  const storeHash = context.api_key;

  logger.info(`Tool Called: get_sales_report Params: ${date_min} ${date_max} ${group_by}`);

  try {
    const formatDate = (d: string) => new Date(d).toISOString();

    const queryParams = new URLSearchParams({
      min_date_created: formatDate(date_min),
      max_date_created: formatDate(date_max),
      limit: '250'
    });

    const url = `${baseUrl}/${storeHash}/v2/orders?${queryParams.toString()}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const text = await response.text()
    if(!text){
      logger.info('Tool Successful: Empty response returned')
      return 'No sales found on the given date';
    } 

    const data = JSON.parse(text);

    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum: number, o: {total_inc_tax: number}) => sum + (o.total_inc_tax || 0), 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    // Optional: group orders by day/week/month manually
    const grouped: Record<string, {orders: number, revenue: number}> = {};
    if (group_by) {
      data.forEach((order: {date_created: string, total_inc_tax: number}) => {
        const date = new Date(order.date_created);
        let key = '';
        if (group_by === 'day') key = date.toISOString().split('T')[0];
        else if (group_by === 'week') key = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
        else if (group_by === 'month') key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!grouped[key]) grouped[key] = { orders: 0, revenue: 0 };
        grouped[key].orders += 1;
        grouped[key].revenue += order.total_inc_tax || 0;
      });
    }

    logger.info('Tool Successful: get_sales_report');
    return { totalOrders, totalRevenue, avgOrderValue, grouped, date_min, date_max };
  } catch (error) {
    const err = error as Error
    logger.error(`Tool Failed: get_sales_report ${error}`);
    return { error: `An error occurred while fetching sales report: ${err.message}` };
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
