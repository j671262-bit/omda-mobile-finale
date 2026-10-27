import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DateISO, UUID } from '../models';
import type {
  OeuvreAdhesionEntree,
  PieceEntree,
} from '../services/contracts';

/** Clé de stockage local pour le brouillon d'adhésion. */
const CLE_STORAGE_ADHESION_DRAFT = 'omda_adhesion_draft_v1';
/** Copie de secours conservée pendant une écriture interrompue. */
const CLE_STORAGE_ADHESION_DRAFT_BACKUP = 'omda_adhesion_draft_v1_backup';

/**
 * Données d'identité du candidat dans le brouillon.
 * Tolère des champs vides pendant la saisie progressive.
 */
export type IdentiteDraft = {
  nom: string;
  prenom: string;
  date_naissance: DateISO | '';
  cin: string;
  telephone: string;
  email: string;
  adresse: string;
};

/**
 * Données complètes du brouillon d'adhésion conservées en local.
 */
export type EtatEnvoiLocal = 'SAISIE_LOCALE' | 'BROUILLON_SERVEUR' | 'ENVOI_INCERTAIN' | 'ENVOI_CONFIRME';

export type AdhesionDraft = {
  identite: IdentiteDraft;
  categorie_id: UUID | null;
  pieces: PieceEntree[];
  oeuvres: OeuvreAdhesionEntree[];
  numero_dossier: string | null;
  code_suivi: string | null;
  /** État local de l'envoi, distinct du statut officiel fourni par le serveur. */
  etat_envoi_local: EtatEnvoiLocal;
  derniere_mise_a_jour: string;
};

export const IDENTITE_VIDE: IdentiteDraft = {
  nom: '',
  prenom: '',
  date_naissance: '',
  cin: '',
  telephone: '+261',
  email: '',
  adresse: '',
};


/** Vérifie les champs essentiels avant de réutiliser un JSON persistant. */
function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function texte(valeur: unknown, defaut = ''): string {
  return typeof valeur === 'string' ? valeur : defaut;
}

function nettoyerIdentite(valeur: unknown): IdentiteDraft {
  const source = estObjet(valeur) ? valeur : {};
  return {
    nom: texte(source.nom),
    prenom: texte(source.prenom),
    date_naissance: texte(source.date_naissance) as DateISO | '',
    cin: texte(source.cin),
    telephone: texte(source.telephone, '+261'),
    email: texte(source.email),
    adresse: texte(source.adresse),
  };
}

function nettoyerBrouillon(valeur: unknown): AdhesionDraft | null {
  if (!estObjet(valeur)) return null;
  const pieces = Array.isArray(valeur.pieces) ? valeur.pieces.filter((item) =>
    estObjet(item) && typeof item.chemin_stockage === 'string' &&
    typeof item.mime_type === 'string' && typeof item.taille_octets === 'number'
  ) as PieceEntree[] : [];
  const oeuvres = Array.isArray(valeur.oeuvres) ? valeur.oeuvres.filter((item) => {
    if (!estObjet(item) || typeof item.titre !== 'string' || typeof item.categorie_id !== 'string') return false;
    if (!estObjet(item.fichier) || typeof item.fichier.chemin_stockage !== 'string') return false;
    return Array.isArray(item.attestations) && item.attestations.every((fichier) =>
      estObjet(fichier) && typeof fichier.chemin_stockage === 'string' &&
      typeof fichier.mime_type === 'string' && typeof fichier.taille_octets === 'number'
    );
  }) as OeuvreAdhesionEntree[] : [];
  const dateMaj = texte(valeur.derniere_mise_a_jour);
  return {
    identite: nettoyerIdentite(valeur.identite),
    categorie_id: typeof valeur.categorie_id === 'string' ? valeur.categorie_id as UUID : null,
    pieces,
    oeuvres,
    numero_dossier: typeof valeur.numero_dossier === 'string' ? valeur.numero_dossier : null,
    code_suivi: typeof valeur.code_suivi === 'string' ? valeur.code_suivi : null,
    etat_envoi_local: valeur.etat_envoi_local === 'ENVOI_CONFIRME'
      ? 'ENVOI_CONFIRME'
      : valeur.etat_envoi_local === 'ENVOI_INCERTAIN'
        ? 'ENVOI_INCERTAIN'
        : valeur.etat_envoi_local === 'BROUILLON_SERVEUR' || (typeof valeur.numero_dossier === 'string' && typeof valeur.code_suivi === 'string')
          ? 'BROUILLON_SERVEUR'
          : 'SAISIE_LOCALE',
    derniere_mise_a_jour: dateMaj && !Number.isNaN(Date.parse(dateMaj)) ? dateMaj : new Date().toISOString(),
  };
}

