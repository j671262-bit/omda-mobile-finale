# Étape 26 — Limitation des opérations publiques du candidat

## Changements apportés

- Ajout de la migration `0012_limitation_tentatives_operations_candidat.sql` : table privée de compteurs et fonction RPC réservée au rôle `service_role`.
- Ajout de `supabase/functions/_shared/rateLimit.ts` pour calculer une empreinte SHA-256 de l'adresse réseau fournie par les en-têtes de la passerelle, interroger la RPC et produire une réponse structurée en cas de dépassement ou d'indisponibilité.
- Branchement du limiteur sur les fonctions `candidat-creer-demande`, `candidat-modifier-demande`, `candidat-televerser-fichier` et `candidat-soumettre-demande`.
- La consultation reste protégée par le limiteur de l'étape 24.

## Seuils par fenêtre

| Opération | Limite par empreinte réseau |
|---|---:|
| Création de demande | 8 tentatives / 15 minutes |
| Modification de brouillon | 20 tentatives / 15 minutes |
| Téléversement | 60 tentatives / 15 minutes |
| Soumission de demande | 10 tentatives / 15 minutes |

Les opérations ont des compteurs séparés afin que les téléversements de plusieurs documents ne consomment pas le quota de création ou de modification. Les compteurs expirés sont nettoyés lors des appels et les lignes anciennes de plus de 24 heures sont supprimées.

## Réponses en cas de blocage

- `429 TROP_DE_TENTATIVES` lorsque le quota est atteint.
- `503 PROTECTION_INDISPONIBLE` si l'empreinte réseau ne peut pas être déterminée ou si la RPC échoue. Le système échoue volontairement en mode fermé au lieu de laisser passer l'opération sans protection.

## Conditions et limites

- Appliquer la migration `0012` dans le projet Supabase avant de déployer les Edge Functions mises à jour. Sans la RPC, les opérations concernées renverront `503`.
- Le mécanisme dépend d'un en-tête IP fiable injecté ou normalisé par la passerelle Supabase (`cf-connecting-ip`, `x-real-ip` ou `x-forwarded-for`). Vérifier les en-têtes réellement reçus en environnement de préproduction et s'assurer qu'un client ne peut pas imposer arbitrairement la valeur retenue.
- La limite est partagée par adresse réseau : plusieurs personnes derrière la même adresse publique peuvent partager un quota. Les seuils sont des valeurs initiales à ajuster selon l'usage observé.
- Le limiteur compte les tentatives qui atteignent son point d'appel; il ne remplace ni une validation stricte des entrées, ni la protection contre les fichiers malveillants, ni la supervision opérationnelle.
- Le paiement d'adhésion reste simulé conformément à la décision de projet.

## Vérifications

Revue statique des fichiers modifiés et vérification de l'intégrité de l'archive uniquement. Aucun test applicatif, test distant Supabase, build ou contrôle TypeScript n'a été exécuté, conformément à la consigne de regrouper les tests à la fin du développement.
