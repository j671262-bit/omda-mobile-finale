# Étape 20 — Sélection cohérente du service candidat et paiement simulé

## Objectif

Permettre au parcours candidat de sélectionner une implémentation orientée Supabase sans exiger une API Express séparée, tout en maintenant explicitement le paiement d'adhésion en mode mock.

## Modifications

- Ajout de `SupabaseCandidateApi`, implémentation du contrat `CandidateApi`.
- La fabrique instancie `SupabaseCandidateApi` lorsque `EXPO_PUBLIC_USE_MOCKS_CANDIDATE=false`.
- Les opérations de création, modification, soumission, téléversement et consultation/suivi sont déléguées aux méthodes déjà raccordées aux Edge Functions Supabase dans `HttpCandidateApi`.
- `obtenirOptionsPaiement`, `initierPaiement` et `obtenirEtatPaiement` sont explicitement déléguées à `mockCandidateApi`. Aucun prestataire de paiement réel n'est appelé.
- Le fichier `.env.example` précise que `EXPO_PUBLIC_API_BASE_URL` est historique et n'est plus nécessaire pour les opérations de dossier couvertes.
- Les documents de branchement et de livraison sont annotés pour éviter que leurs anciennes instructions Express soient interprétées comme la configuration actuelle.

## Limites importantes

- Les opérations de paiement sont simulées, mais le mock peut ne pas partager l'état d'un dossier créé sur le serveur réel. L'expérience paiement complète avec un dossier réel reste donc à harmoniser, sans intégrer de prestataire réel.
- Les méthodes de dossier déléguées à `HttpCandidateApi` dépendent de la configuration Supabase et du déploiement des Edge Functions correspondantes.
- Cette étape ne déploie ni migrations ni fonctions sur le projet Supabase distant.
- L'implémentation des contenus publics et certaines écritures de l'espace membre restent à traiter séparément.

## Vérifications

Conformément à la consigne de reporter les tests jusqu'à la fin du développement, aucun test applicatif, aucune compilation et aucune vérification TypeScript n'ont été exécutés. Seule l'intégrité de l'archive ZIP est contrôlée après sa création.
