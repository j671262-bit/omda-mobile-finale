# Étape 19 — Fiabilisation des opérations d’adhésion et soumission idempotente

## Objectif

Réduire les ambiguïtés réseau du parcours candidat et empêcher qu’une seconde requête de soumission insère à nouveau les pièces, œuvres et attestations lorsqu’une première soumission a déjà été acceptée par le serveur.

## Modifications

- Ajout de `demanderEdgeFunction`, helper partagé pour les appels JSON aux Edge Functions Supabase : vérification de configuration, en-têtes communs, délai maximal de 15 secondes et conversion des erreurs transport/HTTP en `Result`.
- Création, modification et soumission utilisent ce helper au lieu de reproduire trois transports légèrement différents.
- Le contexte local du dossier est mis à jour après une création confirmée et avant les opérations qui utilisent le numéro et le code de suivi.
- Les réponses de modification et de soumission sont comparées au numéro de dossier demandé ; une réponse qui porte sur un autre dossier est refusée.
- Nouvelle migration `0010_soumission_candidat_idempotente.sql` : après vérification du hash du code de suivi, une demande déjà soumise et dont le statut confirme une soumission antérieure renvoie sa confirmation existante. Aucun nouvel insert de pièces, œuvres ou attestations n’est effectué. Les demandes non soumises et non modifiables continuent d’être refusées.
- Le parcours candidat continue de fonctionner sans compte Supabase Auth ; le secret `service_role` demeure uniquement côté Edge Function.

## Limites

- La migration `0010` doit être appliquée sur l’environnement Supabase avant de bénéficier de l’idempotence côté serveur. La modification des fichiers du projet ne change pas la base distante.
- Le téléversement de fichiers est encore un appel séparé : cette étape ne rend pas les transferts eux-mêmes idempotents et ne supprime pas automatiquement les fichiers orphelins.
- Les options et opérations de paiement ne sont pas modifiées ici ; l’intégration d’un prestataire de paiement réel reste hors périmètre, le paiement d’adhésion devant rester simulé.
- Aucune limitation de débit anti-abus n’est ajoutée dans cette étape.

## Vérifications

Aucun test applicatif, aucune compilation TypeScript et aucun test Supabase distant n’ont été exécutés, conformément à la consigne de différer les tests jusqu’à la fin du développement. Seule l’intégrité de l’archive ZIP est vérifiée après création.
