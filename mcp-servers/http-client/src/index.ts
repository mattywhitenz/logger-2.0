import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize MCP server
const server = new McpServer({
  name: "http-client-mcp-server",
  version: "1.0.0"
});

// Input schema for HTTP requests
const HttpRequestInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    .describe("HTTP method to use"),
  url: z.string()
    .url("Must be a valid URL")
    .describe("Full URL to make the request to (e.g., https://api.example.com/endpoint)"),
  headers: z.record(z.string())
    .optional()
    .describe("Optional headers as key-value pairs (e.g., {\"Authorization\": \"Bearer token\", \"Content-Type\": \"application/json\"})"),
  body: z.string()
    .optional()
    .describe("Optional request body - use JSON string for JSON APIs"),
  timeout: z.number()
    .int()
    .min(1000)
    .max(120000)
    .default(30000)
    .describe("Request timeout in milliseconds (default: 30000)")
}).strict();

type HttpRequestInput = z.infer<typeof HttpRequestInputSchema>;

// Register the http_request tool
server.registerTool(
  "http_request",
  {
    title: "HTTP Request",
    description: `Make HTTP requests to any URL with custom methods, headers, and body.

This tool enables making arbitrary HTTP requests, useful for:
- Calling REST APIs
- Triggering webhooks
- Testing endpoints
- Any HTTP communication

Args:
  - method (string): HTTP method - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
  - url (string): Full URL including protocol (https://...)
  - headers (object, optional): Key-value pairs of HTTP headers
  - body (string, optional): Request body (typically JSON string for APIs)
  - timeout (number, optional): Timeout in ms, default 30000

Returns:
  JSON object with:
  - status: HTTP status code
  - statusText: HTTP status message
  - headers: Response headers
  - body: Response body (parsed as JSON if possible, otherwise raw text)
  - timing: Request duration in ms

Examples:
  - Simple GET: { method: "GET", url: "https://api.example.com/users" }
  - POST with headers: { method: "POST", url: "https://webhook.example.com", headers: { "email": "user@example.com" } }
  - POST with JSON body: { method: "POST", url: "https://api.example.com/data", headers: { "Content-Type": "application/json" }, body: "{\"key\": \"value\"}" }

Error Handling:
  - Network errors return error details in response
  - Timeouts return timeout error message
  - All HTTP status codes are returned (including 4xx/5xx)`,
    inputSchema: HttpRequestInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: HttpRequestInput) => {
    const startTime = Date.now();
    
    try {
      // Build fetch options
      const fetchOptions: RequestInit = {
        method: params.method,
        headers: params.headers || {},
        signal: AbortSignal.timeout(params.timeout)
      };

      // Add body for methods that support it
      if (params.body && !["GET", "HEAD", "OPTIONS"].includes(params.method)) {
        fetchOptions.body = params.body;
      }

      // Make the request
      const response = await fetch(params.url, fetchOptions);
      const timing = Date.now() - startTime;

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      const responseText = await response.text();
      let responseBody: unknown;
      
      // Try to parse as JSON
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      const output = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timing: `${timing}ms`
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(output, null, 2)
        }]
      };

    } catch (error) {
      const timing = Date.now() - startTime;
      
      let errorMessage: string;
      let errorType: string;

      if (error instanceof Error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          errorType = "TIMEOUT";
          errorMessage = `Request timed out after ${params.timeout}ms`;
        } else if (error.message.includes("fetch")) {
          errorType = "NETWORK_ERROR";
          errorMessage = error.message;
        } else {
          errorType = "ERROR";
          errorMessage = error.message;
        }
      } else {
        errorType = "UNKNOWN_ERROR";
        errorMessage = String(error);
      }

      const output = {
        error: true,
        errorType,
        message: errorMessage,
        timing: `${timing}ms`
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(output, null, 2)
        }]
      };
    }
  }
);

// Run with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HTTP Client MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
