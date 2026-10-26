// Envoie un code de connexion à 6 chiffres par e-mail (via Brevo).
// Parents : numéro de commande + e-mail de la commande. Équipe : e-mail seul (direction ou référent).
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MAX_PAR_HEURE = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);

  const { email: brut, commande: cmdBrute } = await req.json().catch(() => ({}));
  const email = String(brut ?? "").trim().toLowerCase();
  const commande = String(cmdBrute ?? "").replace(/[#\s]/g, "").replace(/^0+(?=\d)/, "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erreur: "Adresse e-mail invalide." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Qui a le droit de recevoir un code ?
  let autorise = false;
  if (commande) {
    const { data } = await db.from("commandes").select("numero").eq("numero", commande).eq("email", email).maybeSingle();
    autorise = !!data;
    if (!autorise) {
      return json({ erreur: "Ce numéro de commande et cet e-mail ne correspondent pas. Utilisez l'e-mail donné lors de l'inscription sur crocnmouv.ch." }, 404);
    }
  } else {
    const [{ data: eq }, { data: ref }] = await Promise.all([
      db.from("equipe").select("email").eq("email", email).maybeSingle(),
      db.from("referents").select("email").eq("email", email).limit(1),
    ]);
    autorise = !!eq || !!ref?.length;
    if (!autorise) return json({ erreur: "Cet e-mail n'a pas d'accès équipe. Demandez à Caroline de vous ajouter comme référent·e." }, 404);
  }

  // Limite d'envoi
  const depuis = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("codes_envoyes").select("email", { count: "exact", head: true })
    .eq("email", email).gte("envoye_le", depuis);
  if ((count ?? 0) >= MAX_PAR_HEURE) return json({ erreur: "Trop de codes demandés. Réessayez dans une heure." }, 429);

  // Crée le compte au premier passage, puis génère le code sans que Supabase n'envoie lui-même d'e-mail.
  await db.auth.admin.createUser({ email, email_confirm: true }); // erreur ignorée si le compte existe déjà
  const { data: lien, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const code = lien?.properties?.email_otp;
  if (error || !code) {
    console.error("generateLink", error);
    return json({ erreur: "Impossible de créer le code. Réessayez dans un instant." }, 500);
  }

  const envoi = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Croc'n'Mouv", email: Deno.env.get("EXPEDITEUR_EMAIL") },
      to: [{ email }],
      subject: `${code} : votre code Croc'n'Mouv`,
      textContent: `Bonjour,\n\nVoici votre code pour accéder à l'espace Croc'n'Mouv : ${code}\n\nIl est valable une heure. Si vous n'avez rien demandé, ignorez simplement cet e-mail.\n\nL'équipe Croc'n'Mouv`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1B1D12">
        <div style="background:#CDDF70;border-radius:18px;padding:22px 24px"><b style="font-size:20px">Croc'n'Mouv</b></div>
        <p style="margin:22px 0 8px">Bonjour,</p>
        <p>Voici votre code pour accéder à l'espace Croc'n'Mouv :</p>
        <p style="font-size:34px;letter-spacing:8px;font-weight:bold;background:#F0F2BC;border-radius:14px;padding:14px;text-align:center">${code}</p>
        <p style="color:#5E6248;font-size:14px">Il est valable une heure. Si vous n'avez rien demandé, ignorez simplement cet e-mail.</p>
        <p>L'équipe Croc'n'Mouv</p></div>`,
    }),
  });
  if (!envoi.ok) {
    console.error("Brevo", envoi.status, await envoi.text());
    return json({ erreur: "L'e-mail n'a pas pu partir. Réessayez dans un instant." }, 502);
  }
  await db.from("codes_envoyes").insert({ email });
  return json({ ok: true });
});
