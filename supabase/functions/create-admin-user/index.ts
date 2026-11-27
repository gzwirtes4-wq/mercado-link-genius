// Admin-only: creates a user account and (optionally) assigns a plan.
//
// SECURITY: the previous version of this function was public and created a
// hard-coded admin account with a known password for anyone who called it.
// It now requires the caller's JWT to belong to a user with the 'admin' role.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(JSON.stringify({ fn: "create-admin-user", level: "error", msg: "missing env" }));
    return json({ error: "Configuração do servidor incompleta" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. Authenticate caller and require admin role ─────────────────────────
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "Sessão inválida ou expirada" }, 401);

  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Apenas administradores podem criar usuários" }, 403);

  // ── 2. Validate input ─────────────────────────────────────────────────────
  let body: { email?: unknown; password?: unknown; name?: unknown; plan_slug?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const planSlug = typeof body.plan_slug === "string" && body.plan_slug ? body.plan_slug : null;

  if (!EMAIL_RE.test(email)) return json({ error: "E-mail inválido" }, 400);
  if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres" }, 400);

  // ── 3. Create the account (profile + 'user' role come from the DB trigger) ─
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || null },
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Falha ao criar usuário";
    const status = /already|registered|exists/i.test(msg) ? 409 : 400;
    return json({ error: status === 409 ? "Já existe uma conta com este e-mail" : msg }, status);
  }

  // ── 4. Optional plan, expiry computed by the database ─────────────────────
  if (planSlug) {
    const { error: planErr } = await admin.rpc("admin_set_plan", {
      _target: created.user.id,
      _plan_slug: planSlug,
    });
    if (planErr) {
      return json(
        {
          user_id: created.user.id,
          warning: `Usuário criado, mas o plano não foi aplicado: ${planErr.message}`,
        },
        207,
      );
    }
  }

  await admin.from("admin_audit_log").insert({
    actor_id: caller.user.id,
    action: "CREATE_USER",
    table_name: "auth.users",
    target_user_id: created.user.id,
    new_data: { email, plan_slug: planSlug },
  });

  return json({ success: true, user_id: created.user.id, email, plan_slug: planSlug });
});
