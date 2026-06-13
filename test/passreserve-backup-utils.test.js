import { describe, expect, it } from "vitest";

import { selectBackupRecordsToKeep } from "../scripts/passreserve-backup-utils.mjs";

function record(id, createdAt) {
  return {
    id,
    createdAt
  };
}

describe("backup retention policy", () => {
  it("keeps newest weekly backups and one older backup per month", () => {
    const records = [
      record("wk-1", "2026-06-13T03:30:00.000Z"),
      record("wk-2", "2026-06-06T03:30:00.000Z"),
      record("wk-3", "2026-05-30T03:30:00.000Z"),
      record("apr-a", "2026-04-25T03:30:00.000Z"),
      record("apr-b", "2026-04-04T03:30:00.000Z"),
      record("mar-a", "2026-03-28T03:30:00.000Z"),
      record("feb-a", "2026-02-07T03:30:00.000Z")
    ];

    const keepIds = selectBackupRecordsToKeep(records, {
      retainWeekly: 2,
      retainMonthly: 3
    });

    expect([...keepIds]).toEqual(["wk-1", "wk-2", "wk-3", "apr-a", "mar-a"]);
    expect(keepIds.has("apr-b")).toBe(false);
    expect(keepIds.has("feb-a")).toBe(false);
  });
});
