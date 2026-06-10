import dotenv from 'dotenv';
import logger from '../../../scripts/logger.js';

dotenv.config();

const executeFunction = async ({
    limit = 50,
    page = 1,
    sort = 'id',
    direction = 'desc'
} = {}, context) => {
    const baseUrl = 'https://api.bigcommerce.com/stores';
    const token = context.api_key;
    const storeHash = context.store_hash;

    logger.info('Tool Called: get_products');

    try {
        const queryParams = new URLSearchParams({ limit, page, sort, direction });
        const url = `${baseUrl}/${storeHash}/v3/catalog/products?${queryParams.toString()}`;

        const headers = {
            'X-Auth-Token': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

        const data = await response.json();
        logger.info('Tool Successful: get_products');
        return data;
    } catch (error) {
        logger.error('Tool Failed: get_products', error);
        return { error: `An error occurred while fetching products: ${error.message}` };
    }
};

const apiTool = {
    function: executeFunction,
    definition: {
        type: 'function',
        function: {
            name: 'get_products',
            description: 'Retrieve paginated products from BigCommerce with sorting support.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', description: 'Number of products per page. Default: 50.' },
                    page: { type: 'integer', description: 'Page number. Default: 1.' },
                    sort: { type: 'string', description: 'Sort field (e.g., "date_modified"). Default: "id".', default: 'id' },
                    direction: {
                        type: 'string',
                        description: 'Sort direction: ascending or descending.',
                        enum: ['asc', 'desc'],
                        default: 'asc'
                    }
                },
                required: [],
            },
        },
    },
};

export { apiTool };

