-- Croc'n'Mouv Familles : schéma, droits d'accès (RLS) et stockage des photos.
-- Aucune donnée de famille ici : seulement la structure et le programme de départ.

-- ---------------------------------------------------------------- Tables

create table lieux (
  nom      text primary key,
  slug     text not null unique check (slug ~ '^[a-z0-9-]+$'),   -- utilisé dans le chemin des photos
  salle    text not null default '',
  adresse  text not null default '',
  prix     integer not null default 0 check (prix >= 0),         -- prix d'une semaine en CHF, 0 = à définir
  ordre    integer not null default 0
);

create table semaines (
  n          integer primary key,
  periode    text not null,
  code       text not null unique,
  debut      date not null,
  fin        date not null,
  theme      text not null default '',
  programme  jsonb not null default '{"alimentation":[],"mouvement":[],"nature":[]}',
  jours      jsonb not null default '[]'
);

create table referents (
  lieu     text not null references lieux on update cascade,
  semaine  integer not null references semaines,
  nom      text not null default '',
  tel      text not null default '',
  email    text not null default '' check (email = lower(email)),
  primary key (lieu, semaine)
);

-- Direction : accès complet. Les responsables de camp sont déduits de la table referents.
create table equipe (
  email  text primary key check (email = lower(email)),
  nom    text not null default '',
  role   text not null default 'direction' check (role in ('direction'))
);

create table commandes (
  numero     text primary key,
  email      text not null check (email = lower(email)),
  parent     text not null default '',
  paye       boolean not null default false,
  paye_le    date,
  importe_le timestamptz not null default now()
);
create index on commandes (email);

-- Informations communes à tous les enfants d'une même famille (même e-mail).
create table familles (
  email     text primary key check (email = lower(email)),
  parent    text not null default '',
  tel       text not null default '',
  adresse   text not null default '',
  parent2   text not null default '',
  tel2      text not null default '',
  contacts  jsonb not null default '[]',
  pickup    text not null default '',
  rc        text not null default '',
  maj_le    timestamptz not null default now()
);

create table enfants (
  id               bigint generated always as identity primary key,
  commande         text not null references commandes on update cascade on delete cascade,
  email            text not null check (email = lower(email)),
  prenom           text not null default '',
  nom              text not null default '',
  naissance        date,
  lieu             text references lieux on update cascade,
  semaines         integer[] not null default '{}',
  regime           text not null default '',
  allergies        text not null default '',
  allergie_severe  boolean not null default false,
  sante            text not null default '',
  medicaments      jsonb not null default '[]',
  sait_nager       boolean,
  rentre_seul      boolean not null default false,
  ass_maladie      text not null default '',
  ass_accident     text not null default '',
  photos           boolean not null default false,
  remarques        text not null default '',     -- écrit par les parents
  reglement        boolean not null default false,
  fiche_complete   boolean not null default false,
  obs_equipe       text not null default '',     -- écrit par l'équipe, invisible pour les parents
  relance_le       date,
  maj_le           timestamptz not null default now()
);
create index on enfants (email);
create index on enfants (lieu);

create table recettes (
  id           bigint generated always as identity primary key,
  titre        text not null,
  temps        text not null default '',
  niveau       text not null default 'Facile',
  semaine      integer references semaines,
  etiquettes   text[] not null default '{}',
  ingredients  text[] not null default '{}',
  etapes       text[] not null default '{}',
  image        text not null default '',          -- URL publique (bucket recettes)
  cree_le      timestamptz not null default now()
);

create table medias (
  id        uuid primary key default gen_random_uuid(),
  lieu      text not null references lieux on update cascade,
  semaine   integer not null references semaines,
  chemin    text not null unique,                 -- chemin dans le bucket medias
  type      text not null check (type in ('photo','video')),
  legende   text not null default '',
  cree_par  text not null default '',
  cree_le   timestamptz not null default now()
);
create index on medias (lieu, semaine);

-- Pour limiter l'envoi de codes de connexion (rempli par la fonction envoyer-code).
create table codes_envoyes (
  email     text not null,
  envoye_le timestamptz not null default now()
);
create index on codes_envoyes (email, envoye_le);

-- ---------------------------------------------------------------- Qui suis-je ?

create function moi() returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create function est_direction() returns boolean
language sql stable security definer set search_path = public as $$
  select moi() <> '' and exists (select 1 from equipe where email = moi())
$$;

-- Le responsable de camp voit un lieu + une semaine quand il en est le référent.
create function est_referent(p_lieu text, p_semaines integer[]) returns boolean
language sql stable security definer set search_path = public as $$
  select moi() <> '' and exists (
    select 1 from referents r
    where r.email = moi() and r.lieu = p_lieu and r.semaine = any(p_semaines))
