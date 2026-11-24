import { createClient } from "@supabase/supabase-js";

const usernameEmail = (username) => `${username}@teams.wasla.invalid`;
const isValidId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

function respond(res, status, body) {
  res.status(status).json(body);
}

function errorResponse(error) {
  const code = error?.code || "";
  if (code === "23505" || code === "email_exists" || code === "auth/email_exists") {
    return { status: 409, body: { code: "functions/already-exists", error: "That username is already taken." } };
  }
  if (code === "functions/invalid-argument") {
    return { status: 400, body: { code, error: error.message } };
  }
  if (code === "functions/failed-precondition") {
    return { status: 409, body: { code, error: error.message } };
  }
  if (code === "42501" || code === "permission-denied") {
    return { status: 403, body: { code: "functions/permission-denied", error: "Only shift supervisors can perform this action." } };
  }
  if (code === "PGRST116") {
    return { status: 404, body: { code: "functions/not-found", error: "The requested record does not exist." } };
  }
  console.error("Supabase admin operation failed.", error);
  return { status: 500, body: { code: "functions/internal", error: "The admin operation could not be completed." } };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, { error: "Method not allowed." });
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return respond(res, 503, { code: "functions/internal", error: "Server-side Supabase settings are missing." });
  }

  const authorization = req.headers.authorization || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return respond(res, 401, { error: "Sign in first." });

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !userData.user) return respond(res, 401, { error: "Sign in first." });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) return respond(res, 500, { error: "Could not verify supervisor permissions." });
  if (profile?.role !== "supervisor") {
    return respond(res, 403, { code: "functions/permission-denied", error: "Only shift supervisors can perform this action." });
  }

  const { operation, ...input } = req.body || {};
  try {
    let result;
    if (operation === "createTeamAccount") {
      result = await createTeam(admin, userData.user.id, input);
    } else if (operation === "updateTeamAccount") {
      result = await updateTeam(admin, input);
    } else if (operation === "setTeamAvailability") {
      result = await setAvailability(admin, input);
    } else if (operation === "deleteTask") {
      result = await deleteTask(admin, input);
    } else if (operation === "deleteTeamAccount") {
      result = await deleteTeam(admin, input);
    } else {
      return respond(res, 400, { code: "functions/invalid-argument", error: "Unknown admin operation." });
    }
    return respond(res, 200, result);
  } catch (error) {
    const mapped = errorResponse(error);
    return respond(res, mapped.status, mapped.body);
  }
}

