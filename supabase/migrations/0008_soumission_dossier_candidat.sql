-- Étape 9 : enregistrement atomique des pièces, œuvres et attestations du candidat.
-- L'appel est exclusivement serveur ; le code de suivi est vérifié avant toute écriture.
create or replace function public.soumettre_demande_candidat_securisee(
  p_numero_dossier text,
  p_code_suivi_hash text,
  p_pieces jsonb,
  p_oeuvres jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_demande public.demande_adhesion%rowtype;
  v_piece jsonb;
  v_oeuvre jsonb;
  v_attestation jsonb;
  v_oeuvre_id uuid;
  v_date timestamptz := now();
  v_nb_oeuvres integer := 0;
  v_nb_pieces integer := 0;
  v_nb_attestations integer := 0;
  v_chemin text;
  v_mime text;
  v_taille integer;
  v_type public.type_piece;
  v_categorie uuid;
begin
  if p_numero_dossier is null or p_code_suivi_hash is null
     or jsonb_typeof(p_pieces) <> 'array' or jsonb_typeof(p_oeuvres) <> 'array' then
    raise exception using message = 'ENTREE_INVALIDE';
  end if;

  select * into v_demande from public.demande_adhesion
  where numero_dossier = p_numero_dossier and jeton_suivi_hash = p_code_suivi_hash
  for update;
  if not found then raise exception using message = 'CODE_SUIVI_INVALIDE'; end if;
  if v_demande.statut <> 'BROUILLON' then raise exception using message = 'DEMANDE_NON_MODIFIABLE'; end if;

  if jsonb_array_length(p_oeuvres) < 2 then raise exception using message = 'DOSSIER_INCOMPLET'; end if;
  if jsonb_array_length(p_pieces) < 1 then raise exception using message = 'DOSSIER_INCOMPLET'; end if;

  -- Validate everything before inserting any metadata.
  for v_piece in select value from jsonb_array_elements(p_pieces) loop
    if coalesce(v_piece->>'type','') not in ('PHOTO','CIN','ACTE_NAISSANCE','CERTIFICAT_RESIDENCE','AUTORISATION_PARENTALE','AUTRE') then
      raise exception using message = 'PIECE_INVALIDE';
    end if;
    v_chemin := coalesce(v_piece->>'chemin_stockage','');
    v_mime := coalesce(v_piece->>'mime_type','');
    begin v_taille := (v_piece->>'taille_octets')::integer; exception when others then raise exception using message = 'FICHIER_INVALIDE'; end;
    if v_chemin !~ ('^pieces/' || p_numero_dossier || '/.+') or v_taille <= 0 or v_taille > 20971520
       or v_mime not in ('application/pdf','image/jpeg','image/png') then raise exception using message = 'FICHIER_INVALIDE'; end if;
  end loop;

  for v_oeuvre in select value from jsonb_array_elements(p_oeuvres) loop
    v_nb_oeuvres := v_nb_oeuvres + 1;
    if length(btrim(coalesce(v_oeuvre->>'titre',''))) < 2 then raise exception using message = 'OEUVRE_INVALIDE'; end if;
    begin v_categorie := (v_oeuvre->>'categorie_id')::uuid; exception when others then raise exception using message = 'OEUVRE_INVALIDE'; end;
    if not exists(select 1 from public.categorie where id = v_categorie and actif) then raise exception using message = 'CATEGORIE_INDISPONIBLE'; end if;
    v_chemin := coalesce(v_oeuvre #>> '{fichier,chemin_stockage}','');
    v_mime := coalesce(v_oeuvre #>> '{fichier,mime_type}','');
    begin v_taille := (v_oeuvre #>> '{fichier,taille_octets}')::integer; exception when others then raise exception using message = 'FICHIER_INVALIDE'; end;
    if v_chemin !~ ('^oeuvres/' || p_numero_dossier || '/.+') or v_taille <= 0 or v_taille > 20971520
       or v_mime not in ('audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png') then raise exception using message = 'FICHIER_INVALIDE'; end if;
    if coalesce(jsonb_typeof(v_oeuvre->'attestations'), '') <> 'array' or coalesce(jsonb_array_length(v_oeuvre->'attestations'), 0) < 1 then
      raise exception using message = 'ATTESTATION_REQUISE';
    end if;
    for v_attestation in select value from jsonb_array_elements(v_oeuvre->'attestations') loop
      v_chemin := coalesce(v_attestation->>'chemin_stockage','');
      v_mime := coalesce(v_attestation->>'mime_type','');
      begin v_taille := (v_attestation->>'taille_octets')::integer; exception when others then raise exception using message = 'FICHIER_INVALIDE'; end;
      if v_chemin !~ ('^pieces/' || p_numero_dossier || '/.+') or v_taille <= 0 or v_taille > 20971520
         or v_mime not in ('application/pdf','image/jpeg','image/png') then raise exception using message = 'FICHIER_INVALIDE'; end if;
    end loop;
  end loop;

  if v_nb_oeuvres < 2 then raise exception using message = 'DOSSIER_INCOMPLET'; end if;

  for v_piece in select value from jsonb_array_elements(p_pieces) loop
    insert into public.piece(demande_adhesion_id, type, chemin_stockage, mime_type, taille_octets)
    values (v_demande.id, (v_piece->>'type')::public.type_piece, v_piece->>'chemin_stockage', v_piece->>'mime_type', (v_piece->>'taille_octets')::integer);
    v_nb_pieces := v_nb_pieces + 1;
  end loop;

  for v_oeuvre in select value from jsonb_array_elements(p_oeuvres) loop
    insert into public.oeuvre(demande_adhesion_id, categorie_id, titre, description, annee, statut, chemin_fichier, mime_type, taille_octets)
    values (v_demande.id, (v_oeuvre->>'categorie_id')::uuid, btrim(v_oeuvre->>'titre'), nullif(btrim(coalesce(v_oeuvre->>'description','')), ''),
      nullif(v_oeuvre->>'annee','')::integer, 'BROUILLON', v_oeuvre #>> '{fichier,chemin_stockage}', v_oeuvre #>> '{fichier,mime_type}', (v_oeuvre #>> '{fichier,taille_octets}')::integer)
    returning id into v_oeuvre_id;
    for v_attestation in select value from jsonb_array_elements(v_oeuvre->'attestations') loop
      insert into public.attestation_diffusion(oeuvre_id, chemin_stockage, mime_type, taille_octets)
      values (v_oeuvre_id, v_attestation->>'chemin_stockage', v_attestation->>'mime_type', (v_attestation->>'taille_octets')::integer);
      v_nb_attestations := v_nb_attestations + 1;
    end loop;
  end loop;

  update public.demande_adhesion set statut = 'ENVOYEE', date_soumission = v_date, updated_at = v_date where id = v_demande.id;
  return jsonb_build_object('numero_dossier', v_demande.numero_dossier, 'code_suivi', null,
    'statut', 'ENVOYEE', 'date_soumission', v_date, 'delai_indicatif_heures', 72,
    'nombre_pieces', v_nb_pieces, 'nombre_oeuvres', v_nb_oeuvres, 'nombre_attestations', v_nb_attestations);
end;
$$;

revoke all on function public.soumettre_demande_candidat_securisee(text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.soumettre_demande_candidat_securisee(text,text,jsonb,jsonb) to service_role;
