import assert from "node:assert/strict";
import { test } from "node:test";
import { importFmsCase } from "./admin.js";

function createAdmin(existingCase = null) {
  const inserted = [];
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    ilike() {
      return this;
    },
    limit() {
      return this;
    },
    async maybeSingle() {
      return { data: existingCase, error: null };
    },
    insert(record) {
      inserted.push(record);
      return {
        select() {
          return this;
        },
        async single() {
          return { data: { id: record.id }, error: null };
        },
      };
    },
  };
  return {
    inserted,
    from(table) {
      assert.equal(table, "tasks");
      return query;
    },
  };
}

test("imports an FMS case with iCHK task defaults and mapped governorate", async () => {
  const admin = createAdmin();
  const result = await importFmsCase(admin, "supervisor-id", {
    src: "SRC-123",
    taskUrl: "https://msp.go2field.iq/task/abcd-1234",
    region: "Basra",
    fdt: "FDT1234",
    description: "Fiber issue",
    created_at: "2026-11-26T06:00:00.000Z",
  });

  assert.equal(result.imported, true);
  assert.match(result.taskId, /^FMS-[A-F0-9]{32}$/);
  assert.equal(admin.inserted.length, 1);
  assert.equal(admin.inserted[0].created_by, "supervisor-id");
  assert.equal(admin.inserted[0].governorate, "BS");
  assert.deepEqual(admin.inserted[0].governorates, ["BS"]);
  assert.equal(admin.inserted[0].src, "SRC-123");
  assert.equal(admin.inserted[0].fms_id, "https://msp.go2field.iq/task/abcd-1234");
  assert.equal(admin.inserted[0].status, "open");
});

test("does not import a case whose SRC already exists", async () => {
  const admin = createAdmin({ id: "FMS-existing" });
  const result = await importFmsCase(admin, "supervisor-id", { src: "SRC-123" });

  assert.deepEqual(result, { alreadyExists: true, taskId: "FMS-existing" });
  assert.equal(admin.inserted.length, 0);
});

test("rejects FMS links outside the expected task URL", async () => {
  const admin = createAdmin();

  await assert.rejects(
    importFmsCase(admin, "supervisor-id", {
      src: "SRC-123",
      taskUrl: "https://example.com/task/abcd-1234",
    }),
    /must link to an FMS task/
  );
  assert.equal(admin.inserted.length, 0);
});
