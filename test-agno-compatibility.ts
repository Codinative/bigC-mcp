#!/usr/bin/env node

/**
 * Test script to verify BigCommerce MCP server compatibility with Agno
 *
 * Run with:
 * npx ts-node test-agno-compatibility.ts
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

interface MCPContent {
    type: string;
    text?: string;
}

interface MCPResult {
    content?: MCPContent[];
    _meta?: Record<string, unknown>;
    tools?: MCPTool[];
}

interface MCPError {
    code?: number;
    message: string;
}

interface MCPResponse {
    jsonrpc?: string;
    id?: string;
    result?: MCPResult;
    error?: MCPError;
}

class MockMCPTools {
    private serverUrl: string;
    private isConnected: boolean;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
        this.isConnected = false;
    }

    async connect(): Promise<MCPTool[]> {
        console.log(`🔗 Connecting to MCP server: ${this.serverUrl}`);

        try {
            // Test health check
            const healthResponse = await fetch(
                `${this.serverUrl.replace('/mcp', '')}/health`
            );

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log(`✅ Health check passed:`, healthData);
            }

            // Test server info
            try {
                const infoResponse = await fetch(
                    `${this.serverUrl.replace('/mcp', '')}/info`
                );

                if (infoResponse.ok) {
                    const infoData = await infoResponse.json();
                    console.log(`ℹ️  Server info:`, infoData);
                }
            } catch {
                console.log(`⚠️  Server info endpoint not available`);
            }

            // Test tools listing
            const toolsRequest = {
                jsonrpc: '2.0',
                id: 'test-tools',
                method: 'tools/list',
                params: {}
            };

            const toolsResponse = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json, text/event-stream',
                    Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN ?? ''}`
                },
                body: JSON.stringify(toolsRequest)
            });

            if (!toolsResponse.ok) {
                throw new Error(
                    `Tools request failed: ${toolsResponse.status}`
                );
            }

            const responseText = await toolsResponse.text();
            const toolsData = this.parseSSEResponse(responseText);

            console.log(
                `🛠️  Available tools:`,
                toolsData.result?.tools?.map((t) => t.name) ?? []
            );

            this.isConnected = true;

            console.log(`✅ Successfully connected to MCP server`);

            return toolsData.result?.tools ?? [];
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);

            console.error(`❌ Failed to connect:`, message);
            throw error;
        }
    }

    async callTool(
        toolName: string,
        args: Record<string, unknown>
    ): Promise<MCPResult> {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        console.log(`🔧 Calling tool: ${toolName} with args:`, args);

        const request = {
            jsonrpc: '2.0',
            id: `test-${toolName}-${Date.now()}`,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        };

        try {
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json, text/event-stream',
                    Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN ?? ''}`
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(
                    `Tool call failed: ${response.status}`
                );
            }

            const responseText = await response.text();
            const data = this.parseSSEResponse(responseText);

            if (data.error) {
                console.error(`❌ Tool error:`, data.error);
                throw new Error(data.error.message);
            }

            console.log(`✅ Tool result received:`, {
                toolName,
                hasContent: !!data.result?.content,
                contentType: data.result?.content?.[0]?.type,
                hasMeta: !!data.result?._meta,
                resultKeys: Object.keys(data.result ?? {})
            });

            return data.result ?? {};
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);

            console.error(`❌ Tool call failed:`, message);
            throw error;
        }
    }

    private parseSSEResponse(sseText: string): MCPResponse {
        const lines = sseText.split('\n');

        let eventType = '';
        let data = '';

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
                data += line.substring(6);
            } else if (line === '' && data) {
                try {
                    return JSON.parse(data) as MCPResponse;
                } catch {
                    console.warn(
                        'Failed to parse SSE data as JSON:',
                        data
                    );

                    return {
                        result: {
                            tools: []
                        }
                    };
                }
            }
        }

        if (data) {
            try {
                return JSON.parse(data) as MCPResponse;
            } catch {
                console.warn(
                    'Failed to parse SSE data as JSON:',
                    data
                );

                return {
                    result: {
                        tools: []
                    }
                };
            }
        }

        return {
            result: {
                tools: []
            }
        };
    }

    async close(): Promise<void> {
        this.isConnected = false;
        console.log(`🔌 Disconnected from MCP server`);
    }
}

async function testAgnoCompatibility(): Promise<void> {
    console.log(
        `🧪 Testing BigCommerce MCP Server compatibility with Agno`
    );
    console.log(`=====================================\n`);

    const serverUrl =
        process.env.MCP_SERVER_URL ??
        'http://localhost:3000/mcp';

    const mcpTools = new MockMCPTools(serverUrl);

    try {
        const tools = await mcpTools.connect();

        if (tools.length === 0) {
            console.log(
                `⚠️  No tools available. Make sure the server is configured with BigCommerce credentials.`
            );
            return;
        }

        for (const tool of tools) {
            console.log(`\n📋 Testing tool: ${tool.name}`);
            console.log(
                `   Description: ${tool.description ?? 'No description'}`
            );

            try {
                let testArgs: Record<string, unknown> = {};

                if (tool.name === 'get_all_products') {
                    testArgs = { limit: 5 };
                } else if (tool.name === 'get_all_customers') {
                    testArgs = { limit: 5 };
                } else if (tool.name === 'get_all_orders') {
                    testArgs = { limit: 5 };
                }

                const result = await mcpTools.callTool(
                    tool.name,
                    testArgs
                );

                if (result.content?.[0]?.text) {
                    const resultText = result.content[0].text;

                    console.log(
                        `   📊 Result preview: ${resultText.substring(
                            0,
                            200
                        )}${
                            resultText.length > 200 ? '...' : ''
                        }`
                    );
                }

                console.log(`   ✅ Tool test passed`);
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : String(error);

                console.log(
                    `   ❌ Tool test failed: ${message}`
                );

                continue;
            }
        }

        console.log(`\n🎉 Agno compatibility test completed!`);
        console.log(`📊 Results: ${tools.length} tools tested`);
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : String(error);

        console.error(`❌ Compatibility test failed:`, message);
        process.exit(1);
    } finally {
        await mcpTools.close();
    }
}

async function demonstrateAgnoUsage(): Promise<void> {
    console.log(`\n📚 Example: How to use with Agno`);
    console.log(`=================================`);

    const exampleCode = `
// Example Agno integration:
import { MCPTools } from '@agno/mcp';

const bigcommerceMCP = new MCPTools('http://localhost:3000/mcp');

async function getBigCommerceData() {
    await bigcommerceMCP.connect();

    const orders = await bigcommerceMCP.callTool(
        'get_all_orders',
        {
            limit: 10,
            sort: 'date_created:desc'
        }
    );

    const products = await bigcommerceMCP.callTool(
        'get_all_products',
        {
            limit: 20,
            is_visible: true
        }
    );

    const customers = await bigcommerceMCP.callTool(
        'get_all_customers',
        {
            limit: 10
        }
    );

    await bigcommerceMCP.close();

    return {
        orders,
        products,
        customers
    };
}
`;

    console.log(exampleCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testAgnoCompatibility()
        .then(() => demonstrateAgnoUsage())
        .catch(console.error);
}

export {
    MockMCPTools,
    testAgnoCompatibility
};