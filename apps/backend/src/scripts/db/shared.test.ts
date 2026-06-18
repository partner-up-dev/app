import { describe, expect, test } from "vitest";
import { parseSqlFileMetadata, resolveMigrationEnvironment } from "./shared";

describe("resolveMigrationEnvironment", () => {
  test("defaults to production", () => {
    expect(resolveMigrationEnvironment({ argv: [], env: {} })).toBe("production");
  });

  test("accepts explicit CLI environment", () => {
    expect(
      resolveMigrationEnvironment({
        argv: ["--environment=development"],
        env: {},
      }),
    ).toBe("development");
  });

  test("rejects conflicting CLI and env environments", () => {
    expect(() =>
      resolveMigrationEnvironment({
        argv: ["--environment=development"],
        env: { PARTNERUP_ENVIRONMENT: "staging" },
      }),
    ).toThrow(/Conflicting migration environments/);
  });

  test("rejects missing CLI environment values", () => {
    expect(() =>
      resolveMigrationEnvironment({
        argv: ["--environment"],
        env: {},
      }),
    ).toThrow(/--environment requires a non-empty value/);
  });

  test("rejects empty env environment values", () => {
    expect(() =>
      resolveMigrationEnvironment({
        argv: [],
        env: { PARTNERUP_ENVIRONMENT: " " },
      }),
    ).toThrow(/PARTNERUP_ENVIRONMENT requires a non-empty value/);
  });
});

describe("parseSqlFileMetadata", () => {
  test("treats data migrations without environment metadata as universal", () => {
    const metadata = parseSqlFileMetadata("select 1;", "data", "data-migrations/0001_example.sql");

    expect(metadata).toEqual({
      environmentScoped: false,
      environments: ["production", "staging", "development"],
      transactional: true,
    });
  });

  test("parses data migration environment allowlists", () => {
    const metadata = parseSqlFileMetadata(
      "-- migration: environments=development,staging\nselect 1;",
      "data",
      "data-migrations/0001_example.sql",
    );

    expect(metadata).toEqual({
      environmentScoped: true,
      environments: ["development", "staging"],
      transactional: true,
    });
  });

  test("rejects environment metadata on schema migrations", () => {
    expect(() =>
      parseSqlFileMetadata(
        "-- migration: environments=development\nselect 1;",
        "schema",
        "drizzle/0001_example.sql",
      ),
    ).toThrow(/schema migrations must not declare migration environments/);
  });

  test("rejects migration metadata on seed files", () => {
    expect(() =>
      parseSqlFileMetadata(
        "-- migration: environments=development\nselect 1;",
        "seed",
        "seeds/0001_example.sql",
      ),
    ).toThrow(/seed files do not support -- migration metadata headers/);
  });

  test("rejects unknown migration metadata headers", () => {
    expect(() =>
      parseSqlFileMetadata(
        "-- migration: fixture=true\nselect 1;",
        "data",
        "data-migrations/0001_example.sql",
      ),
    ).toThrow(/unsupported -- migration metadata header/);
  });

  test("rejects empty migration metadata headers", () => {
    expect(() =>
      parseSqlFileMetadata("-- migration: \nselect 1;", "data", "data-migrations/0001_example.sql"),
    ).toThrow(/unsupported -- migration metadata header/);
  });
});
