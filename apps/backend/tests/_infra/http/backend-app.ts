import { app } from "../../../src/index";

export type JsonRequestOptions = {
  body?: unknown;
  token?: string | null;
};

export async function requestJson(
  path: string,
  init: RequestInit & JsonRequestOptions = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }

  return app.request(path, {
    ...init,
    headers,
    body:
      init.body === undefined || typeof init.body === "string"
        ? init.body
        : JSON.stringify(init.body),
  });
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Expected JSON response, got empty body (${response.status})`);
  }

  return JSON.parse(text) as T;
}

export async function expectJsonResponse<T>(
  response: Response,
  expectedStatus: number,
): Promise<T> {
  const body = await readJsonResponse<T>(response);
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected HTTP ${expectedStatus}, got ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}
