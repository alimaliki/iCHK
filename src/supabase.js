import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
export const db = supabase;
export const functions = supabase;

const authListeners = new Set();
let currentUser = null;
let authSubscription;

function toUser(user) {
  if (!user) return null;
  return {
    ...user,
    displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || "",
  };
}

function emitAuth(user) {
  currentUser = toUser(user);
  authListeners.forEach((listener) => listener(currentUser));
}

function ensureAuthListener() {
  if (authSubscription || !supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    emitAuth(session?.user || null);
  });
  authSubscription = data.subscription;
}

export const auth = {
  get currentUser() {
    return currentUser;
  },
};

export function onAuthStateChanged(_auth, callback) {
  if (!supabase) return () => {};
  ensureAuthListener();
  authListeners.add(callback);
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Could not restore the Supabase session.", error);
      callback(null);
      return;
    }
    emitAuth(data.session?.user || null);
  }).catch((error) => {
    console.error("Could not load the current Supabase session.", error);
    callback(null);
  });
  return () => authListeners.delete(callback);
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: toUser(data.user) };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export const EmailAuthProvider = {
  credential(email, password) {
    return { email, password };
  },
};

export async function reauthenticateWithCredential(_user, credential) {
  const { data, error } = await supabase.auth.signInWithPassword(credential);
  if (error) throw error;
  emitAuth(data.user);
  return { user: toUser(data.user) };
}

export async function updatePassword(_user, password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  emitAuth(data.user);
}

export async function updateProfile(_user, { displayName }) {
  const { data, error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (error) throw error;
  emitAuth(data.user);
}

export async function verifyBeforeUpdateEmail(_user, email) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

const tableForPath = (path) => {
  if (path[0] === "users") return "profiles";
  if (path[0] === "teams" && path.length >= 3 && path[2] === "members") return "members";
  if (path[0] === "teams") return "teams";
  if (path[0] === "tasks" && path.length >= 3 && path[2] === "messages") return "messages";
  if (path[0] === "tasks") return "tasks";
  throw new Error(`Unsupported Supabase data path: ${path.join("/")}`);
};

function makeReference(path) {
  return { path };
}

export function doc(_db, ...segments) {
  return makeReference(segments);
}

export function collection(_db, ...segments) {
  return makeReference(segments);
}

export function collectionGroup(_db, name) {
  if (name !== "members") throw new Error(`Unsupported collection group: ${name}`);
  return makeReference(["teams", "*", "members"]);
}

export function where(field, operator, value) {
  if (operator !== "==") throw new Error(`Unsupported query operator: ${operator}`);
  return { type: "where", field, value };
}

export function orderBy(field, direction = "asc") {
  return { type: "orderBy", field, direction };
}

export function query(reference, ...constraints) {
  return { ...reference, constraints };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

function snakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function encodeRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [snakeCase(key), value]));
}

function decorateTimestamps(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => {
    if (typeof value !== "string" || !/(?:At|_at)$/.test(key) || Number.isNaN(Date.parse(value))) {
      return [camelCase(key), value];
    }
    const date = new Date(value);
    return [camelCase(key), {
      toDate: () => date,
      toMillis: () => date.getTime(),
    }];
  }));
}

function rowId(path, row) {
  return row.id;
}

function makeSnapshot(path, rows) {
  const docs = rows.map((row) => ({
    id: rowId(path, row),
    data: () => decorateTimestamps(row),
    ref: {
      parent: {
        parent: { id: row.team_id || "" },
      },
    },
  }));
  return {
    docs,
    exists: () => docs.length > 0,
    data: () => docs[0]?.data(),
  };
}

async function loadRows(reference) {
  const { path, constraints = [] } = reference;
  const table = tableForPath(path);
  let request = supabase.from(table).select("*");
  if (path[0] === "users") request = request.eq("id", path[1]);
  if (path[0] === "teams" && path.length > 1 && path[1] !== "*") {
    if (path.length >= 3) {
      request = request.eq("team_id", path[1]);
    } else {
      request = request.eq("id", path[1]);
    }
  }
  if (path[0] === "tasks" && path.length === 2) {
    request = request.eq("id", path[1]);
  } else if (path[0] === "tasks" && path.length === 1
    && !constraints.some((constraint) => constraint.type === "orderBy")) {
    request = request.order("created_at", { ascending: false });
  }
  if (path[0] === "tasks" && path.length >= 3) request = request.eq("task_id", path[1]);
  for (const constraint of constraints) {
    if (constraint.type === "where") {
      request = request.eq(snakeCase(constraint.field), constraint.value);
    } else if (constraint.type === "orderBy") {
      request = request.order(snakeCase(constraint.field), { ascending: constraint.direction !== "desc" });
    }
  }
  const { data, error } = await request;
  if (error) throw error;
  return path[0] === "users" && path.length > 1 ? data.slice(0, 1) : data;
}

export function onSnapshot(reference, onNext, onError) {
  let active = true;
  const { path } = reference;
  const table = tableForPath(path);
  const channel = supabase.channel(`data:${table}:${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      loadRows(reference).then((rows) => {
        if (active) onNext(makeSnapshot(path, rows));
      }).catch((error) => {
        if (active) onError?.(error);
      });
    })
    .subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" && active) onError?.(error || new Error("Supabase Realtime subscription failed."));
    });

  loadRows(reference).then((rows) => {
    if (active) onNext(makeSnapshot(path, rows));
  }).catch((error) => {
    if (active) onError?.(error);
  });

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function setDoc(reference, record) {
  const path = reference.path;
  const table = tableForPath(path);
  const row = encodeRecord(record);
  row.id = path[path.length - 1];
  if (table === "tasks") row.task_number = row.task_number || row.id;
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function addDoc(reference, record) {
  const table = tableForPath(reference.path);
  const row = encodeRecord(record);
  if (table === "messages") row.task_id = reference.path[1];
  if (table === "members") row.team_id = reference.path[1];
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw error;
  return { id: data.id };
}

export async function updateDoc(reference, changes) {
  const path = reference.path;
  const table = tableForPath(path);
  const id = path[path.length - 1];
  const row = encodeRecord(changes);
  if (table === "messages") row.task_id = path[1];
  if (table === "members") row.team_id = path[1];
  let request = supabase.from(table).update(row).eq("id", id);
  if (table === "messages") request = request.eq("task_id", path[1]);
  if (table === "members") request = request.eq("team_id", path[1]);
  const { error } = await request;
  if (error) throw error;
}

export async function deleteDoc(reference) {
  const path = reference.path;
  const table = tableForPath(path);
  let request = supabase.from(table).delete().eq("id", path[path.length - 1]);
  if (table === "messages") request = request.eq("task_id", path[1]);
  if (table === "members") request = request.eq("team_id", path[1]);
  const { error } = await request;
  if (error) throw error;
}

export function httpsCallable(_functions, operation) {
  return async (data) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error("Sign in first.");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ operation, ...data }),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Admin operation failed.");
      error.code = result.code || "functions/internal";
      throw error;
    }
    return { data: result };
  };
}
