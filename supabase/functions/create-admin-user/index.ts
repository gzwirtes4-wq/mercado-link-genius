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

  // Check if user already exists
  const { data: existing } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  if (existing) {
    // Update existing user session
    const { data: freshSession } = await admin.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário já existe. Faça login com as credenciais fornecidas.",
        email: DEMO_EMAIL,
        session: freshSession?.session ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create user via admin API
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Ryan Admin" },
  });

  if (authError || !authUser.user) {
    return new Response(
      JSON.stringify({ error: authError?.message ?? "Falha ao criar usuário" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = authUser.user.id;

  // Create profile
  await admin.from("profiles").upsert({
    id: userId,
    full_name: "Ryan Admin",
    email: DEMO_EMAIL,
  }, { onConflict: "id" });

  // Assign admin role
  await admin.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  }, { onConflict: "user_id" });

  // Get or create lifetime plan
  let { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("slug", "lifetime")
    .maybeSingle();

  if (!plan) {
    const { data: newPlan } = await admin.from("plans").insert({
      name: "Lifetime",
      slug: "lifetime",
      description: "Acesso vitalício — pagamento único",
      price_cents: 25599,
      features: ["Catálogo completo", "Produtos ilimitados", "Gerador de links", "Criador de anúncios", "Dashboard", "Analytics", "Pedidos e financeiro", "Suporte prioritário"],
      highlight: true,
      sort_order: 2,
    }).select("id").single();
    plan = newPlan;
  }

  if (plan) {
    await admin.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: null,
    }, { onConflict: "user_id" });
  }

  // Sign in to get session
  const { data: freshSession } = await admin.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  return new Response(
    JSON.stringify({
      success: true,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: "admin",
      plan: "lifetime",
      message: "Conta criada com sucesso! Use as credenciais para fazer login.",
      session: freshSession?.session ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});