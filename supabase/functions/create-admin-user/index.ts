Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const DEMO_EMAIL = "ryan123@gmail.com";
  const DEMO_PASSWORD = "ryan123";
  const DEMO_NAME = "Admin Teste";

  // 1. Check if user already exists by email
  const { data: existing } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    // 2. Create user via Admin API
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME, role: "admin", is_admin: true, is_test_account: true },
    });

    if (authError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? "Falha ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    userId = authUser.user.id;
  }

  // 3. Upsert profile with admin role
  await admin.from("profiles").upsert({
    id: userId,
    full_name: DEMO_NAME,
    email: DEMO_EMAIL,
    role: "admin",
    is_admin: true,
    is_test_account: true,
  }, { onConflict: "id" });

  // 4. Ensure lifetime plan exists
  let { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("slug", "lifetime")
    .maybeSingle();

  if (!plan) {
    const { data: newPlan } = await admin.from("plans").insert({
      name: "Lifetime",
      slug: "lifetime",
      description: "Acesso vitalicio - pagamento unico",
      price_cents: 25599,
      features: ["Catalogo completo", "Produtos ilimitados", "Gerador de links", "Criador de anuncios", "Dashboard", "Analytics", "Pedidos e financeiro", "Suporte prioritario"],
      highlight: true,
      sort_order: 2,
    }).select("id").single();
    plan = newPlan;
  }

  // 5. Upsert subscription with lifetime (no expiry, status=active)
  if (plan) {
    await admin.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: null,
      cancel_at_period_end: false,
    }, { onConflict: "user_id" });
  }

  // 6. Upsert admin role in user_roles if table exists
  await admin.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  }, { onConflict: "user_id" }).catch(() => {
    // user_roles table may not exist - ignore error
  });

  return new Response(
    JSON.stringify({
      success: true,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: "admin",
      plan: "lifetime",
      user_id: userId,
      message: "Conta criada/atualizada com sucesso!\n\nEmail: ryan123@gmail.com\nSenha: ryan123\nPlano: Lifetime (vitalicio)\nStatus: Ativo\n\nFaça login em /auth com essas credenciais.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});