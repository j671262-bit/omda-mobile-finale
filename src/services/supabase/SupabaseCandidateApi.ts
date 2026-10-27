/**
 * Parcours candidat hybride : opérations de dossier via les Edge Functions
 * Supabase, paiement d'adhésion conservé en mode simulé conformément au périmètre.
 * Le candidat n'utilise pas Supabase Auth.
 */
import type {
  CandidateApi,
  CreerDemandeEntree,
  DemandeBrouillon,
  MettreAJourDemandeEntree,
  SoumettreDemandeEntree,
  ConfirmationEnvoiDemande,
  TeleversementEntree,
  OptionsTeleversement,
  FichierTeleverse,
  SuiviDemandeEntree,
  SuiviDemande,
  ConsultationDemande,
  OptionsPaiementCandidat,
  InitierPaiementEntree,
  EtatPaiementCandidat,
  Result,
} from '../contracts';
import { HttpCandidateApi } from '../http/HttpCandidateApi';
import { mockCandidateApi } from '../mocks';

/**
 * Réutilise les opérations HTTP déjà migrées vers les Edge Functions :
 * création, modification, soumission, téléversement et consultation/suivi.
 * Les trois méthodes de paiement restent explicitement déléguées au mock.
 */
export class SupabaseCandidateApi implements CandidateApi {
  private readonly dossier = new HttpCandidateApi();

  creerDemande(entree: CreerDemandeEntree): Promise<Result<DemandeBrouillon>> {
    return this.dossier.creerDemande(entree);
  }

  mettreAJourDemande(
    numero_dossier: string,
    code_suivi: string,
    entree: MettreAJourDemandeEntree,
  ): Promise<Result<DemandeBrouillon>> {
    return this.dossier.mettreAJourDemande(numero_dossier, code_suivi, entree);
  }

  soumettreDemande(entree: SoumettreDemandeEntree): Promise<Result<ConfirmationEnvoiDemande>> {
    return this.dossier.soumettreDemande(entree);
  }

  televerserFichier(
    entree: TeleversementEntree,
    options?: OptionsTeleversement,
  ): Promise<Result<FichierTeleverse>> {
    return this.dossier.televerserFichier(entree, options);
  }

  suivreDemande(entree: SuiviDemandeEntree): Promise<Result<SuiviDemande>> {
    return this.dossier.suivreDemande(entree);
  }

  consulterDemande(entree: SuiviDemandeEntree): Promise<Result<ConsultationDemande>> {
    return this.dossier.consulterDemande(entree);
  }

  /** Paiement explicitement simulé : aucun prestataire réel n'est appelé. */
  obtenirOptionsPaiement(entree: SuiviDemandeEntree): Promise<Result<OptionsPaiementCandidat>> {
    return mockCandidateApi.obtenirOptionsPaiement(entree);
  }

  /** Paiement explicitement simulé : aucun prestataire réel n'est appelé. */
  initierPaiement(entree: InitierPaiementEntree): Promise<Result<EtatPaiementCandidat>> {
    return mockCandidateApi.initierPaiement(entree);
  }

  /** Statut de paiement simulé tant que le paiement réel n'est pas développé. */
  obtenirEtatPaiement(reference_interne: string): Promise<Result<EtatPaiementCandidat>> {
    return mockCandidateApi.obtenirEtatPaiement(reference_interne);
  }
}
