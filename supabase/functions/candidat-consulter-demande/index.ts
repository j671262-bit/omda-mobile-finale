import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { estTypeContenu, reponseTypeContenuInvalide, lireJsonLimite, reponseCorpsTropVolumineux } from '../_shared/requestBody.ts';

const corsHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-numero-dossier, x-code-suivi',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
}

const PARCOURS_STATUTS: Record<string, Array<{ statut: string; libelle: string }>> = {
  BROUILLON: [{ statut: 'BROUILLON', libelle: 'Brouillon en préparation' }],
  ENVOYEE: [
    { statut: 'BROUILLON', libelle: 'Brouillon créé' },
    { statut: 'ENVOYEE', libelle: 'Demande envoyée' },
  ],
  EN_COURS_DE_VERIFICATION: [
    { statut: 'BROUILLON', libelle: 'Brouillon créé' },
    { statut: 'ENVOYEE', libelle: 'Demande envoyée' },
    { statut: 'EN_COURS_DE_VERIFICATION', libelle: 'Vérification du dossier' },
  ],
  VALIDEE: [
    { statut: 'BROUILLON', libelle: 'Brouillon créé' },
    { statut: 'ENVOYEE', libelle: 'Demande envoyée' },
    { statut: 'EN_COURS_DE_VERIFICATION', libelle: 'Vérification du dossier' },
    { statut: 'VALIDEE', libelle: 'Demande validée' },
    { statut: 'ADHESION_TERMINEE', libelle: 'Adhésion terminée' },
  ],
  REJETEE: [
    { statut: 'BROUILLON', libelle: 'Brouillon créé' },
    { statut: 'ENVOYEE', libelle: 'Demande envoyée' },
    { statut: 'EN_COURS_DE_VERIFICATION', libelle: 'Vérification du dossier' },
    { statut: 'REJETEE', libelle: 'Demande rejetée' },
  ],
  ADHESION_TERMINEE: [
    { statut: 'BROUILLON', libelle: 'Brouillon créé' },
    { statut: 'ENVOYEE', libelle: 'Demande envoyée' },
    { statut: 'EN_COURS_DE_VERIFICATION', libelle: 'Vérification du dossier' },
    { statut: 'VALIDEE', libelle: 'Demande validée' },
    { statut: 'ADHESION_TERMINEE', libelle: 'Adhésion terminée' },
  ],
};

function construireSuivi(demande: Record<string, any>, paiementDu: Record<string, unknown> | null) {
  const statut = String(demande.statut);
  const parcours = PARCOURS_STATUTS[statut] ?? [];
  const dateDecision = demande.date_decision ?? null;
  const etapes = parcours.map((etape, index) => {
    const actuelle = etape.statut === statut;
    let date: string | null = null;
    if (etape.statut === 'BROUILLON') date = demande.created_at ?? null;
    if (etape.statut === 'ENVOYEE') date = demande.date_soumission ?? null;
    if (etape.statut === 'VALIDEE' || etape.statut === 'REJETEE') date = etape.statut === statut ? (dateDecision ?? demande.updated_at ?? null) : null;
    if (etape.statut === 'EN_COURS_DE_VERIFICATION' && actuelle) date = demande.updated_at ?? null;
    if (etape.statut === 'ADHESION_TERMINEE' && actuelle) date = demande.updated_at ?? null;
    const indexStatut = parcours.findIndex((item) => item.statut === statut);
    return { ...etape, realisee: index <= indexStatut, date };
  });
  return {
    numero_dossier: demande.numero_dossier,
    statut,
    derniere_mise_a_jour: demande.updated_at,
    etapes,
    motif_rejet: statut === 'REJETEE' ? demande.motif_rejet : null,
    paiement_du: paiementDu,
  };
}

