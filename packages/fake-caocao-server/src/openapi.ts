import { readFileSync } from "node:fs";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

type JsonSchema = {
  $ref?: string;
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  const?: boolean | null | number | string;
  enum?: Array<boolean | null | number | string>;
  format?: string;
  items?: JsonSchema;
  maxItems?: number;
  maxLength?: number;
  minItems?: number;
  minLength?: number;
  nullable?: boolean;
  oneOf?: JsonSchema[];
  pattern?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: string | string[];
};

type OpenApiParameter = {
  $ref?: string;
  in?: "path" | "query";
  name?: string;
  required?: boolean;
  schema?: JsonSchema;
};

type OpenApiOperation = {
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: JsonSchema }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
};

type OpenApiDocument = {
  components?: {
    parameters?: Record<string, OpenApiParameter>;
    schemas?: Record<string, JsonSchema>;
  };
  paths?: Record<string, Partial<Record<Lowercase<string>, OpenApiOperation>>>;
  webhooks?: Record<string, Partial<Record<Lowercase<string>, OpenApiOperation>>>;
};

type ValidationLocation = "body" | "path" | "query" | "response";

type OperationContentType = "application/json" | "application/x-www-form-urlencoded";

type ValidationRequestSchema = {
  contentType: OperationContentType;
  schema: JsonSchema;
  validator: ValidateFunction;
};

export type OpenApiIndexedOperation = {
  method: string;
  operationId: string;
  path: string;
  requestBody: ValidationRequestSchema | null;
  requestPathSchema: JsonSchema | null;
  requestPathValidator: ValidateFunction | null;
  requestQuerySchema: JsonSchema | null;
  requestQueryValidator: ValidateFunction | null;
  responseSchemas: Map<number, JsonSchema>;
  responseValidators: Map<number, ValidateFunction>;
};

export class OpenApiValidationError extends Error {
  constructor(
    readonly location: ValidationLocation,
    readonly issues: string[],
  ) {
    super(issues[0] ?? "OpenAPI validation failed");
  }
}

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
});
addFormats(ajv);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const objectSchemaFromParameters = (parameters: OpenApiParameter[]): JsonSchema | null => {
  if (parameters.length === 0) return null;
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const parameter of parameters) {
    if (!parameter.name || !parameter.schema) {
      throw new Error("OpenAPI parameter is missing name or schema");
    }
    properties[parameter.name] = parameter.schema;
    if (parameter.required) required.push(parameter.name);
  }
  return {
    additionalProperties: false,
    properties,
    required,
    type: "object",
  };
};

const normalizePath = (value: string): string => value.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

const formatAjvErrors = (
  errors: ErrorObject[] | null | undefined,
  location: ValidationLocation,
  operationId: string,
): string[] => {
  if (!errors || errors.length === 0) {
    return [`${location}(${operationId}) failed validation`];
  }
  return errors.map((error) => {
    const instancePath = error.instancePath.length > 0 ? error.instancePath : "/";
    if (error.keyword === "required") {
      const missingProperty = String(
        (error.params as { missingProperty?: unknown }).missingProperty,
      );
      return `${location}(${operationId})${instancePath}${instancePath.endsWith("/") ? "" : "/"}${missingProperty} is required`;
    }
    if (error.keyword === "additionalProperties") {
      const additionalProperty = String(
        (error.params as { additionalProperty?: unknown }).additionalProperty,
      );
      return `${location}(${operationId})${instancePath}${instancePath.endsWith("/") ? "" : "/"}${additionalProperty} is not allowed`;
    }
    return `${location}(${operationId})${instancePath} ${error.message ?? "is invalid"}`;
  });
};

export class OpenApiContract {
  private readonly operations = new Map<string, OpenApiIndexedOperation>();

  constructor(
    private readonly document: OpenApiDocument,
    readonly sourcePath: string,
  ) {
    this.indexOperations(this.document.paths ?? {});
    this.indexOperations(this.document.webhooks ?? {});
  }

  static load(sourcePath: string): OpenApiContract {
    const document = parseYaml(readFileSync(sourcePath, "utf8")) as OpenApiDocument;
    return new OpenApiContract(document, sourcePath);
  }

