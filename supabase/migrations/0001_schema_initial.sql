-- =====================================================================
-- Gestionnaire de Paie — Référentiel 2026
-- Migration initiale (PostgreSQL / Supabase)
-- =====================================================================

create extension if not exists unaccent;

-- Configuration de recherche plein texte française insensible aux accents
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'fr_unaccent') then
    create text search configuration fr_unaccent ( copy = french );
    alter text search configuration fr_unaccent
      alter mapping for hword, hword_part, word with unaccent, french_stem;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. RÉFÉRENTIELS ET PARAMÈTRES LÉGAUX
-- ---------------------------------------------------------------------
create table referentiels (
  annee             smallint primary key check (annee between 2020 and 2100),
  libelle           text not null,
  statut            text not null default 'brouillon'
                    check (statut in ('brouillon','actif','archive')),
  date_publication  date,
  cree_le           timestamptz not null default now()
);

create table parametres_legaux (
  annee                smallint not null references referentiels(annee) on delete cascade,
  cle                  text not null,              -- ex. 'pmss.mensuel'
  valeur               jsonb not null,
  unite                text,                       -- '€', '%', 'h', 'jours'…
  statut_verification  text not null default 'a_verifier'
                       check (statut_verification in ('publie','a_verifier')),
  reference_juridique  text,
  source_url           text,
  date_effet           date,
  verifie_par          uuid references auth.users(id),
  verifie_le           timestamptz,
  primary key (annee, cle)
);

-- ---------------------------------------------------------------------
-- 2. CONTENU PÉDAGOGIQUE
-- ---------------------------------------------------------------------
create table modules (
  id                 serial primary key,
  annee              smallint not null references referentiels(annee),
  numero             smallint not null check (numero between 1 and 20),
  slug               text not null,
  titre              text not null,
  objectifs          jsonb not null default '[]',
  duree_estimee_min  integer,
  unique (annee, numero),
  unique (annee, slug)
);

create table chapitres (
  id           serial primary key,
  module_id    integer not null references modules(id) on delete cascade,
  ordre        smallint not null,
  slug         text not null,
  type         text not null check (type in ('cours','resume','formules','fiche','cas_pratique')),
  titre        text not null,
  contenu_mdx  text not null,
  recherche    tsvector generated always as (
                 setweight(to_tsvector('fr_unaccent', coalesce(titre,'')), 'A') ||
                 setweight(to_tsvector('fr_unaccent', coalesce(contenu_mdx,'')), 'B')
               ) stored,
  maj_le       timestamptz not null default now(),
  unique (module_id, slug)
);
create index chapitres_recherche_idx on chapitres using gin (recherche);

create table themes (
  id       serial primary key,
  slug     text unique not null,
  libelle  text not null
);

create table questions (
  id              text primary key,                -- 'M1-Q07'
  module_id       integer not null references modules(id) on delete cascade,
  chapitre_id     integer references chapitres(id) on delete set null,
  niveau          text not null check (niveau in ('facile','moyen','difficile')),
  type            text not null check (type in ('choix unique','choix multiple','calcul')),
  enonce          text not null,
  choix           jsonb not null,                  -- ["A. …","B. …",…]
  bonne_reponse   jsonb not null,                  -- ["B"] ou ["A","C"]
  explication     text not null,
  reference       text,
  piege           text,
  annees_valides  smallint[] not null default '{2026}',
  actif           boolean not null default true,
  maj_le          timestamptz not null default now()
);
create index questions_module_idx on questions(module_id) where actif;

create table questions_themes (
  question_id  text references questions(id) on delete cascade,
  theme_id     integer references themes(id) on delete cascade,
  primary key (question_id, theme_id)
);

create table flashcards (
  id         serial primary key,
  module_id  integer not null references modules(id) on delete cascade,
  recto      text not null,
  verso      text not null,
  reference  text
);

create table cas_pratiques (
  id               serial primary key,
  module_id        integer references modules(id) on delete cascade,
  titre            text not null,
  enonce_mdx       text not null,
  etapes           jsonb not null default '[]',   -- [{question, correction_mdx}]
  saisie_bulletin  jsonb                          -- rejouable dans le simulateur
);

create table glossaire (
  id            serial primary key,
  terme         text not null unique,
  sigle         text,
  definition    text not null,
  reference     text,
  modules_lies  smallint[] default '{}'
);

create table calendrier_social (
  id             serial primary key,
  annee          smallint not null references referentiels(annee),
  date_echeance  date not null,
  libelle        text not null,
  categorie      text not null check (categorie in ('DSN','URSSAF','fiscal','annuel','autre')),
  condition      text,
  source_url     text
);

-- ---------------------------------------------------------------------
-- 3. APPRENANTS ET SUIVI
-- ---------------------------------------------------------------------
create table profils (
  id                  uuid primary key references auth.users(id) on delete cascade,
  prenom              text,
  statut_apprenant    text check (statut_apprenant in ('etudiant','alternant','reconversion','professionnel')),
  date_examen_visee   date,
  role                text not null default 'apprenant' check (role in ('apprenant','formateur','admin')),
  temps_majore        boolean not null default false,
  consentement_stats  boolean not null default false,
  cree_le             timestamptz not null default now()
);

