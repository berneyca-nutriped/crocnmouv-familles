// Met en place Supabase pour Croc'n'Mouv Familles, via l'API de gestion Supabase.
// Usage : node scripts/deployer-supabase.mjs --direction e-mail@exemple.ch --expediteur info@crocnmouv.ch --site https://familles.crocnmouv.ch
// Variables d'environnement : SUPABASE_ACCESS_TOKEN (obligatoire), BREVO_API_KEY (facultatif, sinon à saisir dans Supabase).
// Le script peut être relancé : il n'écrase ni les données ni le programme déjà saisi.
import { readFile, writeFile, readdir } from "node:fs/promises";

const API = "https://api.supabase.com/v1";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const arg = (n) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : ""; };
const NOM_PROJET = arg("projet") || "crocnmouv-familles";
if (!TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN manquant");

async function api(method, path, body, headers = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${txt}`);
  return txt ? JSON.parse(txt) : null;
}
const sql = (ref, query) => api("POST", `/projects/${ref}/database/query`, { query });

const projets = await api("GET", "/projects");
const projet = projets.find((p) => p.name === NOM_PROJET);
if (!projet) throw new Error(`Projet « ${NOM_PROJET} » introuvable. Projets : ${projets.map((p) => p.name).join(", ")}`);
const ref = projet.id;
console.log(`Projet ${projet.name} (${ref}), région ${projet.region}`);

// 1. Schéma (une seule fois)
const deja = await sql(ref, "select to_regclass('public.lieux') is not null as ok");
if (!deja[0].ok) {
  for (const f of (await readdir("supabase/migrations")).sort()) {
    console.log("Migration", f);
    await sql(ref, await readFile(`supabase/migrations/${f}`, "utf8"));
  }
} else console.log("Schéma déjà en place");

// 2. Accès direction
const direction = arg("direction").trim().toLowerCase();
if (direction) {
  await sql(ref, `insert into equipe (email, nom, role) values ('${direction.replace(/'/g, "''")}', 'Caroline', 'direction') on conflict (email) do nothing`);
  console.log("Direction :", direction);
}

// 3. Secrets des fonctions (e-mails)
const secrets = [
  ["BREVO_API_KEY", process.env.BREVO_API_KEY],
  ["EXPEDITEUR_EMAIL", arg("expediteur")],
  ["SITE_URL", arg("site")],
].filter(([, v]) => v).map(([name, value]) => ({ name, value }));
if (secrets.length) { await api("POST", `/projects/${ref}/secrets`, secrets); console.log("Secrets :", secrets.map((s) => s.name).join(", ")); }

// 4. Fonctions
for (const nom of ["envoyer-code", "courriels-equipe"]) {
  const fd = new FormData();
  fd.append("metadata", JSON.stringify({ name: nom, entrypoint_path: "index.ts", verify_jwt: nom !== "envoyer-code" }));
  fd.append("file", new Blob([await readFile(`supabase/functions/${nom}/index.ts`)], { type: "application/typescript" }), "index.ts");
  await api("POST", `/projects/${ref}/functions/deploy?slug=${nom}`, fd);
  console.log("Fonction déployée :", nom);
}

// 5. Connexion : pas d'inscription libre (les comptes naissent de l'import des commandes), code à 6 chiffres valable 1 h.
await api("PATCH", `/projects/${ref}/config/auth`, {
  disable_signup: true,
  mailer_otp_exp: 3600,
  mailer_otp_length: 6,
  ...(arg("site") ? { site_url: arg("site") } : {}),
});
console.log("Connexion configurée");

// 6. config.js du site
const cles = await api("GET", `/projects/${ref}/api-keys`);
const anon = (cles.find((k) => k.name === "anon") || cles.find((k) => k.type === "publishable"))?.api_key;
await writeFile("config.js", `// Connexion à Supabase. Ces deux valeurs sont publiques (la sécurité est assurée par les droits de la base).
// Laissées vides, le site s'ouvre en mode démo avec des données fictives.
window.CNM_CONFIG = {
  supabaseUrl: "https://${ref}.supabase.co",
  supabaseAnonKey: "${anon}"
};
`);
console.log("config.js écrit. Terminé.");
