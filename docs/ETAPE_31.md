# Étape 31 — Plafonnement du corps de consultation

## Objectif

Appliquer la même protection de taille aux cinq opérations publiques du parcours candidat et vérifier le quota de consultation avant de lire le corps de la requête.

## Modifications

- `candidat-consulter-demande` utilise maintenant `lireJsonLimite` depuis `supabase/functions/_shared/requestBody.ts` avec un plafond de 64 Kio, comme les autres opérations JSON protégées.
- La limite est appliquée en lecture du flux : elle ne dépend pas uniquement de `Content-Length`, qui peut être absent ou non fiable.
- Le limiteur de consultation est appelé avant le parsing JSON ; les requêtes dépassant le quota sont refusées en HTTP 429 sans décoder le corps.
- Un corps dépassant le plafond reçoit HTTP 413 (`CORPS_TROP_VOLUMINEUX`), tandis qu'un JSON invalide reçoit HTTP 400 (`JSON_INVALIDE`).
- Le parcours candidat continue d'utiliser le numéro de dossier et le code de suivi, sans compte Supabase Auth.

## Points de vigilance

- Le contrôle applicatif ne remplace pas une limite de taille au niveau de la passerelle.
- Le limiteur dépend toujours d'un en-tête réseau fiable fourni/normalisé par l'infrastructure ; confirmer ce point en préproduction.
- Aucun test applicatif, build, contrôle TypeScript ni appel Supabase distant n'a été exécuté, conformément à la consigne de ne tester qu'une fois le projet entièrement terminé.