$$;

create function parent_inscrit(p_lieu text, p_semaine integer) returns boolean
language sql stable security definer set search_path = public as $$
  select moi() <> '' and exists (
    select 1 from enfants e
    where e.email = moi() and e.lieu = p_lieu and p_semaine = any(e.semaines))
$$;

create function voit_famille(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from enfants e where e.email = p_email and est_referent(e.lieu, e.semaines))
$$;

create function mon_profil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', moi(),
    'role', case when est_direction() then 'direction'
                 when exists (select 1 from referents where email = moi() and moi() <> '') then 'resp'
                 else 'parent' end,
    'nom', coalesce((select nom from equipe where email = moi()),
                    (select nom from referents where email = moi() and moi() <> '' limit 1), ''),
    'creneaux', coalesce((select jsonb_agg(jsonb_build_object('lieu', lieu, 'semaine', semaine))
                          from referents where email = moi() and moi() <> ''), '[]'))
$$;

-- ---------------------------------------------------------------- Droits (RLS)

alter table lieux         enable row level security;
alter table semaines      enable row level security;
alter table referents     enable row level security;
alter table equipe        enable row level security;
alter table commandes     enable row level security;
alter table familles      enable row level security;
alter table enfants       enable row level security;
alter table recettes      enable row level security;
alter table medias        enable row level security;
alter table codes_envoyes enable row level security;   -- aucune policy : réservé au serveur

create policy lecture on lieux    for select to authenticated using (true);
create policy direction on lieux  for all to authenticated using (est_direction()) with check (est_direction());
create policy lecture on semaines for select to authenticated using (true);
create policy direction on semaines for all to authenticated using (est_direction()) with check (est_direction());
create policy lecture on recettes for select to authenticated using (true);
create policy direction on recettes for all to authenticated using (est_direction()) with check (est_direction());

-- Référents : la direction gère, chaque référent voit ses lignes. Les parents passent par la vue referents_public.
create policy direction on referents for all to authenticated using (est_direction()) with check (est_direction());
create policy soi on referents for select to authenticated using (email = moi() and moi() <> '');
create view referents_public as select lieu, semaine, nom, tel from referents;
revoke all on referents_public from anon;
grant select on referents_public to authenticated;

create policy direction on equipe for all to authenticated using (est_direction()) with check (est_direction());

-- Commandes et paiements : jamais visibles pour les responsables de camp.
create policy parent on commandes for select to authenticated using (email = moi());
create policy direction on commandes for all to authenticated using (est_direction()) with check (est_direction());

create policy parent on familles for select to authenticated using (email = moi());
create policy responsable on familles for select to authenticated using (voit_famille(email));
create policy direction on familles for all to authenticated using (est_direction()) with check (est_direction());

-- Enfants : les parents et les responsables modifient via les fonctions enregistrer_fiche et enregistrer_obs.
create policy parent on enfants for select to authenticated using (email = moi());
create policy responsable on enfants for select to authenticated using (est_referent(lieu, semaines));
create policy direction on enfants for all to authenticated using (est_direction()) with check (est_direction());

create policy voir on medias for select to authenticated
  using (est_direction() or est_referent(lieu, array[semaine]) or parent_inscrit(lieu, semaine));
create policy publier on medias for insert to authenticated
  with check (est_direction() or est_referent(lieu, array[semaine]));
create policy supprimer on medias for delete to authenticated
  using (est_direction() or est_referent(lieu, array[semaine]));

