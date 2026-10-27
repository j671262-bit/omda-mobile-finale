# Étape 25 — Contrôles des fichiers avant soumission et audit des règles métier

## Correction appliquée

L'Edge Function `candidat-soumettre-demande` vérifie désormais les références de fichiers avant de demander à la RPC d'enregistrer les métadonnées :

- le numéro de dossier et l'empreinte du code de suivi sont vérifiés côté serveur avant toute interrogation du Storage ;
- chaque pièce et attestation doit pointer vers le bucket privé `pieces`, et chaque fichier d'œuvre vers `oeuvres` ;
- chaque chemin doit commencer par le numéro du dossier vérifié, contenir des segments valides et désigner un objet qui existe réellement ;
- un objet absent ou un chemin incohérent produit `FICHIER_ABSENT` (HTTP 422) ; une erreur de consultation du Storage produit `STOCKAGE_INDISPONIBLE` (HTTP 503) ;
- les demandes déjà soumises continuent à passer par la RPC idempotente sans exiger que le client renvoie de nouveau tous les fichiers, ce qui préserve le scénario de réponse réseau perdue.

Les contrôles SQL existants restent en place : type de pièce, MIME déclaré, taille maximale, chemin associé au numéro de dossier, catégorie active, nombre minimal d'œuvres et présence d'au moins une attestation par œuvre.

## Points métier et sécurité examinés

- Le candidat reste sans compte Supabase Auth : les opérations protégées utilisent le numéro de dossier et le code de suivi vérifiés par les Edge Functions.
- Le hash du code de suivi reste côté serveur ; il n'est pas renvoyé dans les réponses publiques.
- Les chemins de fichiers ne sont jamais considérés comme preuve d'existence : l'objet est recherché dans le bucket attendu avant la soumission.
- La transition `BROUILLON` vers `ENVOYEE` reste réalisée par la RPC transactionnelle, qui vérifie à nouveau le code et le statut.
- Les statuts déjà soumis sont traités par la logique idempotente de la migration `0010` lorsqu'une date de soumission est enregistrée.

## Limites restantes avant production

1. La vérification d'existence du fichier ne remplace pas une inspection du contenu réel : le MIME déclaré par le client n'est pas une analyse antivirus ni une validation complète de signature binaire.
2. Une suppression administrative concurrente entre la vérification Storage et l'écriture SQL reste théoriquement possible ; la recette doit vérifier les comportements de concurrence et les procédures de nettoyage.
3. La limitation par adresse réseau de l'étape 24 ne protège actuellement que la consultation `candidat-consulter-demande`. Les endpoints publics de création, modification, téléversement et soumission doivent recevoir une stratégie anti-abus adaptée avant la production, sans appliquer un quota trop bas aux téléversements légitimes.
4. Les migrations et Edge Functions doivent être déployées dans un environnement de recette, puis validées par des tests réels de permissions, de statuts et de fichiers.
5. Le paiement d'adhésion reste simulé, conformément à la demande.

## Vérifications de cette étape

- Contrôle statique du changement de code et présence des nouvelles branches de réponse.
- Contrôle d'intégrité de l'archive ZIP.
- Aucun test applicatif, aucune compilation, aucun contrôle TypeScript et aucun appel Supabase distant n'ont été exécutés, conformément à la consigne de regrouper les tests à la fin du développement.
