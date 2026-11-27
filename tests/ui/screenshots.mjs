// Abre o build de produção num Chromium real e tira prints das telas públicas
// (desktop e celular). Registra erros de console e de página em report.json.
// Uso: BASE_URL=http://127.0.0.1:4173 OUT_DIR=./screenshots node screenshots.mjs
// (rodar de uma pasta onde o pacote "playwright" esteja instalado)
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const OUT = process.env.OUT_DIR ?? "screenshots";
mkdirSync(OUT, { recursive: true });

const pages = [
  ["landing", "/"],
  ["login", "/auth"],
  ["cadastro", "/auth?mode=signup"],
  ["recuperar-senha", "/reset-password"],
  ["painel-sem-login", "/dashboard"],
];
const viewports = [
  ["desktop", { viewport: { width: 1440, height: 900 } }],
  ["celular", devices["iPhone 13"]],
];

const browser = await chromium.launch();
const report = [];
for (const [vpName, vp] of viewports) {
  const ctx = await browser.newContext({ ...vp, locale: "pt-BR" });
  for (const [name, path] of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
    let status = null;
    try {
      const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
      status = res?.status() ?? null;
      await page.waitForTimeout(1500);
      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await page.screenshot({ path: `${OUT}/${vpName}-${name}.png`, fullPage: true });
      report.push({
        viewport: vpName,
        page: path,
        finalUrl: page.url().replace(BASE, ""),
        status,
        overflowX,
        errors,
      });
    } catch (e) {
      report.push({
        viewport: vpName,
        page: path,
        status,
        errors: [...errors, `falha: ${String(e).slice(0, 300)}`],
      });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
