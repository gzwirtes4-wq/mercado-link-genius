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

  const DEMO_EMAIL = "demo@mercadocommerce.com";

  // Check if demo user already exists
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  if (existing) {
    // Delete existing demo user for clean re-creation
    await admin.auth.admin.deleteUser(existing.id);
  }

  // Create user via admin API
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: "demo123456",
    email_confirm: true,
    user_metadata: { full_name: "Demo User" },
  });

  if (authError || !authUser.user) {
    return new Response(
      JSON.stringify({ error: authError?.message ?? "Failed to create user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = authUser.user.id;

  // Create profile
  await admin.from("profiles").upsert({
    id: userId,
    full_name: "Demo User",
    email: DEMO_EMAIL,
  }, { onConflict: "id" });

  // Get lifetime plan
  const { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("slug", "lifetime")
    .maybeSingle();

  if (plan) {
    await admin.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: null,
    }, { onConflict: "user_id" });
  }

  // Sign in to get session token
  const { data: sessionData, error: signInError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
  });

  // Fallback: generate access token manually via admin
  const { data: tokenData, error: tokenError } = await admin.auth.admin.generateLink({
    type: "signup",
    email: DEMO_EMAIL,
    password: "demo123456",
    email_confirm: true,
  });

  // Create session manually for demo
  const { data: freshSession } = await admin.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: "demo123456",
  });

  return new Response(
    JSON.stringify({
      success: true,
      email: DEMO_EMAIL,
      session: freshSession?.session ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