async function createTeam(admin, supervisorId, input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!name || name.length > 80 || !/^[a-z0-9._-]{3,32}$/.test(username)
    || password.length < 8 || password.length > 128) {
    const error = new Error("Provide a valid crew name, username, and password.");
    error.code = "functions/invalid-argument";
    throw error;
  }

  const { data: existing, error: existingError } = await admin
    .from("teams")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const error = new Error("That username is already taken.");
    error.code = "23505";
    throw error;
  }

  const { data: accountData, error: accountError } = await admin.auth.admin.createUser({
    email: usernameEmail(username),
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (accountError) throw accountError;

  let teamId;
  try {
    const { data: team, error: teamError } = await admin.from("teams").insert({
      name,
      username,
      account_uid: accountData.user.id,
      created_by: supervisorId,
    }).select("id").single();
    if (teamError) throw teamError;
    teamId = team.id;
    const { error: profileError } = await admin.from("profiles").insert({
      id: accountData.user.id,
      email: usernameEmail(username),
      username,
      role: "team",
      team_id: teamId,
      team_name: name,
    });
    if (profileError) throw profileError;
  } catch (error) {
    if (teamId) {
      const { error: teamRollbackError } = await admin.from("teams").delete().eq("id", teamId);
      if (teamRollbackError) console.error("Could not roll back the created Supabase team.", teamRollbackError);
    }
    const { error: rollbackError } = await admin.auth.admin.deleteUser(accountData.user.id);
    if (rollbackError) console.error("Could not roll back the created Supabase account.", rollbackError);
    throw error;
  }
  return { teamId, username };
}

async function updateTeam(admin, input) {
  const { teamId, name, password } = input;
  const nextName = typeof name === "string" ? name.trim() : "";
  if (!isValidId(teamId) || !nextName || nextName.length > 80
    || (password && (typeof password !== "string" || password.length < 8 || password.length > 128))) {
    const error = new Error("Provide a valid team name and optional password.");
    error.code = "functions/invalid-argument";
    throw error;
  }
  const { data: team, error: teamError } = await admin.from("teams")
    .select("account_uid").eq("id", teamId).maybeSingle();
  if (teamError) throw teamError;
  if (!team) {
    const error = new Error("The team does not exist.");
    error.code = "PGRST116";
    throw error;
  }
  if (team.account_uid) {
    const { error } = await admin.auth.admin.updateUserById(team.account_uid, {
      user_metadata: { display_name: nextName },
      ...(password ? { password } : {}),
    });
    if (error) throw error;
  }
  const { error: updateTeamError } = await admin.from("teams").update({ name: nextName }).eq("id", teamId);
  if (updateTeamError) throw updateTeamError;
  const { error: updateProfilesError } = await admin.from("profiles").update({ team_name: nextName }).eq("team_id", teamId);
  if (updateProfilesError) throw updateProfilesError;
  const { error: updateTasksError } = await admin.from("tasks").update({ team_name: nextName }).eq("team_id", teamId);
  if (updateTasksError) throw updateTasksError;
  return { updated: true };
}

async function setAvailability(admin, input) {
  if (!isValidId(input.teamId) || !["on-shift", "off-shift"].includes(input.availability)) {
    const error = new Error("A team ID and valid shift availability are required.");
    error.code = "functions/invalid-argument";
    throw error;
  }
  const { data, error } = await admin.from("teams")
    .update({ availability: input.availability }).eq("id", input.teamId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error("The team does not exist.");
    missing.code = "PGRST116";
    throw missing;
  }
  return { updated: true, availability: input.availability };
}

async function deleteTask(admin, input) {
  if (!isValidId(input.taskId)) {
    const error = new Error("A task ID is required.");
    error.code = "functions/invalid-argument";
    throw error;
  }
  const { data, error } = await admin.from("tasks").delete().eq("id", input.taskId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error("The task does not exist.");
    missing.code = "PGRST116";
    throw missing;
  }
  return { deleted: true };
}

async function deleteTeam(admin, input) {
  const { teamId, mode, targetTeamId } = input;
  if (!isValidId(teamId) || !["empty", "reassign", "cascade"].includes(mode)) {
    const error = new Error("Choose a valid team deletion option.");
    error.code = "functions/invalid-argument";
    throw error;
  }
  const { data: team, error: teamError } = await admin.from("teams")
    .select("account_uid").eq("id", teamId).maybeSingle();
  if (teamError) throw teamError;
  if (!team) {
    const missing = new Error("The team does not exist.");
    missing.code = "PGRST116";
    throw missing;
  }
  const { data: tasks, error: taskError } = await admin.from("tasks")
    .select("id").eq("team_id", teamId);
  if (taskError) throw taskError;
  if (mode === "empty" && tasks.length) {
    const blocked = new Error("Reassign or delete this team's tasks first.");
    blocked.code = "functions/failed-precondition";
    throw blocked;
  }
  if (mode === "reassign") {
    if (!isValidId(targetTeamId) || targetTeamId === teamId) {
      const error = new Error("Choose another team for reassignment.");
      error.code = "functions/invalid-argument";
      throw error;
    }
    const { data: target, error: targetError } = await admin.from("teams")
      .select("name").eq("id", targetTeamId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) {
      const missing = new Error("The destination team does not exist.");
      missing.code = "PGRST116";
      throw missing;
    }
    const { error } = await admin.from("tasks").update({
      team_id: targetTeamId,
      team_name: target.name,
    }).eq("team_id", teamId);
    if (error) throw error;
  } else if (mode === "cascade") {
    const { error } = await admin.from("tasks").delete().eq("team_id", teamId);
    if (error) throw error;
  }

  if (team.account_uid) {
    const { error } = await admin.auth.admin.deleteUser(team.account_uid);
    if (error && error.code !== "user_not_found") throw error;
  }
  const { error } = await admin.from("teams").delete().eq("id", teamId);
  if (error) throw error;
  return { deleted: true, affectedTasks: tasks.length };
}
