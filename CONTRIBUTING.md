# Contributing - bigC MCP Server

This is the **tools** layer of the bigC system. See the [README](README.md) for how it fits with the
[UI](https://github.com/Codinative/BigCommerce-Manager-Ai) and the
[backend](https://github.com/Codinative/bigC-management-backend).

## Local setup

```bash
npm install
cp .env.example .env            # then fill in the values
npm run list-tools              # print the tool catalogue
npm run dev                     # Streamable HTTP (how the backend connects)
npm start                       # stdio (for Claude Desktop / local MCP clients)
```

## Branching & commits

- **Never commit directly to `main`.** Branch off `main`: `docs/...`, `feat/...`, `fix/...`.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`).
- Open a focused PR into `main`.

## Adding a new BigCommerce tool

1. Create the tool under [`tools/bigcommerce/<area>/`](tools/bigcommerce/) following an existing tool as
   a template (name, description, input schema, handler).
2. Read the store credentials from the request context (`store-hash` / `x-api-key`) - do not hard-code
   or store credentials.
3. Make sure it is picked up by tool discovery, then verify with `npm run list-tools`.
4. Keep descriptions and parameter docs clear - the agent relies on them to choose the right tool.

## Security

- **Never** commit `.env`; only `.env.example` is tracked.
- In HTTP mode, store credentials arrive per request as headers and must be used only for that request.
- Set `MCP_AUTH_TOKEN` to require a bearer token when exposing the server over HTTP/SSE.
- Scope BigCommerce API accounts to the minimum needed (read-only where possible).
