# Croc'n'Mouv Familles

Site des centres aérés [Croc'n'Mouv](https://crocnmouv.ch), adapté au téléphone et installable sur l'écran d'accueil.

- **Familles** : connexion avec le numéro de commande Squarespace + l'e-mail de la commande, puis un code à 6 chiffres reçu par e-mail. Fiche de chaque enfant (alimentation, allergies, santé, médicaments, natation, droit à l'image, règlement), programme, photos de la semaine, recettes, facturation et attestation de paiement en PDF.
- **Direction** : tous les lieux et toutes les semaines, paiements (validés à la main après le virement), rappels par e-mail, programme, prix par lieu, référent·es, photos, recettes, impression, import des commandes Squarespace (CSV).
- **Responsable de camp** (le ou la référent·e d'un lieu et d'une semaine) : enfants de ses semaines seulement, sans les paiements ; publie et télécharge les photos ; imprime les listes.

## Comment c'est construit

| Élément | Service | Rôle |
|---|---|---|
| Site (`index.html`, `js/`) | Netlify | Pages statiques, aucune étape de construction |
| Base de données, connexion, photos | Supabase (région Zurich) | Données des familles, comptes, stockage privé des photos |
| E-mails | Brevo | Codes de connexion, rappels, confirmation de paiement |

- `supabase/migrations/` : tables, droits d'accès (chaque personne ne lit que ce qu'elle a le droit de voir, vérifié par la base elle-même) et stockage.
- `supabase/functions/envoyer-code` : vérifie le numéro de commande + e-mail (ou l'accès équipe) et envoie le code.
- `supabase/functions/courriels-equipe` : rappels et e-mail « paiement reçu », réservés à la direction.
- `scripts/deployer-supabase.mjs` : met tout en place sur Supabase et écrit `config.js`.
- `vendor/` : bibliothèques copiées dans le site (pas de dépendance à un CDN).

Les photos sont privées : chaque famille ne voit que celles du lieu et des semaines de ses enfants, par des liens valables une heure. Les observations de l'équipe ne sont jamais visibles par les parents.

## Essayer sans serveur

Ouvrir `index.html?demo` : données fictives, rien n'est enregistré. Le site passe aussi en démo tant que `config.js` est vide.

## Mise en ligne

1. **Supabase** : `SUPABASE_ACCESS_TOKEN=… BREVO_API_KEY=… node scripts/deployer-supabase.mjs --direction <e-mail de Caroline> --expediteur crocnmouv@gmail.com --site https://familles.crocnmouv.ch`
   (crée le schéma, l'accès direction, les fonctions, les secrets e-mail, désactive l'inscription libre, écrit `config.js` à committer).
2. **Netlify** : *Add new site › Import from GitHub* › ce dépôt. Aucun réglage : `netlify.toml` suffit.
3. **Domaine** : dans Netlify, ajouter `familles.crocnmouv.ch` ; dans Squarespace › Domaines › DNS, ajouter l'enregistrement CNAME `familles` indiqué par Netlify.
4. **Premier import** : Espace équipe › Semaines › *Importer des commandes* › fichier CSV exporté de Squarespace (Commerce › Commandes › Télécharger CSV).

## Règles

- Aucune donnée réelle de famille dans ce dépôt (le CSV d'import reste sur l'ordinateur et va directement dans Supabase).
- Le dépôt devrait être **privé** (GitHub › Settings › General › Danger Zone › Change visibility).
- Dire « Croc'n'Mouv » partout ; seule l'attestation de paiement nomme Global Nutrition Sàrl.