async function obtenirTarifAdhesion(admin: ReturnType<typeof createClient>, categorieId: string) {
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const filtreDates = (requete: any) => requete
    .or(`date_debut.is.null,date_debut.lte.${aujourdHui}`)
    .or(`date_fin.is.null,date_fin.gte.${aujourdHui}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const specifique = await filtreDates(admin.from('tarif').select('montant, devise').eq('type_operation', 'ADHESION').eq('actif', true).eq('categorie_id', categorieId));
  if (specifique.error) throw specifique.error;
  if (specifique.data) return { type: 'ADHESION', montant: specifique.data.montant, devise: String(specifique.data.devise).trim() };
  const global = await filtreDates(admin.from('tarif').select('montant, devise').eq('type_operation', 'ADHESION').eq('actif', true).is('categorie_id', null));
  if (global.error) throw global.error;
  if (!global.data) return null;
  return { type: 'ADHESION', montant: global.data.montant, devise: String(global.data.devise).trim() };
}
async function empreinte(code: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim().toUpperCase()));
  return [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

async function empreinteAdresseReseau(req: Request): Promise<string | null> {
  // Ces en-têtes doivent être définis/normalisés par la passerelle Supabase.
  // Ne jamais accepter une adresse IP dans le corps JSON fourni par le mobile.
  const directe = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip');
  const transferee = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const adresse = (directe ?? transferee ?? '').trim();
  if (!adresse || adresse.length > 128 || /[\r\n]/.test(adresse)) return null;
  return empreinte(adresse);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse(405, { code: 'METHODE_NON_AUTORISEE', message: 'Utilisez une requête POST.' });
  if (!estTypeContenu(req, 'application/json')) return reponseTypeContenuInvalide(reponse, 'application/json');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Limitation atomique en base : le mobile ne peut ni choisir la clé ni
  // réinitialiser le compteur. On échoue fermé si le limiteur est indisponible.
  const cleReseau = await empreinteAdresseReseau(req);
  if (!cleReseau) {
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service de suivi est momentanément indisponible.' });
  }
  const { data: autorise, error: limiteurError } = await admin.rpc('autoriser_consultation_candidat', { p_cle_reseau_hash: cleReseau });
  if (limiteurError || typeof autorise !== 'boolean') {
    console.error('candidat-consulter-demande rate limiter failed', limiteurError?.message ?? 'invalid limiter response');
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service de suivi est momentanément indisponible.' });
  }
  if (!autorise) {
    return reponse(429, { code: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives de suivi. Veuillez patienter avant de réessayer.' });
  }

  // Le quota est vérifié avant la lecture du corps, puis le JSON est lu avec
  // un plafond réel en flux (Content-Length seul n'est pas fiable).
  const resultatJson = await lireJsonLimite(req, 65536);
  if (!resultatJson.ok) {
    if (resultatJson.raison === 'trop_volumineux') return reponseCorpsTropVolumineux(reponse);
    return reponse(400, { code: 'JSON_INVALIDE', message: 'Le contenu envoyé est invalide.' });
  }
  const body: unknown = resultatJson.valeur;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Les informations du dossier sont invalides.' });
  const entree = body as Record<string, unknown>;
  const numero = typeof entree.numero_dossier === 'string' ? entree.numero_dossier.trim() : '';
  const code = typeof entree.code_suivi === 'string' ? entree.code_suivi.trim().toUpperCase() : '';
  if (!/^OMDA-\d{4}-\d{6,}$/.test(numero) || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Le numéro de dossier ou le code de suivi est invalide.' });
  }

  const { data: demande, error } = await admin.from('demande_adhesion')
    .select('id, numero_dossier, statut, motif_rejet, date_soumission, date_decision, created_at, updated_at, candidat_id, categorie_id, jeton_suivi_hash')
    .eq('numero_dossier', numero).maybeSingle();
  if (error) {
    console.error('candidat-consulter-demande demande query failed', error.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  const hash = await empreinte(code);
  if (!demande || demande.jeton_suivi_hash !== hash) return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est incorrect.' });
  const [candidatResult, categorieResult, piecesResult, oeuvresResult] = await Promise.all([
    admin.from('candidat').select('nom, prenom, date_naissance, cin, telephone, email, adresse').eq('id', demande.candidat_id).maybeSingle(),
    admin.from('categorie').select('id, libelle').eq('id', demande.categorie_id).maybeSingle(),
    admin.from('piece').select('id, type, mime_type, taille_octets, created_at').eq('demande_adhesion_id', demande.id),
    admin.from('oeuvre').select('id, titre, statut, created_at').eq('demande_adhesion_id', demande.id),
  ]);
  if (candidatResult.error || categorieResult.error || piecesResult.error || oeuvresResult.error || !candidatResult.data) {
    console.error('candidat-consulter-demande detail query failed');
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  let paiementDu: Record<string, unknown> | null = null;
  if (demande.statut === 'VALIDEE') {
    try {
      paiementDu = await obtenirTarifAdhesion(admin, demande.categorie_id);
    } catch (tarifError) {
      console.error('candidat-consulter-demande tariff query failed', tarifError instanceof Error ? tarifError.message : 'unknown error');
      return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le montant des frais d’adhésion est momentanément indisponible.' });
    }
    if (!paiementDu) return reponse(503, { code: 'TARIF_INDISPONIBLE', message: 'Le montant des frais d’adhésion n’est pas configuré. Veuillez réessayer plus tard.' });
  }
  const { jeton_suivi_hash: _hash, candidat_id: _candidatId, categorie_id: _categorieId, ...demandePublique } = demande;
  return reponse(200, {
    demande: demandePublique,
    identite: candidatResult.data,
    categorie: categorieResult.data,
    pieces: piecesResult.data ?? [],
    oeuvres: oeuvresResult.data ?? [],
    suivi: construireSuivi(demande, paiementDu),
  });
});
