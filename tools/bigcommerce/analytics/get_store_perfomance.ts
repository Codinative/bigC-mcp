import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

async function ordersDetail(orderRes) {
  // in case of error this is returned
  const errorReturn = {
    totalRevenue: 'Not Found',
    totalOrders: 'Not Found',
    avgOrderValue: 'Not Found',
    topCustomer: 'Not Found'
  }

  try {
    const orderText = await orderRes.text()
    if (orderText) {
      const orders = JSON.parse(orderText);

      // Basic metrics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_inc_tax || 0), 0);
      const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

      // Find top customer (by total spend)
      const customerAgg = {};
      for (const o of orders) {
        const cid = o.customer_id;
        if (!cid) continue;
        if (!customerAgg[cid])
          customerAgg[cid] = { id: cid, name: o.billing_address?.first_name || 'Unknown', spend: 0 };
        customerAgg[cid].spend += o.total_inc_tax || 0;
      }

      const topCustomer = Object.values(customerAgg)
        .sort((a, b) => b.spend - a.spend)[0] || null;

      return { totalRevenue, totalOrders, avgOrderValue, topCustomer }
    }
    return errorReturn
  } catch (er) {
    logger.error(`Error: OrderDetails ${er}`)
    return errorReturn
  }
}

async function productsDetail(prodRes) {
  // in case of error this will be returned
  const errorValue = {
    topProduct: 'Not Found'
  }
  try {
    const productsTxt = await prodRes.text()
    if (productsTxt) {
      const products = await JSON.parse(productsTxt);
      const productAgg = {};
      for (const p of products) {
        if (!productAgg[p.product_id])
          productAgg[p.product_id] = { name: p.name, qty: 0, revenue: 0 };
        productAgg[p.product_id].qty += p.quantity;
        productAgg[p.product_id].revenue += p.total_inc_tax;
      }

      const topProduct = Object.values(productAgg)
        .sort((a, b) => b.revenue - a.revenue)[0] || null;

      return {
        topProduct: topProduct
      }
    }
    return errorValue
  } catch (er) {
    logger.error(`Error: ProductsDetail ${er}`)
    return errorValue
  }

}

const executeFunction = async ({
  date_min = '2024-01-01',
  date_max = '2024-12-31'
} = {}) => {
  const baseUrl = 'https://api.bigcommerce.com/stores';
  const token = process.env.BIGCOMMERCE_API_KEY;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  logger.info('Tool Called: get_store_performance');

  try {

    let summary = {}
    // Fetch orders within date range
    const queryParams = new URLSearchParams({
      'min_date_created': date_min,
      'max_date_created': date_max
    });

    const ordersUrl = `${baseUrl}/${storeHash}/v2/orders?${queryParams.toString()}`;
    const headers = {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const orderRes = await fetch(ordersUrl, { method: 'GET', headers });
    if (!orderRes.ok) throw new Error(`HTTP ${orderRes.status}: ${await orderRes.text()}`);
    const orderDetails = await ordersDetail(orderRes)
    summary = {
      ...summary,
      ...orderDetails
    }


    // Fetch products sold (to find top product)
    const productsUrl = `${baseUrl}/${storeHash}/v2/orders/products`;
    const prodRes = await fetch(productsUrl, { method: 'GET', headers });
    if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}: ${await prodRes.text()}`);
    const productDetails = await productsDetail(prodRes)
    // Final summary
    summary = {
      ...summary,
      ...productDetails,
      dateRange: { from: date_min, to: date_max }
    };

    logger.info('Tool Successful: get_store_performance');
    return summary;
  } catch (error) {
    logger.error('Tool Failed: get_store_performance', error);
    return { error: `An error occurred while fetching store performance: ${error.message}` };
  }
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_store_performance',
      description:
        'Fetch an overall performance snapshot of the store — total sales, AOV, top product, and top customer within a date range.',
      parameters: {
        type: 'object',
        properties: {
          date_min: { type: 'string', description: 'Start date (ISO format). Default: 2024-01-01.' },
          date_max: { type: 'string', description: 'End date (ISO format). Default: 2024-12-31.' }
        },
        required: []
      }
    }
  }
};

export { apiTool };
