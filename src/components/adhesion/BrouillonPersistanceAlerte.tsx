import { InfoBanner } from '../ui';
import { useAdhesionDraft } from '../../context/AdhesionDraftContext';

/** Signale explicitement qu'une sauvegarde locale du brouillon a échoué. */
export function BrouillonPersistanceAlerte() {
  const { erreurPersistance } = useAdhesionDraft();

  if (!erreurPersistance) return null;

  return (
    <InfoBanner
      variante="error"
      titre="Sauvegarde non confirmée"
      message="Les dernières modifications n’ont pas pu être enregistrées sur cet appareil. Vérifiez l’espace disponible et réessayez avant de quitter le formulaire."
    />
  );
}
