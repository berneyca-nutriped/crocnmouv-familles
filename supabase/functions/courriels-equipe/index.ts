// E-mails envoyés par la direction : rappels (paiement, fiche) et confirmation de paiement reçu.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function envoyer(to: string, sujet: string, texte: string) {
  const site = Deno.env.get("SITE_URL") ?? "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1B1D12">
    <div style="background:#CDDF70;border-radius:18px;padding:22px 24px"><b style="font-size:20px">Croc'n'Mouv</b></div>
    <div style="padding:18px 4px;line-height:1.5">${esc(texte).replace(/\n/g, "<br>")}</div>
    ${site ? `<p><a href="${site}" style="display:inline-block;background:#CDDF70;color:#1B1D12;text-decoration:none;font-weight:bold;border-radius:999px;padding:12px 22px">Ouvrir l'espace familles</a></p>` : ""}
  </div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Croc'n'Mouv", email: Deno.env.get("EXPEDITEUR_EMAIL") },
      to: [{ email: to }],
      subject: sujet,
      textContent: texte + (site ? `\n\nEspace familles : ${site}` : ""),
      htmlContent: html,
    }),
  });
  if (!r.ok) console.error("Brevo", r.status, await r.text());
  return r.ok;
}

const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "long" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = Deno.env.get("SUPABASE_URL")!;
  // Le client de l'appelant applique ses droits : seule la direction passe est_direction().
  const appelant = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: dir } = await appelant.rpc("est_direction");
  if (dir !== true) return json({ erreur: "Réservé à la direction." }, 403);
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const corps = await req.json().catch(() => ({}));

  if (corps.type === "paiement") {
    const { data: c } = await db.from("commandes").select("numero,email").eq("numero", String(corps.commande)).maybeSingle();
    if (!c) return json({ erreur: "Commande introuvable" }, 404);
    const ok = await envoyer(c.email, "Paiement reçu : merci !",
      `Bonjour,\n\nNous avons bien reçu le paiement de la commande ${c.numero}. Merci !\n\nL'attestation de paiement pour les impôts est maintenant disponible dans votre espace familles, rubrique Facturation.\n\nÀ très vite,\nCaroline et l'équipe Croc'n'Mouv`);
    return json({ envoyes: ok ? 1 : 0 });
  }

  if (corps.type === "rappel") {
    const ids: number[] = (corps.enfants ?? []).map(Number).filter(Boolean);
    const sujet = String(corps.sujet ?? "").slice(0, 200);
    const modele = String(corps.message ?? "").slice(0, 5000);
    if (!ids.length || !sujet || !modele) return json({ erreur: "Message incomplet" }, 400);
    const [{ data: enfants }, { data: semaines }] = await Promise.all([
      db.from("enfants").select("id,prenom,email,commande,semaines").in("id", ids),
      db.from("semaines").select("n,code,debut,periode"),
    ]);
    const sem = new Map((semaines ?? []).map((s) => [s.n, s]));
    let envoyes = 0;
    for (const e of enfants ?? []) {
      const liste = (e.semaines as number[]).map((n) => sem.get(n)).filter(Boolean)
        .map((s) => `semaine du ${fmt(s!.debut)}`).join(", ");
      const texte = modele.replaceAll("{enfant}", e.prenom).replaceAll("{semaines}", liste).replaceAll("{commande}", e.commande);
      if (await envoyer(e.email, sujet.replaceAll("{enfant}", e.prenom), texte)) {
        envoyes++;
        await db.from("enfants").update({ relance_le: new Date().toISOString().slice(0, 10) }).eq("id", e.id);
      }
    }
    return json({ envoyes });
  }

  return json({ erreur: "Type inconnu" }, 400);
});
