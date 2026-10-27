-- Étape 24 : limite atomique des tentatives sur le suivi public candidat.
-- La clé fournie est déjà hachée dans l'Edge Function ; aucune IP brute n'est stockée.
create table if not exists public.limitation_suivi_candidat (
  cle_reseau_hash text primary key
    check (cle_reseau_hash ~ '^[0-9a-f]{64}$'),
  debut_fenetre timestamptz not null default now(),
  tentatives integer not null default 0 check (tentatives >= 0),
  updated_at timestamptz not null default now()
);

alter table public.limitation_suivi_candidat enable row level security;
revoke all on table public.limitation_suivi_candidat from public, anon, authenticated;
grant all on table public.limitation_suivi_candidat to service_role;

create or replace function public.autoriser_consultation_candidat(p_cle_reseau_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tentatives integer;
  v_debut timestamptz;
  v_maintenant timestamptz := clock_timestamp();
begin
  if p_cle_reseau_hash is null or p_cle_reseau_hash !~ '^[0-9a-f]{64}$' then
    raise exception using message = 'CLE_RESEAU_INVALIDE';
  end if;

  insert into public.limitation_suivi_candidat(cle_reseau_hash, debut_fenetre, tentatives, updated_at)
  values (p_cle_reseau_hash, v_maintenant, 1, v_maintenant)
  on conflict (cle_reseau_hash) do update
    set debut_fenetre = case
          when public.limitation_suivi_candidat.debut_fenetre <= v_maintenant - interval '15 minutes' then v_maintenant
          else public.limitation_suivi_candidat.debut_fenetre
        end,
        tentatives = case
          when public.limitation_suivi_candidat.debut_fenetre <= v_maintenant - interval '15 minutes' then 1
          else public.limitation_suivi_candidat.tentatives + 1
        end,
        updated_at = v_maintenant
  returning tentatives, debut_fenetre into v_tentatives, v_debut;

  -- Nettoyage opportuniste des empreintes inactives depuis plus de 24 heures.
  delete from public.limitation_suivi_candidat
    where updated_at < v_maintenant - interval '24 hours'
      and cle_reseau_hash <> p_cle_reseau_hash;

  -- 20 requêtes par fenêtre de 15 minutes et par adresse réseau.
  return v_tentatives <= 20;
end;
$$;

revoke all on function public.autoriser_consultation_candidat(text) from public, anon, authenticated;
grant execute on function public.autoriser_consultation_candidat(text) to service_role;
