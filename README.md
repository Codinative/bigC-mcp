# bigC MCP Server

> The tools layer of the **bigC** assistant. A Model Context Protocol (MCP) server that exposes
> **21 BigCommerce operations** - across products, customers, orders, and analytics - as agent tools.

This repository is **one of three** that make up bigC. Read the section below to understand the whole
system, then jump to [What this server does](#what-this-server-does) for the MCP specifics.

---

## The bigC system

**bigC** lets a BigCommerce merchant manage their store by chatting in plain language: "how are sales
this month?", "update the price of the Leather Wallet to $45", "who are my top customers?". The
assistant fetches live store data, acts on it, and replies with charts, tables and dashboards.

It is built as three separate repositories, each owning one layer:

| Layer | Repository | Stack | Role |
|---|---|---|---|
| **UI** | [BigCommerce-Manager-Ai](https://github.com/Codinative/BigCommerce-Manager-Ai) | Next.js 15, React 19 | The chat UI + dashboard the merchant sees. Also the BigCommerce app shell: OAuth install, plans/billing, jobs marketplace. |
| **Brain** | [bigC-management-backend](https://github.com/Codinative/bigC-management-backend) | FastAPI, Python 3.12, LlamaIndex | The AI agent. Runs the LLM, picks tools, streams the reply, stores chat history and jobs. |
| **Tools** (this repo) | [bigC-mcp](https://github.com/Codinative/bigC-mcp) | TypeScript, MCP SDK | An MCP server exposing 21 BigCommerce operations as agent tools. |

### How a message flows

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Merchant (browser)                           │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  chat message
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BigCommerce-Manager-Ai  ·  Next.js UI + BigCommerce app shell         │
│  /api/agent proxy mints a 60s HS256 JWT and forwards the call          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  POST /agent   (header x-api-key: <JWT>)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  bigC-management-backend  ·  FastAPI agent "brain"                     │
│  Verifies the JWT, builds a LlamaIndex FunctionAgent (Azure gpt-5.2),  │
│  loads tools from THIS server, streams the reply token by token.       │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  MCP over Streamable HTTP
                                 │  headers: store-hash, x-api-key
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  bigC-mcp  ·  MCP tools server (TypeScript)   ◀── THIS REPO            │
│  21 tools → BigCommerce REST API (v2 / v3) with X-Auth-Token          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
                      BigCommerce Store REST API
```

This server is the only part that talks to the BigCommerce REST API. The agent decides *which* tool to
call; this server actually calls BigCommerce and returns structured results.

---

## What this server does

`bigC-mcp` is a standard MCP server. It advertises a catalogue of tools; an MCP client (here, the
[backend](https://github.com/Codinative/bigC-management-backend) via LlamaIndex) discovers them at
runtime and invokes them on the agent's behalf. Each tool maps to one BigCommerce REST operation,
authenticated per request with the store's credentials.

Because store credentials arrive **per request** (as headers in HTTP mode), a single deployment can
serve many stores safely. It also works as a classic local MCP server (stdio) for Claude Desktop,
Cline, and other MCP clients using a single store's credentials from the environment.

---

## Tech stack

- **Language:** TypeScript on Node.js (20+ recommended)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Transports:** stdio (default), SSE, and Streamable HTTP (`express`)
- **Logging:** Winston
- **Deploy:** Docker ([`Dockerfile`](Dockerfile)), default entrypoint runs Streamable HTTP

---

## The tools (21)

Each tool authenticates with the store's `X-Auth-Token` and calls the BigCommerce REST API.

### Products (v3 Catalog)
| Tool | Description | BigCommerce call |
|---|---|---|
| `get_products` | Paginated product list with sorting. | `GET /v3/catalog/products` |
| `get_product_by_id` | One product by id. | `GET /v3/catalog/products/{id}` |
| `search_products` | Search by keyword / SKU. | `GET /v3/catalog/products?keyword=` |
| `create_product` | Create a product. | `POST /v3/catalog/products` |
| `update_product` | Update a product by id. | `PUT /v3/catalog/products/{id}` |
| `delete_product` | Delete a product by id. | `DELETE /v3/catalog/products/{id}` |

### Customers (v3)
| Tool | Description | BigCommerce call |
|---|---|---|
| `get_customers` | Paginated customer list. | `GET /v3/customers` |
| `get_customer_by_id` | One customer (optionally with addresses, store credit, etc.). | `GET /v3/customers/{id}` |
| `search_customers` | Flexible filter (email, name, company, dates, group, ...). | `GET /v3/customers` |
| `create_customer` | Create a customer. | `POST /v3/customers` |
| `update_customer` | Update a customer by id. | `PUT /v3/customers` |
| `delete_customer` | Delete a customer by id. | `DELETE /v3/customers` |

### Orders (v2)
| Tool | Description | BigCommerce call |
|---|---|---|
| `get_orders` | Paginated order list with sorting. | `GET /v2/orders` |
| `get_order_by_id` | One order by id. | `GET /v2/orders/{id}` |
| `search_orders` | Flexible filter (customer, status, totals, dates, channel, ...). | `GET /v2/orders` |
| `update_order` | Update status, notes, addresses, custom fields. | `PUT /v2/orders/{id}` |
| `delete_order` | Delete an order by id. | `DELETE /v2/orders/{id}` |

### Analytics (derived from v2 orders)
| Tool | Description |
|---|---|
| `get_customer_lifetime_value` | Total spend, order count, and average order value for a customer. |
| `get_sales_report` | Total revenue, orders, and AOV over a date range (grouped by day/week/month). |
| `get_store_performance` | Snapshot: revenue, orders, AOV, top product, top customer for a range. |
| `get_top_products` | Top-selling products by quantity or revenue. |

> Tool signatures and parameter defaults live under [`tools/bigcommerce/`](tools/bigcommerce/);
> `npm run list-tools` prints the live catalogue.

---

## Getting started

### Prerequisites

- Node.js 20+
- BigCommerce store credentials (store hash + API access token) - for local/stdio use

Create an API account in **BigCommerce admin → Advanced Settings → API Accounts** with Products,
Customers, and Orders scopes, then copy the **Store Hash** and **Access Token**.

### Install

```bash
npm install
```

### Configure

Copy [`.env.example`](.env.example) to `.env`:

```env
BIGCOMMERCE_STORE_HASH=your_store_hash_here
BIGCOMMERCE_API_KEY=your_api_key_here
# Optional: require "Authorization: Bearer <token>" on HTTP/SSE requests
MCP_AUTH_TOKEN=your_secure_token_here
```

> In production (HTTP mode) the store credentials arrive **per request** as `store-hash` and
> `x-api-key` headers from the backend, so the env credentials above are mainly for local / stdio use.
> Never commit `.env`.

### Run

```bash
npm start              # stdio (default) - for Claude Desktop / local MCP clients
npm run start:http     # Streamable HTTP - how the bigC backend connects
npm run start:sse      # SSE transport
npm run list-tools     # print the tool catalogue
npm run dev            # tsx, Streamable HTTP, for development
```

---

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `BIGCOMMERCE_STORE_HASH` | stdio / local | Store hash for single-store use. |
| `BIGCOMMERCE_API_KEY` | stdio / local | API access token for single-store use. |
| `MCP_AUTH_TOKEN` | optional | If set, HTTP/SSE requests must send `Authorization: Bearer <token>`. |
| `PORT` | optional | HTTP/SSE port. |
| `NODE_ENV` | optional | Logging verbosity. |

---

## How the backend connects to it

The [backend](https://github.com/Codinative/bigC-management-backend) connects over **Streamable HTTP**
using LlamaIndex's MCP client, passing the current store's credentials as headers:

```python
# bigC-management-backend/src/agent/__init__.py
client = BasicMCPClient(
    settings.big_c_mcp_endpoint,             # e.g. http://localhost:8001/mcp
    headers={
        "x-api-key": ContextManager.get_api_key(),     # BigCommerce access token
        "store-hash": ContextManager.get_store_hash(), # BigCommerce store hash
    },
)
tools = await aget_tools_from_mcp_url(settings.big_c_mcp_endpoint, client)
```

Each tool reads `store-hash` and `x-api-key` from the incoming request and uses them to call
BigCommerce, so one MCP deployment serves every store without storing any credentials.

---

## Use as a standalone MCP server

This server is a standard MCP server, so you can also use it directly from any MCP client with a single
store's credentials.

### Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "bigcommerce": {
      "command": "node",
      "args": ["/absolute/path/to/mcpServer.js"],
      "env": {
        "BIGCOMMERCE_STORE_HASH": "your_store_hash_here",
        "BIGCOMMERCE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Docker

```bash
docker build -t bigc-mcp .
docker run -i --rm \
  -e BIGCOMMERCE_STORE_HASH=your_store_hash \
  -e BIGCOMMERCE_API_KEY=your_api_key \
  bigc-mcp
```

The Docker default entrypoint runs Streamable HTTP with a `/health` check.

---

## Security

- **No stored credentials in HTTP mode.** Store hash + token arrive per request and are used only to
  call BigCommerce for that request.
- Set `MCP_AUTH_TOKEN` to require a bearer token on the HTTP/SSE endpoints when exposing the server.
- Never commit `.env`; only [`.env.example`](.env.example) is tracked.
- Scope BigCommerce API accounts to the minimum needed (read-only where possible).

---

## Project structure

```
bigC-mcp/
├── mcpServer.ts            Main server (stdio / SSE / Streamable HTTP)
├── index.ts               CLI entry (tool discovery)
├── tools/bigcommerce/     The 21 tools: products/ customers/ orders/ analytics/
├── lib/tools.ts           Tool discovery / registry
├── scripts/               Logger + utilities (e.g. CSV export)
├── types/                 Shared types (ContextModel)
├── Dockerfile
└── .env.example
```

---

## Related repositories

- **UI:** [BigCommerce-Manager-Ai](https://github.com/Codinative/BigCommerce-Manager-Ai)
- **Brain:** [bigC-management-backend](https://github.com/Codinative/bigC-management-backend)
- **You are here:** bigC-mcp (the tools server)

---

## License

MIT.
