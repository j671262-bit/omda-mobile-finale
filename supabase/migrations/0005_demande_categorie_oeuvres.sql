-- OMDA Mobile — Étape 3 : demandes de catégories supplémentaires avec œuvres.
-- À exécuter après les migrations 0001 à 0004.
-- Les écritures passent par une RPC SECURITY DEFINER qui vérifie auth.uid().

create table if not exists public.demande_categorie_oeuvre (
  id uuid primary key default gen_random_uuid(),
  membre_categorie_id uuid not null references public.membre_categorie(id) on delete cascade,
  titre text not null check (length(btrim(titre)) > 0),
  chemin_fichier text not null,
  mime_fichier text not null check (mime_fichier in ('audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png')),
  taille_fichier_octets integer not null check (taille_fichier_octets between 1 and 20971520),
  chemin_attestation text not null,
  mime_attestation text not null check (mime_attestation in ('application/pdf','image/jpeg','image/png')),
  taille_attestation_octets integer not null check (taille_attestation_octets between 1 and 20971520),
  created_at timestamptz not null default now()
);

create index if not exists demande_categorie_oeuvre_appartenance_idx
  on public.demande_categorie_oeuvre (membre_categorie_id);

alter table public.demande_categorie_oeuvre enable row level security;

drop policy if exists demande_categorie_oeuvre_select_owner on public.demande_categorie_oeuvre;
create policy demande_categorie_oeuvre_select_owner
  on public.demande_categorie_oeuvre for select to authenticated
  using (exists (
    select 1 from public.membre_categorie mc
    join public.membre m on m.id = mc.membre_id
    where mc.id = membre_categorie_id and m.utilisateur_id = auth.uid()
  ) or public.is_agent_or_admin());

revoke all on public.demande_categorie_oeuvre from anon, authenticated;
grant select on public.demande_categorie_oeuvre to authenticated;

create or replace function public.demander_categorie_supplementaire(
  p_categorie_id uuid,
  p_oeuvres jsonb default '[]'::jsonb,
  p_exiger_oeuvres boolean default false
)
returns public.membre_categorie
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_utilisateur_id uuid := auth.uid();
  v_membre_id uuid;
  v_categorie public.categorie%rowtype;
  v_existante public.membre_categorie%rowtype;
  v_resultat public.membre_categorie%rowtype;
  v_oeuvre jsonb;
  v_nb integer;
  v_titre text;
  v_mime_fichier text;
  v_mime_attestation text;
  v_taille_fichier integer;
  v_taille_attestation integer;
  v_chemin_fichier text;
  v_chemin_attestation text;
