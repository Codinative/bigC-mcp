import customerTools from './bigcommerce/customers/path.js'
import productTools from './bigcommerce/products/path.js'
import orderTools from './bigcommerce/orders/path.js'

export const toolPaths = [
  ...productTools,
  ...customerTools,
  ...orderTools,
];
