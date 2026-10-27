# Étape 18 — Raccordement du suivi candidat à Supabase

## Objectif

Le suivi public d'un dossier candidat ne doit pas dépendre de routes REST Express `/v1` qui ne sont pas déployées dans le projet. Cette étape fait utiliser au suivi mobile l'Edge Function Supabase `candidat-consulter-demande`, qui vérifie le numéro de dossier et le code de suivi côté serveur.

## Modifications

- `HttpCandidateApi.suivreDemande` appelle maintenant `consulterDemande` et renvoie le résumé `suivi` fourni par le serveur.
- L'Edge Function `candidat-consulter-demande` renvoie un résumé de suivi contenant le statut, la dernière mise à jour, la frise, le motif de rejet et, pour un dossier `VALIDEE`, le tarif d'adhésion actif.
- Le tarif spécifique à la catégorie est prioritaire ; à défaut, le tarif général d'adhésion actif peut être utilisé. Les dates d'effet sont prises en compte.
- Si une demande validée ne dispose d'aucun tarif utilisable, l'Edge Function renvoie une erreur explicite plutôt que d'inventer un montant.
- Le contrat `ConsultationDemande` comprend désormais le résumé `suivi` et le client vérifie sa présence avant de l'accepter.
- Le dossier reste protégé par la comparaison serveur de l'empreinte SHA-256 du code de suivi. Le hash et les chemins privés des fichiers ne sont pas renvoyés.
- Ajout de `.env.example` avec des variables vides et des indicateurs de mode mock pour faciliter la configuration locale, sans secret.

## Limites connues

Cette étape raccorde **le suivi et la consultation détaillée**, mais ne remplace pas encore toutes les routes Express utilisées par les autres méthodes de `HttpCandidateApi` (création, modification, soumission, upload et opérations de paiement). Ces raccordements restent à traiter séparément. Le paiement d'adhésion demeure simulé selon la demande du projet.

La frise est calculée à partir du statut actuel et des dates présentes dans le schéma ; les dates historiques intermédiaires qui ne sont pas enregistrées restent nulles plutôt que d'être inventées. La limitation de débit contre les tentatives répétées doit être ajoutée avant la production.

## Vérifications

Aucun test applicatif, aucune compilation TypeScript et aucun test distant Supabase n'ont été exécutés, conformément à la consigne de différer les tests jusqu'à la fin du développement. L'intégrité du ZIP est vérifiée après création.
