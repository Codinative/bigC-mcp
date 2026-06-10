import customerTools from './bigcommerce/customers/path.js'
import productTools from './bigcommerce/products/path.js'
import orderTools from './bigcommerce/orders/path.js'
import analyticTools from './bigcommerce/analytics/path.js'

export const toolPaths = [
  ...productTools,
  ...customerTools,
  ...orderTools,
  ...analyticTools
];