export const BROUILLON_INITIAL: AdhesionDraft = {
  identite: IDENTITE_VIDE,
  categorie_id: null,
  pieces: [],
  oeuvres: [],
  numero_dossier: null,
  code_suivi: null,
  etat_envoi_local: 'SAISIE_LOCALE',
  derniere_mise_a_jour: new Date().toISOString(),
};

/**
 * Calcule l'âge révolu à la date courante à partir d'une date de naissance (AAAA-MM-JJ).
 * Renvoie `null` si la date est incomplète ou invalide.
 */
export function calculerAge(date_naissance: string): number | null {
  const propre = date_naissance.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(propre)) {
    return null;
  }
  const dateObj = new Date(`${propre}T00:00:00.000Z`);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }
  const aujourdHui = new Date();
  let age = aujourdHui.getUTCFullYear() - dateObj.getUTCFullYear();
  const ecartMois = aujourdHui.getUTCMonth() - dateObj.getUTCMonth();
  if (ecartMois < 0 || (ecartMois === 0 && aujourdHui.getUTCDate() < dateObj.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export type AdhesionDraftContextType = {
  brouillon: AdhesionDraft;
  estCharge: boolean;
  erreurPersistance: boolean;
  mettreAJourIdentite: (partial: Partial<IdentiteDraft>) => Promise<void>;
  definirCategorie: (categorieId: UUID) => Promise<void>;
  mettreAJourPieces: (pieces: PieceEntree[]) => Promise<void>;
  mettreAJourOeuvres: (oeuvres: OeuvreAdhesionEntree[]) => Promise<void>;
  definirIdentifiantsDossier: (numeroDossier: string, codeSuivi: string) => Promise<void>;
  marquerEnvoiIncertain: () => Promise<void>;
  marquerEnvoiConfirme: () => Promise<void>;
  reinitialiserBrouillon: () => Promise<void>;
  age: number | null;
  estMineur15A17: boolean;
  estMoinsDe15Ans: boolean;
  identiteEstValide: boolean;
};

const AdhesionDraftContext = createContext<AdhesionDraftContextType | undefined>(undefined);

export function AdhesionDraftProvider({ children }: { children: ReactNode }) {
  const [brouillon, setBrouillon] = useState<AdhesionDraft>(BROUILLON_INITIAL);
  const [estCharge, setEstCharge] = useState(false);
  const [erreurPersistance, setErreurPersistance] = useState(false);
  // Sérialise les écritures afin qu'une ancienne sauvegarde ne remplace pas la plus récente.
  const fileEcritures = useMemo(() => ({ courant: Promise.resolve() }), []);
  // Évite qu'une restauration asynchrone écrase une saisie déjà commencée.
  const modificationLocaleCommencee = useRef(false);

  useEffect(() => {
    let actif = true;
    async function chargerDepuisStockage() {
      try {
        const contenu = await AsyncStorage.getItem(CLE_STORAGE_ADHESION_DRAFT);
        const secours = await AsyncStorage.getItem(CLE_STORAGE_ADHESION_DRAFT_BACKUP);
        const lireValide = (json: string | null): AdhesionDraft | null => {
          if (!json) return null;
          try {
            return nettoyerBrouillon(JSON.parse(json) as unknown);
          } catch {
            return null;
          }
        };
        const principalValide = lireValide(contenu);
        const secoursValide = lireValide(secours);
        if (actif && !modificationLocaleCommencee.current) {
          if (principalValide) {
            setBrouillon(principalValide);
          } else if (secoursValide) {
            // Le principal est absent/corrompu : restaurer la dernière copie valide.
            setBrouillon(secoursValide);
            await AsyncStorage.setItem(CLE_STORAGE_ADHESION_DRAFT, JSON.stringify(secoursValide));
          } else if (contenu || secours) {
            // Ne supprimer les clés que si aucune version n'est récupérable.
            await AsyncStorage.multiRemove([CLE_STORAGE_ADHESION_DRAFT, CLE_STORAGE_ADHESION_DRAFT_BACKUP]);
          }
        }
      } catch (erreur) {
        setErreurPersistance(true);
      console.warn('[AdhesionDraft] Erreur de lecture locale :', erreur);
      } finally {
        if (actif) {
          setEstCharge(true);
        }
      }
    }
    void chargerDepuisStockage();
    return () => {
      actif = false;
    };
  }, []);

  const persister = useCallback(async (nouveau: AdhesionDraft) => {
    fileEcritures.courant = fileEcritures.courant.then(async () => {
      try {
        const precedent = await AsyncStorage.getItem(CLE_STORAGE_ADHESION_DRAFT);
        if (precedent) {
          // Conserver la version précédente avant de remplacer le principal.
          // Si l'application s'arrête au milieu, la copie peut être restaurée au prochain démarrage.
          const precedentValide = nettoyerBrouillon(JSON.parse(precedent) as unknown);
          if (precedentValide) {
            await AsyncStorage.setItem(CLE_STORAGE_ADHESION_DRAFT_BACKUP, JSON.stringify(precedentValide));
          }
        }
        await AsyncStorage.setItem(CLE_STORAGE_ADHESION_DRAFT, JSON.stringify(nouveau));
        setErreurPersistance(false);
      } catch (erreur) {
        setErreurPersistance(true);
        console.warn('[AdhesionDraft] Erreur de sauvegarde locale :', erreur);
      }
    });
    await fileEcritures.courant;
  }, [fileEcritures]);

  const mettreAJourIdentite = useCallback(
    async (partial: Partial<IdentiteDraft>) => {
      modificationLocaleCommencee.current = true;
      setBrouillon((precedent) => {
        const maj: AdhesionDraft = {
          ...precedent,
          identite: {
            ...precedent.identite,
            ...partial,
          },
          derniere_mise_a_jour: new Date().toISOString(),
        };
        void persister(maj);
        return maj;
      });
    },
    [persister],
  );

  const definirCategorie = useCallback(
    async (categorieId: UUID) => {
      modificationLocaleCommencee.current = true;
      setBrouillon((precedent) => {
        const maj: AdhesionDraft = {
          ...precedent,
          categorie_id: categorieId,
          derniere_mise_a_jour: new Date().toISOString(),
        };
        void persister(maj);
        return maj;
      });
    },
    [persister],
  );

  const mettreAJourPieces = useCallback(
    async (pieces: PieceEntree[]) => {
      modificationLocaleCommencee.current = true;
      setBrouillon((precedent) => {
        const maj: AdhesionDraft = {
          ...precedent,
          pieces,
          derniere_mise_a_jour: new Date().toISOString(),
        };
        void persister(maj);
        return maj;
      });
    },
    [persister],
  );

  const mettreAJourOeuvres = useCallback(
    async (oeuvres: OeuvreAdhesionEntree[]) => {
      modificationLocaleCommencee.current = true;
      setBrouillon((precedent) => {
        const maj: AdhesionDraft = {
          ...precedent,
          oeuvres,
          derniere_mise_a_jour: new Date().toISOString(),
        };
        void persister(maj);
        return maj;
      });
    },
    [persister],
  );

  const definirIdentifiantsDossier = useCallback(
    async (numeroDossier: string, codeSuivi: string) => {
      modificationLocaleCommencee.current = true;
      setBrouillon((precedent) => {
        const maj: AdhesionDraft = {
          ...precedent,
          numero_dossier: numeroDossier,
          code_suivi: codeSuivi,
          etat_envoi_local: 'BROUILLON_SERVEUR',
          derniere_mise_a_jour: new Date().toISOString(),
        };
        void persister(maj);
        return maj;
      });
    },
    [persister],
  );

  /** Marque une réponse réseau ambiguë : le serveur a peut-être accepté l'envoi. */
  const marquerEnvoiIncertain = useCallback(async () => {
    modificationLocaleCommencee.current = true;
    setBrouillon((precedent) => {
      const maj: AdhesionDraft = {
        ...precedent,
        etat_envoi_local: 'ENVOI_INCERTAIN',
        derniere_mise_a_jour: new Date().toISOString(),
      };
      void persister(maj);
      return maj;
    });
  }, [persister]);

  /** Mémorise qu'une consultation serveur confirme que le dossier a été soumis. */
  const marquerEnvoiConfirme = useCallback(async () => {
    modificationLocaleCommencee.current = true;
    setBrouillon((precedent) => {
      const maj: AdhesionDraft = {
        ...precedent,
        etat_envoi_local: 'ENVOI_CONFIRME',
        derniere_mise_a_jour: new Date().toISOString(),
      };
      void persister(maj);
      return maj;
    });
  }, [persister]);

  const reinitialiserBrouillon = useCallback(async () => {
    modificationLocaleCommencee.current = true;
    const nouveau: AdhesionDraft = {
      ...BROUILLON_INITIAL,
      derniere_mise_a_jour: new Date().toISOString(),
    };
    setBrouillon(nouveau);
    fileEcritures.courant = fileEcritures.courant.then(async () => {
      try {
        await AsyncStorage.multiRemove([CLE_STORAGE_ADHESION_DRAFT, CLE_STORAGE_ADHESION_DRAFT_BACKUP]);
        setErreurPersistance(false);
      } catch (erreur) {
        setErreurPersistance(true);
        console.warn('[AdhesionDraft] Erreur de réinitialisation :', erreur);
      }
    });
    await fileEcritures.courant;
  }, [fileEcritures]);

  const age = useMemo(() => {
    if (!brouillon.identite.date_naissance) {
      return null;
    }
    return calculerAge(brouillon.identite.date_naissance);
  }, [brouillon.identite.date_naissance]);

  const estMoinsDe15Ans = age !== null && age < 15;
  const estMineur15A17 = age !== null && age >= 15 && age < 18;

  const identiteEstValide = useMemo(() => {
    const i = brouillon.identite;
    if (!i.nom.trim() || !i.prenom.trim()) return false;
    if (!i.cin.trim() || !/^\d{12}$/.test(i.cin.trim())) return false;
    if (!i.telephone.trim() || !i.telephone.startsWith('+261') || i.telephone.length < 13) return false;
    if (!i.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) return false;
    if (!i.adresse.trim()) return false;
    if (age === null || age < 15) return false;
    return true;
  }, [age, brouillon.identite]);

  const valeur = useMemo<AdhesionDraftContextType>(
    () => ({
      brouillon,
      estCharge,
      erreurPersistance,
      mettreAJourIdentite,
      definirCategorie,
      mettreAJourPieces,
      mettreAJourOeuvres,
      definirIdentifiantsDossier,
      marquerEnvoiIncertain,
      marquerEnvoiConfirme,
      reinitialiserBrouillon,
      age,
      estMineur15A17,
      estMoinsDe15Ans,
      identiteEstValide,
    }),
    [
      age,
      brouillon,
      definirCategorie,
      definirIdentifiantsDossier,
      marquerEnvoiIncertain,
      marquerEnvoiConfirme,
      estCharge,
      erreurPersistance,
      estMineur15A17,
      estMoinsDe15Ans,
      identiteEstValide,
      mettreAJourIdentite,
      mettreAJourOeuvres,
      mettreAJourPieces,
      reinitialiserBrouillon,
    ],
  );

  return (
    <AdhesionDraftContext.Provider value={valeur}>
      {children}
    </AdhesionDraftContext.Provider>
  );
}

export function useAdhesionDraft(): AdhesionDraftContextType {
  const contexte = useContext(AdhesionDraftContext);
  if (!contexte) {
    throw new Error('useAdhesionDraft doit être utilisé dans un AdhesionDraftProvider');
  }
  return contexte;
}

