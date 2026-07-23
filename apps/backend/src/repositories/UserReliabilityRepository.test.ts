import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { test } from "vitest";
import type { UserId } from "../entities/user";
import type { RepositoryExecutor } from "./_executor";

process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";
const { UserReliabilityRepository } = await import("./UserReliabilityRepository");

type UpdateValues = Record<string, unknown>;

const sqlText = (value: unknown): string => new PgDialect().sqlToQuery(value as SQL).sql;

test("applyDelta performs one atomic update from post-delta SQL expressions", async () => {
  let selectCalls = 0;
  let updateCalls = 0;
  let updateValues: UpdateValues | undefined;

  const executor = {
    select: () => {
      selectCalls += 1;
      throw new Error("applyDelta must not read the current reliability row");
    },
    insert: () => ({
      values: () => ({
        onConflictDoNothing: async () => undefined,
      }),
    }),
    update: () => {
      updateCalls += 1;
      return {
        set: (values: UpdateValues) => {
          updateValues = values;
          return { where: async () => undefined };
        },
      };
    },
  } as unknown as RepositoryExecutor;

  await new UserReliabilityRepository(executor).applyDelta(
    "00000000-0000-0000-0000-000000000001" as UserId,
    {
      joined: 1,
      confirmed: 2,
      attended: 3,
      released: 4,
    },
  );

  assert.equal(selectCalls, 0);
  assert.equal(updateCalls, 1);
  assert.ok(updateValues);

  const joinCountSql = sqlText(updateValues.reliabilityJoinCount);
  const confirmCountSql = sqlText(updateValues.reliabilityConfirmCount);
  const attendCountSql = sqlText(updateValues.reliabilityAttendCount);
  const releaseCountSql = sqlText(updateValues.reliabilityReleaseCount);
  const joinRatioSql = sqlText(updateValues.joinToConfirmRatio);
  const attendRatioSql = sqlText(updateValues.confirmToAttendRatio);
  const releaseRatioSql = sqlText(updateValues.releaseFrequency);

  assert.match(joinCountSql, /GREATEST\(0, .*reliability_join_count.*\+ \$1\)/);
  assert.match(confirmCountSql, /GREATEST\(0, .*reliability_confirm_count.*\+ \$1\)/);
  assert.match(attendCountSql, /GREATEST\(0, .*reliability_attend_count.*\+ \$1\)/);
  assert.match(releaseCountSql, /GREATEST\(0, .*reliability_release_count.*\+ \$1\)/);
  assert.match(joinRatioSql, /CASE WHEN .*reliability_join_count.* > 0 THEN/);
  assert.match(joinRatioSql, /reliability_confirm_count.*::double precision/);
  assert.match(attendRatioSql, /CASE WHEN .*reliability_confirm_count.* > 0 THEN/);
  assert.match(attendRatioSql, /reliability_attend_count.*::double precision/);
  assert.match(releaseRatioSql, /CASE WHEN .*reliability_join_count.* > 0 THEN/);
  assert.match(releaseRatioSql, /reliability_release_count.*::double precision/);
});
