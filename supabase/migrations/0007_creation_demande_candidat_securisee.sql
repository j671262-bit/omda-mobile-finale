-- Étape 6 : création atomique d'un brouillon candidat sans compte Supabase Auth.
-- À exécuter après 0001–0006. Seul le rôle service_role peut appeler cette RPC.
create sequence if not exists public.numero_dossier_adhesion_seq;

create or replace function public.creer_demande_candidat_securisee(p_identite jsonb, p_categorie_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_nom text := btrim(coalesce(p_identite->>'nom', ''));
  v_prenom text := btrim(coalesce(p_identite->>'prenom', ''));
  v_cin text := upper(btrim(coalesce(p_identite->>'cin', '')));
  v_date date;
  v_telephone text := btrim(coalesce(p_identite->>'telephone', ''));
  v_email text := lower(btrim(coalesce(p_identite->>'email', '')));
  v_adresse text := btrim(coalesce(p_identite->>'adresse', ''));
  v_code text;
  v_numero text;
  v_candidat_id uuid;
  v_demande_id uuid;
  v_now timestamptz := now();
begin
  if jsonb_typeof(p_identite) <> 'object' or p_categorie_id is null then
    raise exception using message = 'ENTREE_INVALIDE';
  end if;
  if length(v_nom) < 2 or length(v_prenom) < 2 or length(v_cin) < 4
     or length(v_telephone) < 8 or length(v_email) < 5 or length(v_adresse) < 3 then
    raise exception using message = 'ENTREE_INVALIDE';
  end if;
  begin
    v_date := (p_identite->>'date_naissance')::date;
  exception when others then
    raise exception using message = 'DATE_NAISSANCE_INVALIDE';
  end;
  if v_date > current_date - interval '15 years' then
    raise exception using message = 'AGE_INSUFFISANT';
  end if;
  if not exists (select 1 from public.categorie c where c.id = p_categorie_id and c.actif) then
    raise exception using message = 'CATEGORIE_INDISPONIBLE';
  end if;

  -- Le code est renvoyé une seule fois ; seule son empreinte est persistée.
  v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' || substr(encode(gen_random_bytes(6), 'hex'), 1, 4));
  v_numero := 'OMDA-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.numero_dossier_adhesion_seq')::text, 6, '0');

  insert into public.candidat(nom, prenom, cin, date_naissance, telephone, email, adresse)
  values (v_nom, v_prenom, v_cin, v_date, v_telephone, v_email, v_adresse)
  returning id into v_candidat_id;

  insert into public.demande_adhesion(numero_dossier, jeton_suivi_hash, candidat_id, categorie_id, statut, created_at, updated_at)
  values (v_numero, encode(digest(v_code, 'sha256'), 'hex'), v_candidat_id, p_categorie_id, 'BROUILLON', v_now, v_now)
  returning id into v_demande_id;

  return jsonb_build_object(
    'demande_id', v_demande_id,
    'numero_dossier', v_numero,
    'code_suivi', v_code,
    'statut', 'BROUILLON',
    'created_at', v_now
  );
exception
  when unique_violation then
    raise exception using message = 'CIN_DEJA_UTILISE';
end;
$$;

revoke all on function public.creer_demande_candidat_securisee(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.creer_demande_candidat_securisee(jsonb, uuid) to service_role;
revoke all on sequence public.numero_dossier_adhesion_seq from public, anon, authenticated;
grant usage, select on sequence public.numero_dossier_adhesion_seq to service_role;
