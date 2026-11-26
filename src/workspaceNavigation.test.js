import assert from "node:assert/strict";
import { test } from "node:test";
import { readWorkspaceNavigation, saveWorkspaceNavigation } from "./workspaceNavigation.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("restores the selected task view for the same user", () => {
  const storage = createStorage();
  const navigation = { page: "task", taskStatus: null, selectedTaskId: "task-42" };

  saveWorkspaceNavigation(storage, "user-1", navigation);

  assert.deepEqual(readWorkspaceNavigation(storage, "user-1", "supervisor"), navigation);
  assert.deepEqual(readWorkspaceNavigation(storage, "user-2", "supervisor"), {
    page: "dashboard",
    taskStatus: null,
    selectedTaskId: null,
  });
});

test("does not restore supervisor-only pages for a team account", () => {
  const storage = createStorage();
  saveWorkspaceNavigation(storage, "user-1", {
    page: "teams",
    taskStatus: null,
    selectedTaskId: null,
  });

  assert.deepEqual(readWorkspaceNavigation(storage, "user-1", "team"), {
    page: "dashboard",
    taskStatus: null,
    selectedTaskId: null,
  });
});

test("restores a valid task filter", () => {
  const storage = createStorage();
  saveWorkspaceNavigation(storage, "user-1", {
    page: "tasks",
    taskStatus: "completed",
    selectedTaskId: null,
  });

  assert.deepEqual(readWorkspaceNavigation(storage, "user-1", "team"), {
    page: "tasks",
    taskStatus: "completed",
    selectedTaskId: null,
  });
});
