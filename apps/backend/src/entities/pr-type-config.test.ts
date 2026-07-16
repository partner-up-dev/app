import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { insertPRTypeConfigSchema, selectPRTypeConfigSchema } from "./pr-type-config";

const splitTopLevelSqlExpressions = (input: string): string[] => {
  const expressions: string[] = [];
  let depth = 0;
  let expressionStart = 0;
  let insideString = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (insideString) {
      if (character === "'" && input[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        insideString = false;
      }
      continue;
    }

    if (character === "'") {
      insideString = true;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      expressions.push(input.slice(expressionStart, index).trim());
      expressionStart = index + 1;
    }
  }

  expressions.push(input.slice(expressionStart).trim());
  return expressions;
};

const readBootstrapConfigRows = (): {
  columns: string[];
  rowsByType: Map<string, Record<string, string>>;
} => {
  const seedSql = readFileSync(
    new URL("../../seeds/0001_pr_type_config_bootstrap.sql", import.meta.url),
    "utf8",
  );
  const insertMarker = "insert into pr_type_configs (";
  const insertStart = seedSql.indexOf(insertMarker);
  assert.notEqual(insertStart, -1);

  const columnsStart = insertStart + insertMarker.length;
  const columnsEnd = seedSql.indexOf(")\n  values", columnsStart);
  assert.notEqual(columnsEnd, -1);
  const valuesStart = columnsEnd + ")\n  values".length;
  const valuesEnd = seedSql.indexOf("\n  on conflict (type)", valuesStart);
  assert.notEqual(valuesEnd, -1);

  const columns = splitTopLevelSqlExpressions(seedSql.slice(columnsStart, columnsEnd));
  const tuples = splitTopLevelSqlExpressions(seedSql.slice(valuesStart, valuesEnd).trim());
  const rowsByType = new Map<string, Record<string, string>>();

  for (const tuple of tuples) {
    assert.equal(tuple.startsWith("("), true);
    assert.equal(tuple.endsWith(")"), true);
    const values = splitTopLevelSqlExpressions(tuple.slice(1, -1));
    assert.equal(values.length, columns.length, "bootstrap tuple must match its target columns");
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
    const typeExpression = row.type;
    assert.match(typeExpression, /^'[^']+'$/);
    rowsByType.set(typeExpression.slice(1, -1), row);
  }

  return { columns, rowsByType };
};

test("PR type config discovery ratios accept FORM/CARD/LIST zero weights", () => {
  const parsed = insertPRTypeConfigSchema.shape.discoveryFormRatio.parse(0);
  assert.equal(parsed, 0);
  assert.equal(insertPRTypeConfigSchema.shape.discoveryCardRatio.parse(12), 12);
  assert.equal(insertPRTypeConfigSchema.shape.discoveryListRatio.parse(0), 0);
});

test("PR type config is current type-keyed configuration without lifecycle or history fields", () => {
  const columns = Object.keys(insertPRTypeConfigSchema.shape);
  assert.equal(
    columns.some((column) => /status|version|revision|effective|scenario/i.test(column)),
    false,
  );
  assert.equal(columns.includes("defaultNotes"), true);
  assert.equal(columns.includes("authoringCreationPolicy"), true);
  assert.equal(columns.includes("fullCapacityExpansionPolicy"), true);
  assert.equal(columns.includes("defaultPrNotes"), false);
  assert.equal(columns.includes("prCreationPolicy"), false);
  assert.equal(columns.includes("fullPrExpansionPolicy"), false);
  assert.equal(selectPRTypeConfigSchema.shape.discoveryListRatio.parse(0), 0);
});

test("PR type bootstrap seed preserves the authoring and presentation config contract", () => {
  const { columns, rowsByType } = readBootstrapConfigRows();
  assert.deepEqual(columns, [
    "title",
    "type",
    "description",
    "location_pool",
    "route_pool",
    "time_pool_config",
    "authoring_time_window_editor_default_mode",
    "default_min_partners",
    "default_max_partners",
    "default_notes",
    "default_confirmation_enabled",
    "default_confirmation_start_offset_minutes",
    "default_confirmation_end_offset_minutes",
    "default_join_lock_offset_minutes",
    "meeting_point",
    "join_gate_config",
    "participation_frequency_limit",
    "feedback_questionnaire_template_id",
    "location_meeting_points",
    "cover_image",
    "community_qr_code",
    "authoring_creation_policy",
    "full_capacity_expansion_policy",
    "discovery_form_ratio",
    "discovery_card_ratio",
    "discovery_list_ratio",
    "created_at",
    "updated_at",
  ]);
  assert.deepEqual(
    [...rowsByType.keys()],
    ["BADMINTON", "STUDY_SPRINT", "TAIDAODAN_FOOD_TRIAL", "RIDE_HAILING"],
  );

  const expected = {
    BADMINTON: {
      editorMode: "'FUZZY'",
      communityQrCode: "null",
      creationPolicy: "'USER_AND_ADMIN'",
    },
    STUDY_SPRINT: {
      editorMode: "'NORMAL'",
      communityQrCode: "null",
      creationPolicy: "'USER_AND_ADMIN'",
    },
    TAIDAODAN_FOOD_TRIAL: {
      editorMode: "'NORMAL'",
      communityQrCode:
        "'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/support/2ced6f3b-b711-49fa-a298-c81f3918e19e.jpg'",
      creationPolicy: "'ADMIN_ONLY'",
    },
    RIDE_HAILING: {
      editorMode: "'ADVANCED'",
      communityQrCode: "null",
      creationPolicy: "'USER_AND_ADMIN'",
    },
  } as const;

  for (const [type, contract] of Object.entries(expected)) {
    const row = rowsByType.get(type);
    assert.ok(row);
    assert.equal(row.authoring_time_window_editor_default_mode, contract.editorMode);
    assert.equal(row.cover_image, "null");
    assert.equal(row.community_qr_code, contract.communityQrCode);
    assert.equal(row.authoring_creation_policy, contract.creationPolicy);
    assert.equal(row.full_capacity_expansion_policy, "'DISABLED'");
    assert.equal(row.discovery_form_ratio, "50");
    assert.equal(row.discovery_card_ratio, "50");
    assert.equal(row.discovery_list_ratio, "0");
  }
});
