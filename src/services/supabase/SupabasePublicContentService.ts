/**
 * Contenus publics réels — lecture depuis Supabase.
 * Les tarifs affichés sont ceux actifs et valides à la date courante.
 */
import type { PostgrestError } from '@supabase/supabase-js';
import type { Categorie, Documentation, OperateurMobileMoney, Tarif } from '../../models';
import type {
  EstimationMontant,
  EstimationMontantEntree,
  ListerTarifsEntree,
  PublicContentService,
  Result,
} from '../contracts';
import { erreurMetier, erreurReseau, erreurServeur, ok } from '../contracts';
import { estSupabaseConfigure, getSupabaseClient, MESSAGE_SUPABASE_NON_CONFIGURE } from './client';

const MENTION_ESTIMATION = 'Estimation — le montant final est confirmé par le serveur.';

function texteDe(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return 'Erreur inconnue';
}

function classerErreur(error: PostgrestError) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return erreurReseau(error.message);
  }
  return erreurServeur({
    reference: error.code || undefined,
    message: 'Les informations publiques ne peuvent pas être chargées pour le moment.',
  });
}

function dateDuJour(): string {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function requeteTarifs(entree?: ListerTarifsEntree) {
  const client = getSupabaseClient();
  const aujourdHui = dateDuJour();
  let requete = client.from('tarif').select('*').eq('actif', true);
  if (entree?.type_operation) requete = requete.eq('type_operation', entree.type_operation);
  if (entree?.categorie_id !== undefined) {
    requete = entree.categorie_id === null
      ? requete.is('categorie_id', null)
      : requete.eq('categorie_id', entree.categorie_id);
  }
  return requete.order('type_operation').order('categorie_id');
}

export class SupabasePublicContentService implements PublicContentService {
  async listerDocumentation(): Promise<Result<Documentation[]>> {
    if (!estSupabaseConfigure()) return erreurServeur({ message: MESSAGE_SUPABASE_NON_CONFIGURE });
    try {
      const { data, error } = await getSupabaseClient()
        .from('documentation').select('*').eq('publie', true).order('ordre').order('titre');
      if (error) return classerErreur(error);
      return ok((data ?? []) as Documentation[]);
    } catch (cause) {
      return erreurReseau(texteDe(cause));
    }
  }

  async obtenirArticle(slug: string): Promise<Result<Documentation>> {
    if (!estSupabaseConfigure()) return erreurServeur({ message: MESSAGE_SUPABASE_NON_CONFIGURE });
    try {
      const { data, error } = await getSupabaseClient()
        .from('documentation').select('*').eq('slug', slug.trim().toLowerCase()).eq('publie', true).maybeSingle();
      if (error) return classerErreur(error);
      if (!data) return erreurMetier('ARTICLE_INTROUVABLE', 'Cet article n’est pas disponible. Revenez à la liste de la documentation.');
      return ok(data as Documentation);
    } catch (cause) {
      return erreurReseau(texteDe(cause));
    }
  }

  async listerCategories(): Promise<Result<Categorie[]>> {
    if (!estSupabaseConfigure()) return erreurServeur({ message: MESSAGE_SUPABASE_NON_CONFIGURE });
    try {
      const { data, error } = await getSupabaseClient()
        .from('categorie').select('*').eq('actif', true).order('libelle');
      if (error) return classerErreur(error);
      return ok((data ?? []) as Categorie[]);
    } catch (cause) {
      return erreurReseau(texteDe(cause));
    }
  }

  async listerTarifs(entree?: ListerTarifsEntree): Promise<Result<Tarif[]>> {
    if (!estSupabaseConfigure()) return erreurServeur({ message: MESSAGE_SUPABASE_NON_CONFIGURE });
    try {
      const { data, error } = await requeteTarifs(entree);
      if (error) return classerErreur(error);
      const aujourdHui = dateDuJour();
      const tarifsValides = ((data ?? []) as Tarif[]).filter((tarif) =>
        (tarif.date_debut === null || tarif.date_debut <= aujourdHui) &&
        (tarif.date_fin === null || tarif.date_fin >= aujourdHui),
      );
      return ok(tarifsValides);
    } catch (cause) {
      return erreurReseau(texteDe(cause));
    }
  }

  async estimerMontant(entree: EstimationMontantEntree): Promise<Result<EstimationMontant>> {
    const categorieId = entree.categorie_id ?? null;
    // Un tarif propre à la catégorie est prioritaire ; sinon, on utilise le tarif général.
    const specifique = await this.listerTarifs({ type_operation: entree.type_operation, categorie_id: categorieId });
    if (!specifique.ok) return specifique;
    let tarif = specifique.valeur[0] ?? null;
    if (!tarif && categorieId !== null) {
      const general = await this.listerTarifs({ type_operation: entree.type_operation, categorie_id: null });
      if (!general.ok) return general;
      tarif = general.valeur[0] ?? null;
    }
    if (!tarif) {
      return erreurMetier('TARIF_INDISPONIBLE', 'Aucun tarif n’est disponible pour cette opération. Veuillez réessayer plus tard.');
    }
    return ok({
      type_operation: entree.type_operation,
      categorie_id: categorieId,
      montant: tarif.montant,
      devise: tarif.devise,
      estimation: true,
      mention: MENTION_ESTIMATION,
      valide_jusqu_au: tarif.date_fin,
    });
  }

  async listerOperateursMobileMoney(): Promise<Result<OperateurMobileMoney[]>> {
    if (!estSupabaseConfigure()) return erreurServeur({ message: MESSAGE_SUPABASE_NON_CONFIGURE });
    try {
      const { data, error } = await getSupabaseClient()
        .from('operateur_mobile_money').select('code, libelle, actif, ordre, updated_at')
        .eq('actif', true).order('ordre').order('libelle');
      if (error) return classerErreur(error);
      return ok((data ?? []) as OperateurMobileMoney[]);
    } catch (cause) {
      return erreurReseau(texteDe(cause));
    }
  }
}