create table progression_chapitres (
  profil_id        uuid references profils(id) on delete cascade,
  chapitre_id      integer references chapitres(id) on delete cascade,
  statut           text not null check (statut in ('commence','termine')),
  derniere_visite  timestamptz not null default now(),
  primary key (profil_id, chapitre_id)
);

create table sessions_qcm (
  id              uuid primary key default gen_random_uuid(),
  profil_id       uuid not null references profils(id) on delete cascade,
  mode            text not null check (mode in ('entrainement','examen_blanc')),
  module_id       integer references modules(id),
  theme_id        integer references themes(id),
  annee           smallint not null references referentiels(annee),
  duree_limite_s  integer,                         -- 5400 pour l'examen blanc
  debut           timestamptz not null default now(),
  fin             timestamptz,
  nb_questions    smallint not null,
  score           numeric(5,2)
);

create table reponses (
  session_id      uuid references sessions_qcm(id) on delete cascade,
  question_id     text references questions(id),
  ordre           smallint not null,
  reponse_donnee  jsonb,
  est_correcte    boolean,
  temps_s         integer,
  primary key (session_id, question_id)
);

create table revisions_flashcards (
  profil_id           uuid references profils(id) on delete cascade,
  flashcard_id        integer references flashcards(id) on delete cascade,
  facteur_facilite    numeric(4,2) not null default 2.5,
  intervalle_jours    integer not null default 0,
  repetitions         integer not null default 0,
  prochaine_revision  date not null default current_date,
  primary key (profil_id, flashcard_id)
);

create table bulletins_simules (
  id         uuid primary key default gen_random_uuid(),
  profil_id  uuid not null references profils(id) on delete cascade,
  annee      smallint not null references referentiels(annee),
  libelle    text,
  saisie     jsonb not null,
  resultat   jsonb not null,
  cree_le    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. VUE POINTS FAIBLES (30 derniers jours, ≥ 5 questions, < 60 %)
-- ---------------------------------------------------------------------
create view vue_points_faibles as
select s.profil_id,
       qt.theme_id,
       count(*)                                         as nb_reponses,
       round(avg(case when r.est_correcte then 1 else 0 end) * 100, 1) as taux_reussite
from reponses r
join sessions_qcm s     on s.id = r.session_id
join questions_themes qt on qt.question_id = r.question_id
where s.debut > now() - interval '30 days'
group by s.profil_id, qt.theme_id
having count(*) >= 5
   and avg(case when r.est_correcte then 1 else 0 end) < 0.60;

-- ---------------------------------------------------------------------
-- 5. SÉCURITÉ — ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
create or replace function est_formateur() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profils where id = auth.uid() and role in ('formateur','admin'));
$$;

-- Contenu : lecture publique, écriture formateur
do $$
declare t text;
begin
  foreach t in array array['referentiels','parametres_legaux','modules','chapitres','themes',
                           'flashcards','cas_pratiques','glossaire','calendrier_social','questions_themes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy lecture_publique on %I for select using (true)', t);
    execute format('create policy ecriture_formateur on %I for all using (est_formateur()) with check (est_formateur())', t);
  end loop;
end $$;

-- Questions : la bonne réponse n'est jamais lisible directement par un apprenant
alter table questions enable row level security;
create policy questions_formateur on questions for all using (est_formateur()) with check (est_formateur());

create view questions_publiques as
  select id, module_id, chapitre_id, niveau, type, enonce, choix, annees_valides
  from questions where actif;

-- Correction côté serveur : renvoie la correction APRÈS enregistrement de la réponse
create or replace function corriger_reponse(p_session uuid, p_question text, p_reponse jsonb, p_temps integer)
returns table (est_correcte boolean, bonne_reponse jsonb, explication text, reference text, piege text)
language plpgsql security definer as $$
declare q questions%rowtype; ok boolean;
begin
  if not exists (select 1 from sessions_qcm where id = p_session and profil_id = auth.uid()) then
    raise exception 'Session inconnue';
  end if;
  select * into q from questions where id = p_question;
  ok := (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(p_reponse) x)
      = (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(q.bonne_reponse) x);
  update reponses set reponse_donnee = p_reponse, est_correcte = ok, temps_s = p_temps
   where session_id = p_session and question_id = p_question;
  return query select ok, q.bonne_reponse, q.explication, q.reference, q.piege;
end $$;

-- Données personnelles : propriétaire uniquement
alter table profils enable row level security;
create policy profil_soi on profils for all using (id = auth.uid()) with check (id = auth.uid());
create policy profil_formateur_lecture on profils for select using (est_formateur());

do $$
declare t text;
begin
  foreach t in array array['progression_chapitres','sessions_qcm','revisions_flashcards','bulletins_simules']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy proprietaire on %I for all using (profil_id = auth.uid()) with check (profil_id = auth.uid())', t);
  end loop;
end $$;

alter table reponses enable row level security;
create policy reponses_proprietaire on reponses for all
  using (exists (select 1 from sessions_qcm s where s.id = session_id and s.profil_id = auth.uid()))
  with check (exists (select 1 from sessions_qcm s where s.id = session_id and s.profil_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. DONNÉES INITIALES
-- ---------------------------------------------------------------------
insert into referentiels (annee, libelle, statut)
values (2026, 'Référentiel Gestionnaire de paie 2026', 'brouillon');
