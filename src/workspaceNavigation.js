const WORKSPACE_VIEWS = ["dashboard", "map", "teams", "members", "tasks", "task"];
const TASK_FILTERS = ["progress", "onHold", "completed"];
const DEFAULT_WORKSPACE_NAVIGATION = {
  page: "dashboard",
  taskStatus: null,
  selectedTaskId: null,
};

export function readWorkspaceNavigation(storage, userId, role) {
  try {
    const stored = storage.getItem(`ichk.workspace.${userId}`);
    if (!stored) return DEFAULT_WORKSPACE_NAVIGATION;

    const navigation = JSON.parse(stored);
    if (!WORKSPACE_VIEWS.includes(navigation.page)) return DEFAULT_WORKSPACE_NAVIGATION;
    if (role !== "supervisor" && ["teams", "members"].includes(navigation.page)) {
      return DEFAULT_WORKSPACE_NAVIGATION;
    }
    if (navigation.page === "tasks" && !TASK_FILTERS.includes(navigation.taskStatus)) {
      return DEFAULT_WORKSPACE_NAVIGATION;
    }
    if (navigation.page === "task" && typeof navigation.selectedTaskId !== "string") {
      return DEFAULT_WORKSPACE_NAVIGATION;
    }

    return {
      page: navigation.page,
      taskStatus: navigation.page === "tasks" ? navigation.taskStatus : null,
      selectedTaskId: navigation.selectedTaskId || null,
    };
  } catch (storageError) {
    console.error("Could not restore the last workspace page.", storageError);
    return DEFAULT_WORKSPACE_NAVIGATION;
  }
}

export function saveWorkspaceNavigation(storage, userId, navigation) {
  try {
    storage.setItem(`ichk.workspace.${userId}`, JSON.stringify(navigation));
  } catch (storageError) {
    console.error("Could not save the current workspace page.", storageError);
  }
}
