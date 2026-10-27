import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, ErrorState, InfoBanner, LoadingState, ScreenContainer, StatusPill, type StatutPill } from '../../src/components/ui';
import type { StatutDemande } from '../../src/models';
import type { ConsultationDemande, ErreurApp } from '../../src/services/contracts';
import { candidateApi } from '../../src/services/factory';

const STATUTS: Record<StatutDemande, { libelle: string; variante: StatutPill }> = {
  BROUILLON: { libelle: 'Brouillon en cours', variante: 'info' },
  ENVOYEE: { libelle: 'Demande reçue', variante: 'success' },
  EN_COURS_DE_VERIFICATION: { libelle: 'Vérification du dossier', variante: 'pending' },
  VALIDEE: { libelle: 'Dossier validé', variante: 'success' },
  REJETEE: { libelle: 'Dossier rejeté', variante: 'error' },
  ADHESION_TERMINEE: { libelle: 'Adhésion finalisée', variante: 'success' },
};
function texteParam(v: string | string[] | undefined) { return typeof v === 'string' ? v.trim() : Array.isArray(v) ? String(v[0] ?? '').trim() : ''; }
function messageErreur(e: ErreurApp) { return e.type === 'metier' ? e.message : e.type === 'reseau' ? 'Connexion impossible. Vérifiez Internet puis réessayez.' : 'Le service est indisponible pour le moment.'; }

export default function DetailsDossierScreen() {
  const params = useLocalSearchParams<{ numero_dossier?: string; code_suivi?: string }>();
  const numero = texteParam(params.numero_dossier).toUpperCase();
  const code = texteParam(params.code_suivi).toUpperCase();
  const [donnees, setDonnees] = useState<ConsultationDemande | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setChargement(true); setErreur(null);
    if (!candidateApi.consulterDemande) {
      setErreur('La consultation détaillée est disponible en mode Supabase réel. Désactivez le mode mock candidat pour utiliser cette fonction.');
      setChargement(false); return;
    }
    const resultat = await candidateApi.consulterDemande({ numero_dossier: numero, code_suivi: code });
    if (!resultat.ok) { setErreur(messageErreur(resultat.erreur)); setDonnees(null); }
    else setDonnees(resultat.valeur);
    setChargement(false);
  }
  useEffect(() => { void charger(); }, [numero, code]);
  const statut = donnees ? STATUTS[donnees.demande.statut] : null;

  return <ScreenContainer titre="Détails du dossier" sousTitre="Consultation sécurisée">
    {chargement ? <LoadingState message="Récupération des informations du dossier…" /> : null}
    {!chargement && erreur ? <ErrorState titre="Consultation impossible" message={erreur} libelleAction="Réessayer" onReessayer={() => void charger()} /> : null}
    {!chargement && donnees && statut ? <View className="gap-4">
      <View className="rounded-2xl border border-omda-borderGray bg-omda-white p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-omda-textGray">Numéro de dossier</Text>
        <Text selectable className="mt-1 text-xl font-bold text-omda-black">{donnees.demande.numero_dossier}</Text>
        <View className="mt-3"><StatusPill statut={statut.variante} libelle={statut.libelle} /></View>
        {donnees.categorie ? <Text className="mt-3 text-sm text-omda-textGray">Catégorie : {donnees.categorie.libelle}</Text> : null}
      </View>
      <View className="rounded-2xl border border-omda-borderGray bg-omda-white p-5">
        <Text className="mb-3 text-base font-bold text-omda-black">Identité enregistrée</Text>
        {[['Nom', donnees.identite.nom], ['Prénom(s)', donnees.identite.prenom], ['Date de naissance', donnees.identite.date_naissance], ['CIN', donnees.identite.cin], ['Téléphone', donnees.identite.telephone], ['E-mail', donnees.identite.email], ['Adresse', donnees.identite.adresse]].map(([label, valeur]) => <View key={label} className="border-b border-omda-borderGray py-2"><Text className="text-xs text-omda-textGray">{label}</Text><Text selectable className="mt-1 text-sm font-medium text-omda-black">{valeur || '—'}</Text></View>)}
      </View>
      <View className="rounded-2xl border border-omda-borderGray bg-omda-white p-5">
        <Text className="text-base font-bold text-omda-black">Pièces et œuvres enregistrées</Text>
        <Text className="mt-2 text-sm text-omda-textGray">{donnees.pieces.length} pièce(s) et {donnees.oeuvres.length} œuvre(s) enregistrée(s).</Text>
        {donnees.pieces.map((piece) => <Text key={piece.id} className="mt-2 text-sm text-omda-black">• {piece.type} — {piece.mime_type}</Text>)}
        {donnees.oeuvres.map((oeuvre) => <Text key={oeuvre.id} className="mt-2 text-sm text-omda-black">• {oeuvre.titre} — {oeuvre.statut}</Text>)}
      </View>
      {donnees.demande.statut === 'BROUILLON' ? <InfoBanner variante="info" titre="Brouillon non envoyé" message="Votre dossier est encore en préparation. La reprise et la modification des étapes du formulaire seront accessibles depuis le parcours d’adhésion." /> : null}
    </View> : null}
    <View className="mt-6 gap-3"><Button libelle="Retour au suivi" variante="secondary" pleineLargeur onPress={() => router.replace({ pathname: '/(candidat)/suivi', params: { numero_dossier: numero, code_suivi: code } })} /><Button libelle="Retour à l’accueil" pleineLargeur onPress={() => router.replace('/(public)/accueil')} /></View>
  </ScreenContainer>;
}
