-- Limitation des opérations publiques du parcours candidat par empreinte réseau.
-- Les adresses IP ne sont pas stockées en clair : seule leur empreinte SHA-256 est conservée.
CREATE TABLE IF NOT EXISTS public.limitation_operations_candidat (
  operation text NOT NULL CHECK (operation IN ('CREATION', 'MODIFICATION', 'TELEVERSEMENT', 'SOUMISSION')),
  cle_reseau_hash text NOT NULL CHECK (cle_reseau_hash ~ '^[0-9a-f]{64}$'),
  debut_fenetre timestamptz NOT NULL DEFAULT now(),
  tentatives integer NOT NULL DEFAULT 0 CHECK (tentatives >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation, cle_reseau_hash)
);

ALTER TABLE public.limitation_operations_candidat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.limitation_operations_candidat FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.limitation_operations_candidat TO service_role;

CREATE OR REPLACE FUNCTION public.autoriser_operation_candidat(
  p_cle_reseau_hash text,
  p_operation text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limite integer;
  v_debut timestamptz;
  v_tentatives integer;
  v_maintenant timestamptz := clock_timestamp();
BEGIN
  IF p_cle_reseau_hash IS NULL OR p_cle_reseau_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'CLE_RESEAU_INVALIDE';
  END IF;

  v_limite := CASE p_operation
    WHEN 'CREATION' THEN 8
    WHEN 'MODIFICATION' THEN 20
    WHEN 'TELEVERSEMENT' THEN 60
    WHEN 'SOUMISSION' THEN 10
    ELSE NULL
  END;
  IF v_limite IS NULL THEN RAISE EXCEPTION 'OPERATION_INVALIDE'; END IF;

  INSERT INTO public.limitation_operations_candidat AS l
    (operation, cle_reseau_hash, debut_fenetre, tentatives, updated_at)
  VALUES (p_operation, p_cle_reseau_hash, v_maintenant, 1, v_maintenant)
  ON CONFLICT (operation, cle_reseau_hash) DO UPDATE
  SET debut_fenetre = CASE
        WHEN l.debut_fenetre <= v_maintenant - interval '15 minutes' THEN v_maintenant
        ELSE l.debut_fenetre
      END,
      tentatives = CASE
        WHEN l.debut_fenetre <= v_maintenant - interval '15 minutes' THEN 1
        ELSE l.tentatives + 1
      END,
      updated_at = v_maintenant
  RETURNING debut_fenetre, tentatives INTO v_debut, v_tentatives;

  -- Les tentatives excédentaires restent comptabilisées jusqu'à l'expiration de la fenêtre.
  DELETE FROM public.limitation_operations_candidat
  WHERE updated_at < v_maintenant - interval '24 hours';

  RETURN v_tentatives <= v_limite;
END;
$$;

REVOKE ALL ON FUNCTION public.autoriser_operation_candidat(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autoriser_operation_candidat(text, text) TO service_role;