begin
  if v_utilisateur_id is null then
    raise exception using message = 'NON_AUTHENTIFIE';
  end if;

  select m.id into v_membre_id
  from public.membre m
  where m.utilisateur_id = v_utilisateur_id and m.statut = 'ACTIF';
  if v_membre_id is null then
    raise exception using message = 'NON_AUTHENTIFIE';
  end if;

  select * into v_categorie from public.categorie c
  where c.id = p_categorie_id and c.actif = true;
  if not found then
    raise exception using message = 'CATEGORIE_INDISPONIBLE';
  end if;

  if p_oeuvres is null or jsonb_typeof(p_oeuvres) <> 'array' then
    raise exception using message = 'OEUVRE_INCOMPLETE';
  end if;
  v_nb := jsonb_array_length(p_oeuvres);
  if p_exiger_oeuvres and v_nb < 2 then
    raise exception using message = 'OEUVRE_MINIMUM_REQUIS';
  end if;

  -- Validation complète avant toute écriture.
  for v_oeuvre in select value from jsonb_array_elements(p_oeuvres)
  loop
    v_titre := btrim(coalesce(v_oeuvre->>'titre', ''));
    v_chemin_fichier := btrim(coalesce(v_oeuvre #>> '{fichier,chemin_stockage}', ''));
    v_chemin_attestation := btrim(coalesce(v_oeuvre #>> '{attestation,chemin_stockage}', ''));
    v_mime_fichier := coalesce(v_oeuvre #>> '{fichier,mime_type}', '');
    v_mime_attestation := coalesce(v_oeuvre #>> '{attestation,mime_type}', '');
    begin
      v_taille_fichier := (v_oeuvre #>> '{fichier,taille_octets}')::integer;
      v_taille_attestation := (v_oeuvre #>> '{attestation,taille_octets}')::integer;
    exception when others then
      raise exception using message = 'OEUVRE_INCOMPLETE';
    end;

    if v_titre = '' or v_chemin_fichier = '' then
      raise exception using message = 'OEUVRE_INCOMPLETE';
    end if;
    if v_chemin_attestation = '' then
      raise exception using message = 'ATTESTATION_MANQUANTE';
    end if;
    if v_taille_fichier > 20971520 or v_taille_attestation > 20971520
      or v_taille_fichier < 1 or v_taille_attestation < 1 then
      raise exception using message = 'FICHIER_TROP_VOLUMINEUX';
    end if;
    if v_mime_fichier not in ('audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png')
      or v_mime_attestation not in ('application/pdf','image/jpeg','image/png') then
      raise exception using message = 'TYPE_FICHIER_NON_AUTORISE';
    end if;
  end loop;

  select * into v_existante from public.membre_categorie mc
  where mc.membre_id = v_membre_id and mc.categorie_id = p_categorie_id
  for update;

  if found and v_existante.statut = 'EN_ATTENTE' then
    raise exception using message = 'CATEGORIE_DEJA_DEMANDEE';
  end if;
  if found and v_existante.statut not in ('ANNULEE','REJETEE') then
    raise exception using message = 'CATEGORIE_DEJA_ENREGISTREE';
  end if;

  if v_existante.id is null then
    insert into public.membre_categorie (membre_id, categorie_id, statut, date_activation)
    values (v_membre_id, p_categorie_id, 'EN_ATTENTE', now())
    returning * into v_resultat;
  else
    update public.membre_categorie
      set statut = 'EN_ATTENTE', date_activation = now()
      where id = v_existante.id
      returning * into v_resultat;
  end if;

  delete from public.demande_categorie_oeuvre where membre_categorie_id = v_resultat.id;
  for v_oeuvre in select value from jsonb_array_elements(p_oeuvres)
  loop
    insert into public.demande_categorie_oeuvre (
      membre_categorie_id, titre, chemin_fichier, mime_fichier, taille_fichier_octets,
      chemin_attestation, mime_attestation, taille_attestation_octets
    ) values (
      v_resultat.id,
      btrim(v_oeuvre->>'titre'),
      v_oeuvre #>> '{fichier,chemin_stockage}',
      v_oeuvre #>> '{fichier,mime_type}',
      (v_oeuvre #>> '{fichier,taille_octets}')::integer,
      v_oeuvre #>> '{attestation,chemin_stockage}',
      v_oeuvre #>> '{attestation,mime_type}',
      (v_oeuvre #>> '{attestation,taille_octets}')::integer
    );
  end loop;

  return v_resultat;
end;
$$;

revoke all on function public.demander_categorie_supplementaire(uuid, jsonb, boolean) from public, anon;
grant execute on function public.demander_categorie_supplementaire(uuid, jsonb, boolean) to authenticated;

-- Les pièces jointes d'une demande annulée ne doivent plus rester associées.
create or replace function public.nettoyer_oeuvres_demande_categorie_annulee()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.statut = 'ANNULEE' and old.statut is distinct from new.statut then
    delete from public.demande_categorie_oeuvre where membre_categorie_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_nettoyer_oeuvres_demande_categorie_annulee on public.membre_categorie;
create trigger trg_nettoyer_oeuvres_demande_categorie_annulee
after update of statut on public.membre_categorie
for each row execute function public.nettoyer_oeuvres_demande_categorie_annulee();
