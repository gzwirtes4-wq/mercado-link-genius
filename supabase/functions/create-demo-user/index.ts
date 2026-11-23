// DISABLED.
//
// The previous version was public: any visitor could call it to delete and
// recreate a demo account with a Lifetime plan and receive a logged-in session,
// bypassing payment. It is kept as a stub (instead of deleted) so the deployed
// function is overwritten on the next deploy rather than left running.
Deno.serve(() =>
  new Response(JSON.stringify({ error: "Recurso desativado" }), {
    status: 410,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  }),
);
