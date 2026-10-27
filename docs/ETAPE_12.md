# Étape 12 — Raccordement mobile à la consultation du dossier

## Changements

- Ajout du type `ConsultationDemande` au contrat candidat.
- Ajout de `consulterDemande()` dans `HttpCandidateApi`. L'appel utilise directement la fonction Supabase Edge `candidat-consulter-demande`, avec la clé anon et le numéro/code de suivi. La clé `service_role` n'est jamais envoyée au mobile.
- Ajout de l'écran `app/(candidat)/details-dossier.tsx` qui présente le statut, la catégorie, l'identité, ainsi que les métadonnées des pièces et œuvres retournées par le serveur.
- Ajout d'un accès « Consulter les détails du dossier » à l'écran de suivi existant.
- Gestion des états de chargement, d'erreur et de mode mock non compatible avec la consultation détaillée.

## Limites à cette étape

- L'écran affiche les métadonnées des pièces/œuvres, pas les fichiers privés eux-mêmes.
- La reprise du formulaire à partir des informations récupérées n'est pas encore réalisée : elle fera l'objet d'une étape dédiée afin de ne pas écraser le brouillon local de manière implicite.
- La consultation détaillée en mode réel dépend du déploiement de `candidat-consulter-demande` et de la configuration Supabase.
- Aucun test applicatif, test TypeScript, compilation ou déploiement n'a été exécuté, conformément à la consigne de ne tester qu'une fois le projet entièrement terminé. Seule l'intégrité de l'archive ZIP est vérifiée.