-- La colonne obs_equipe ne doit pas sortir vers les parents. RLS filtre les lignes, pas les colonnes :
-- on retire donc cette colonne des droits de lecture directe (le site liste les colonnes qu'il lit).
revoke select on enfants from anon, authenticated;
grant select (id, commande, email, prenom, nom, naissance, lieu, semaines, regime, allergies, allergie_severe,
  sante, medicaments, sait_nager, rentre_seul, ass_maladie, ass_accident, photos, remarques, reglement,
  fiche_complete, relance_le, maj_le) on enfants to authenticated;
-- La direction et les responsables lisent obs_equipe par cette fonction.
create function observations_equipe() returns table (id bigint, obs_equipe text)
language sql stable security definer set search_path = public as $$
  select e.id, e.obs_equipe from enfants e
  where est_direction() or est_referent(e.lieu, e.semaines)
$$;

-- ---------------------------------------------------------------- Actions

-- Les parents enregistrent la fiche d'un de leurs enfants et les infos communes de la famille.
create function enregistrer_fiche(p_enfant bigint, f jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from enfants where id = p_enfant;
  if v_email is null or (v_email <> moi() and not est_direction()) then
    raise exception 'acces refuse' using errcode = '42501';
  end if;
  update enfants set
    prenom = coalesce(nullif(trim(f->>'prenom'), ''), prenom),
    nom = coalesce(nullif(trim(f->>'nom'), ''), nom),
    naissance = coalesce(nullif(f->>'naissance', '')::date, naissance),
    regime = coalesce(f->>'regime', ''),
    allergies = coalesce(f->>'allergies', ''),
    allergie_severe = coalesce((f->>'allergie_severe')::boolean, false),
    sante = coalesce(f->>'sante', ''),
    medicaments = coalesce(f->'medicaments', '[]'),
    sait_nager = (f->>'sait_nager')::boolean,
    rentre_seul = coalesce((f->>'rentre_seul')::boolean, false),
    ass_maladie = coalesce(f->>'ass_maladie', ''),
    ass_accident = coalesce(f->>'ass_accident', ''),
    photos = coalesce((f->>'photos')::boolean, false),
    remarques = coalesce(f->>'remarques', ''),
    reglement = coalesce((f->>'reglement')::boolean, false),
    fiche_complete = coalesce((f->>'reglement')::boolean, false),
    maj_le = now()
  where id = p_enfant;
  insert into familles (email, parent, tel, adresse, parent2, tel2, contacts, pickup, rc, maj_le)
  values (v_email, coalesce(f->>'parent', ''), coalesce(f->>'tel', ''), coalesce(f->>'adresse', ''),
          coalesce(f->>'parent2', ''), coalesce(f->>'tel2', ''), coalesce(f->'contacts', '[]'),
          coalesce(f->>'pickup', ''), coalesce(f->>'rc', ''), now())
  on conflict (email) do update set
    parent = excluded.parent, tel = excluded.tel, adresse = excluded.adresse, parent2 = excluded.parent2,
    tel2 = excluded.tel2, contacts = excluded.contacts, pickup = excluded.pickup, rc = excluded.rc, maj_le = now();
end $$;

create function enregistrer_obs(p_enfant bigint, p_obs text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update enfants set obs_equipe = coalesce(p_obs, '')
  where id = p_enfant and (est_direction() or est_referent(lieu, semaines));
  if not found then raise exception 'acces refuse' using errcode = '42501'; end if;
end $$;

-- Import des commandes Squarespace (CSV relu et corrigé dans l'espace équipe).
-- rows : [{commande, email, parent, prenom, nom, naissance, lieu, semaines:[n]}]
-- Un enfant déjà importé (même commande + même prénom) est complété, jamais dédoublé.
create function importer_commandes(rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; v_cmd text; v_email text; v_id bigint; n_cmd int := 0; n_new int := 0; n_maj int := 0;
begin
  if not est_direction() then raise exception 'acces refuse' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(rows) loop
    v_cmd := regexp_replace(coalesce(r->>'commande', ''), '[#\s]', '', 'g');
    v_cmd := coalesce(nullif(regexp_replace(v_cmd, '^0+', ''), ''), v_cmd);
    v_email := lower(trim(coalesce(r->>'email', '')));
    if v_cmd = '' or v_email = '' then continue; end if;
    insert into commandes (numero, email, parent) values (v_cmd, v_email, coalesce(r->>'parent', ''))
    on conflict (numero) do update set email = excluded.email,
      parent = coalesce(nullif(excluded.parent, ''), commandes.parent);
    if found then n_cmd := n_cmd + 1; end if;
    if coalesce(trim(r->>'prenom'), '') = '' then continue; end if;
    select id into v_id from enfants where commande = v_cmd and lower(prenom) = lower(trim(r->>'prenom'));
    if v_id is null then
      insert into enfants (commande, email, prenom, nom, naissance, lieu, semaines)
      values (v_cmd, v_email, trim(r->>'prenom'), trim(coalesce(r->>'nom', '')),
              nullif(r->>'naissance', '')::date, nullif(r->>'lieu', ''),
              coalesce((select array_agg(distinct x::int order by x::int) from jsonb_array_elements_text(r->'semaines') x), '{}'));
      n_new := n_new + 1;
    else
      update enfants set
        email = v_email,
        nom = coalesce(nullif(trim(r->>'nom'), ''), nom),
        naissance = coalesce(naissance, nullif(r->>'naissance', '')::date),
        lieu = coalesce(nullif(r->>'lieu', ''), lieu),
        semaines = (select coalesce(array_agg(distinct s order by s), '{}') from unnest(
                      semaines || coalesce((select array_agg(x::int) from jsonb_array_elements_text(r->'semaines') x), '{}')) s)
      where id = v_id;
      n_maj := n_maj + 1;
    end if;
  end loop;
  return jsonb_build_object('commandes', n_cmd, 'nouveaux', n_new, 'mis_a_jour', n_maj);
end $$;

revoke execute on function importer_commandes(jsonb), enregistrer_fiche(bigint, jsonb), enregistrer_obs(bigint, text),
  mon_profil(), observations_equipe() from public, anon;
grant execute on function importer_commandes(jsonb), enregistrer_fiche(bigint, jsonb), enregistrer_obs(bigint, text),
  mon_profil(), observations_equipe() to authenticated;

-- ---------------------------------------------------------------- Stockage

-- Photos et vidéos des camps : privées, rangées par lieu (slug) puis semaine : bernex/1/xxxx.jpg
insert into storage.buckets (id, name, public, file_size_limit)
values ('medias', 'medias', false, 52428800)
on conflict (id) do nothing;
-- Photos des recettes (des plats, jamais d'enfants) : publiques.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recettes', 'recettes', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create function creneau_du_chemin(p_chemin text, out lieu text, out semaine integer)
language sql stable security definer set search_path = public as $$
  select l.nom, nullif(split_part(p_chemin, '/', 2), '')::int
  from lieux l where l.slug = split_part(p_chemin, '/', 1)
$$;

create policy medias_voir on storage.objects for select to authenticated using (
  bucket_id = 'medias' and exists (select 1 from creneau_du_chemin(name) c
    where est_direction() or est_referent(c.lieu, array[c.semaine]) or parent_inscrit(c.lieu, c.semaine)));
create policy medias_publier on storage.objects for insert to authenticated with check (
  bucket_id = 'medias' and exists (select 1 from creneau_du_chemin(name) c
    where est_direction() or est_referent(c.lieu, array[c.semaine])));
create policy medias_supprimer on storage.objects for delete to authenticated using (
  bucket_id = 'medias' and exists (select 1 from creneau_du_chemin(name) c
    where est_direction() or est_referent(c.lieu, array[c.semaine])));
create policy recettes_publier on storage.objects for insert to authenticated with check (
  bucket_id = 'recettes' and est_direction());

-- ---------------------------------------------------------------- Contenu de départ (modifiable dans l'espace équipe)

insert into lieux (nom, slug, ordre) values
  ('Bernex', 'bernex', 1), ('Laconnex', 'laconnex', 2), ('Ville de Genève', 'geneve', 3), ('Cossonay', 'cossonay', 4);

insert into semaines (n, periode, code, debut, fin, theme) values
  (1, 'Été 2027', 'S1', '2027-07-05', '2027-07-09', 'Les petits chefs du verger'),
  (2, 'Été 2027', 'S2', '2027-07-12', '2027-07-16', 'Explorateurs de la forêt'),
  (3, 'Été 2027', 'S3', '2027-07-19', '2027-07-23', 'Le potager en fête'),
  (4, 'Été 2027', 'S4', '2027-07-26', '2027-07-30', 'Olympiades de l''été'),
  (5, 'Été 2027', 'S5', '2027-08-02', '2027-08-06', 'À la ferme'),
  (6, 'Été 2027', 'S6', '2027-08-09', '2027-08-13', 'Saveurs du monde'),
  (7, 'Été 2027', 'S7', '2027-08-16', '2027-08-20', 'Le grand final de l''été'),
  (8, 'Pâques 2027', 'P1', '2027-04-05', '2027-04-09', 'Le printemps des saveurs');

update semaines set
  programme = '{"alimentation":["Éducation nutritionnelle","Réalisation des repas","Activités sensorielles","Activités culinaires","Dégustations"],"mouvement":["Découverte d''un sport","Chasse aux trésors","Marche","Exercices de relaxation","Jeux en plein air"],"nature":["Visite d''une ferme pédagogique","Activités comment ça pousse","Cueillette de saison"]}',
  jours = '[["Lun","Accueil, jeux de connaissance et atelier dégustation des fruits de saison"],["Mar","Découverte d''un sport le matin, préparation du pique-nique l''après-midi"],["Mer","Sortie nature : cueillette et marche (prévoir casquette et gourde)"],["Jeu","Atelier cuisine : les enfants préparent le repas de midi"],["Ven","Chasse aux trésors géante. De 17h00 à 17h45, apéritif préparé par les enfants et film de la semaine avec les parents"]]';
