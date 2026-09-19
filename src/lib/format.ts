export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const brlFromCents = (cents: number) => brl((cents || 0) / 100);

export const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

export const firstName = (name?: string | null, email?: string | null) => {
  if (name) return name.split(" ")[0];
  if (email) return email.split("@")[0];
  return "afiliado";
};
