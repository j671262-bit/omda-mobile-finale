-- Étape 10 : modification sécurisée d'un brouillon sans compte Auth candidat.
-- Seule l'Edge Function, qui vérifie le code de suivi, peut appeler cette RPC.
create or replace function public.modifier_brouillon_candidat_securise(
  p_numero_dossier text,
  p_code_suivi_hash text,
  p_identite jsonb default '{}'::jsonb,
  p_categorie_id uuid default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_demande public.demande_adhesion%rowtype;
  v_candidat public.candidat%rowtype;
  v_date date;
  v_nom text;
  v_prenom text;
  v_cin text;
  v_telephone text;
  v_email text;
  v_adresse text;
  v_now timestamptz := now();
begin
  if coalesce(trim(p_numero_dossier), '') = '' or coalesce(trim(p_code_suivi_hash), '') = ''
     or jsonb_typeof(coalesce(p_identite, '{}'::jsonb)) <> 'object' then
    raise exception using message = 'ENTREE_INVALIDE';
  end if;

  select * into v_demande from public.demande_adhesion
  where numero_dossier = trim(p_numero_dossier) and jeton_suivi_hash = lower(trim(p_code_suivi_hash))
  for update;
  if not found then raise exception using message = 'CODE_SUIVI_INVALIDE'; end if;
  if v_demande.statut <> 'BROUILLON' then raise exception using message = 'DEMANDE_NON_MODIFIABLE'; end if;

  select * into v_candidat from public.candidat where id = v_demande.candidat_id for update;
  v_nom := btrim(coalesce(p_identite->>'nom', v_candidat.nom));
  v_prenom := btrim(coalesce(p_identite->>'prenom', v_candidat.prenom));
  v_cin := upper(btrim(coalesce(p_identite->>'cin', v_candidat.cin)));
  v_telephone := btrim(coalesce(p_identite->>'telephone', v_candidat.telephone));
  v_email := lower(btrim(coalesce(p_identite->>'email', v_candidat.email)));
  v_adresse := btrim(coalesce(p_identite->>'adresse', v_candidat.adresse));
  begin v_date := coalesce(nullif(p_identite->>'date_naissance', '')::date, v_candidat.date_naissance);
  exception when others then raise exception using message = 'DATE_NAISSANCE_INVALIDE'; end;

  if length(v_nom) < 2 or length(v_prenom) < 2 or length(v_cin) < 4 or length(v_telephone) < 8
     or length(v_email) < 5 or length(v_adresse) < 3 then
    raise exception using message = 'ENTREE_INVALIDE';
  end if;
  if v_date > current_date - interval '15 years' then raise exception using message = 'AGE_INSUFFISANT'; end if;
  if exists(select 1 from public.candidat where cin = v_cin and id <> v_candidat.id) then
    raise exception using message = 'CIN_DEJA_UTILISE';
  end if;
  if p_categorie_id is not null and not exists(select 1 from public.categorie where id = p_categorie_id and actif) then
    raise exception using message = 'CATEGORIE_INDISPONIBLE';
  end if;

  update public.candidat set nom = v_nom, prenom = v_prenom, cin = v_cin, date_naissance = v_date,
    telephone = v_telephone, email = v_email, adresse = v_adresse, updated_at = v_now
  where id = v_candidat.id;
  update public.demande_adhesion set categorie_id = coalesce(p_categorie_id, categorie_id), updated_at = v_now
  where id = v_demande.id;

  return jsonb_build_object('demande_id', v_demande.id, 'numero_dossier', v_demande.numero_dossier,
    'statut', v_demande.statut, 'created_at', v_demande.created_at, 'updated_at', v_now);
exception when unique_violation then
  raise exception using message = 'CIN_DEJA_UTILISE';
end;
$$;
revoke all on function public.modifier_brouillon_candidat_securise(text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.modifier_brouillon_candidat_securise(text,text,jsonb,uuid) to service_role;