  getOperation(operationId: string): OpenApiIndexedOperation {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Unknown OpenAPI operation: ${operationId}`);
    }
    return operation;
  }

  validatePath(operationId: string, value: unknown): Record<string, string> {
    return this.validateObject(operationId, "path", value);
  }

  validateQuery(operationId: string, value: unknown): Record<string, string> {
    return this.validateObject(operationId, "query", value);
  }

  validateBody(operationId: string, value: unknown): unknown {
    const operation = this.getOperation(operationId);
    if (!operation.requestBody) {
      if (
        value === null ||
        value === undefined ||
        (isPlainObject(value) && Object.keys(value).length === 0)
      ) {
        return value ?? {};
      }
      throw new OpenApiValidationError("body", [`${operationId} does not accept a request body`]);
    }

    const valid = operation.requestBody.validator(value);
    if (!valid) {
      throw new OpenApiValidationError(
        "body",
        formatAjvErrors(operation.requestBody.validator.errors, "body", operationId),
      );
    }
    return value;
  }

  validateResponse(operationId: string, status: number, value: unknown): void {
    const operation = this.getOperation(operationId);
    const validator =
      operation.responseValidators.get(status) ?? operation.responseValidators.get(200) ?? null;
    if (!validator) {
      throw new Error(`OpenAPI response schema missing: ${operationId} ${status}`);
    }
    const valid = validator(value);
    if (!valid) {
      throw new OpenApiValidationError(
        "response",
        formatAjvErrors(validator.errors, "response", operationId),
      );
    }
  }

  private validateObject(
    operationId: string,
    location: "path" | "query",
    value: unknown,
  ): Record<string, string> {
    const operation = this.getOperation(operationId);
    const validator =
      location === "path" ? operation.requestPathValidator : operation.requestQueryValidator;
    if (!validator) {
      return Object.fromEntries(
        Object.entries(isRecord(value) ? value : {}).map(([key, item]) => [key, String(item)]),
      );
    }
    const valid = validator(value);
    if (!valid) {
      throw new OpenApiValidationError(
        location,
        formatAjvErrors(validator.errors, location, operationId),
      );
    }
    return Object.fromEntries(
      Object.entries(isRecord(value) ? value : {}).map(([key, item]) => [key, String(item)]),
    );
  }

  private indexOperations(
    source: Record<string, Partial<Record<Lowercase<string>, OpenApiOperation>>>,
  ): void {
    for (const [path, pathItem] of Object.entries(source)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!operation?.operationId) continue;
        const parameters = (operation.parameters ?? []).map((parameter) =>
          this.resolveParameter(parameter),
        );
        const pathSchema = objectSchemaFromParameters(
          parameters.filter((parameter) => parameter.in === "path"),
        );
        const querySchema = objectSchemaFromParameters(
          parameters.filter((parameter) => parameter.in === "query"),
        );
        const requestBodyEntry = this.resolveRequestBody(operation);
        const responseSchemas = new Map<number, JsonSchema>();
        const responseValidators = new Map<number, ValidateFunction>();
        for (const [status, response] of Object.entries(operation.responses ?? {})) {
          const schema = this.resolveResponseSchema(response);
          if (!schema) continue;
          const dereferenced = this.dereferenceSchema(schema);
          responseSchemas.set(Number(status), dereferenced);
          responseValidators.set(Number(status), ajv.compile(dereferenced));
        }

        const dereferencedPathSchema = pathSchema ? this.dereferenceSchema(pathSchema) : null;
        const dereferencedQuerySchema = querySchema ? this.dereferenceSchema(querySchema) : null;

        this.operations.set(operation.operationId, {
          method: method.toUpperCase(),
          operationId: operation.operationId,
          path: normalizePath(path),
          requestBody: requestBodyEntry,
          requestPathSchema: dereferencedPathSchema,
          requestPathValidator: dereferencedPathSchema ? ajv.compile(dereferencedPathSchema) : null,
          requestQuerySchema: dereferencedQuerySchema,
          requestQueryValidator: dereferencedQuerySchema
            ? ajv.compile(dereferencedQuerySchema)
            : null,
          responseSchemas,
          responseValidators,
        });
      }
    }
  }

  private resolveParameter(parameter: OpenApiParameter): OpenApiParameter {
    if (!parameter.$ref) return parameter;
    return this.resolveRef(parameter.$ref) as OpenApiParameter;
  }

  private resolveRequestBody(operation: OpenApiOperation): ValidationRequestSchema | null {
    const content = operation.requestBody?.content;
    if (!content) return null;
    for (const contentType of ["application/json", "application/x-www-form-urlencoded"] as const) {
      const schema = content[contentType]?.schema;
      if (!schema) continue;
      const dereferenced = this.dereferenceSchema(schema);
      return {
        contentType,
        schema: dereferenced,
        validator: ajv.compile(dereferenced),
      };
    }
    return null;
  }

  private resolveResponseSchema(response: {
    content?: Record<string, { schema?: JsonSchema }>;
  }): JsonSchema | null {
    for (const contentType of ["application/json", "application/x-www-form-urlencoded"] as const) {
      const schema = response.content?.[contentType]?.schema;
      if (schema) return schema;
    }
    return null;
  }

  private resolveRef(ref: string): unknown {
    if (!ref.startsWith("#/")) {
      throw new Error(`Unsupported OpenAPI ref: ${ref}`);
    }
    const segments = ref
      .slice(2)
      .split("/")
      .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

    let current: unknown = this.document;
    for (const segment of segments) {
      if (!isRecord(current) || !(segment in current)) {
        throw new Error(`OpenAPI ref not found: ${ref}`);
      }
      current = current[segment];
    }
    return current;
  }

  private dereferenceSchema(schema: JsonSchema, refs = new Map<string, JsonSchema>()): JsonSchema {
    if (schema.$ref) {
      const ref = schema.$ref;
      if (refs.has(ref)) {
        return refs.get(ref)!;
      }
      const resolved = this.resolveRef(ref);
      if (!isRecord(resolved)) {
        throw new Error(`OpenAPI schema ref did not resolve to an object: ${ref}`);
      }
      const placeholder: JsonSchema = {};
      refs.set(ref, placeholder);
      const dereferenced = this.dereferenceSchema(resolved as JsonSchema, refs);
      Object.assign(placeholder, dereferenced);
      const siblings = Object.fromEntries(
        Object.entries(schema).filter(([key]) => key !== "$ref"),
      ) as JsonSchema;
      return Object.keys(siblings).length === 0 ? placeholder : { ...placeholder, ...siblings };
    }

    const next: JsonSchema = { ...schema };
    if (schema.properties) {
      next.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [
          key,
          this.dereferenceSchema(value, refs),
        ]),
      );
    }
    if (schema.items) {
      next.items = this.dereferenceSchema(schema.items, refs);
    }
    if (Array.isArray(schema.anyOf)) {
      next.anyOf = schema.anyOf.map((branch) => this.dereferenceSchema(branch, refs));
    }
    if (Array.isArray(schema.oneOf)) {
      next.oneOf = schema.oneOf.map((branch) => this.dereferenceSchema(branch, refs));
    }
    if (isRecord(schema.additionalProperties)) {
      next.additionalProperties = this.dereferenceSchema(
        schema.additionalProperties as JsonSchema,
        refs,
      );
    }
    return next;
  }
}

export const readPathParams = (pathValue: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(pathValue).map(([key, value]) => [key, String(value)]));

export const readQueryParams = (url: URL): Record<string, string> =>
  Object.fromEntries(url.searchParams.entries());

export const readFormBody = (bodyText: string): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(bodyText).entries());

export const expectJsonObject = (value: unknown): Record<string, unknown> => {
  if (!isPlainObject(value)) {
    throw new Error("Expected a JSON object");
  }
  return value;
};

export const normalizeOpenApiPath = (value: string): string => normalizePath(value);

export const assertOperationMatches = (
  operation: OpenApiIndexedOperation,
  method: string,
  path: string,
): void => {
  if (operation.method !== method.toUpperCase() || operation.path !== normalizePath(path)) {
    throw new Error(
      `OpenAPI operation mismatch for ${operation.operationId}: expected ${operation.method} ${operation.path}, got ${method.toUpperCase()} ${normalizePath(path)}`,
    );
  }
};
