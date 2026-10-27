# Étape 23 — Audit statique des migrations et Edge Functions

## Objectif

Comparer les contrats SQL et les appels des Edge Functions avant la recette. Aucun déploiement ni test applicatif n’est effectué à cette étape.

## Corrections appliquées

- Harmonisation du format de numéro de dossier dans `candidat-consulter-demande` avec les fonctions de modification et de téléversement : `OMDA-AAAA-N...` accepte au moins six chiffres de séquence. La séquence SQL peut théoriquement dépasser six chiffres ; la consultation ne doit donc pas refuser un numéro généré par la base.
- Nettoyage de la structure de l’archive : le projet est fourni une seule fois à la racine du ZIP, sans copie imbriquée du projet.

## Résultats de l’audit statique

- `candidat-creer-demande` appelle `creer_demande_candidat_securisee(jsonb, uuid)` ; la migration 0007 déclare cette signature et réserve son exécution à `service_role`.
- `candidat-modifier-demande` appelle `modifier_brouillon_candidat_securise(text, text, jsonb, uuid)` ; la migration 0009 déclare cette signature et réserve son exécution à `service_role`.
- `candidat-soumettre-demande` appelle `soumettre_demande_candidat_securisee(text, text, jsonb, jsonb)` ; les migrations 0008 et 0010 déclarent cette signature, la seconde ajoutant le comportement idempotent. La migration 0010 doit être appliquée sur l’environnement distant pour que cette amélioration y soit active.
- `candidat-consulter-demande` lit les tables `demande_adhesion`, `candidat`, `categorie`, `piece`, `oeuvre` et `tarif` avec la clé serveur. Le schéma distant doit comporter les colonnes interrogées, notamment les champs de période et `updated_at` de `tarif`.
- `candidat-televerser-fichier` valide le code de suivi et le statut du dossier, puis écrit dans Storage avec le client serveur. Les règles Storage destinées aux membres authentifiés ne remplacent pas la validation côté Edge Function pour les candidats sans compte Auth.
- La RPC `demander_categorie_supplementaire(uuid, jsonb, boolean)` est limitée au rôle `authenticated` et vérifie `auth.uid()` dans la fonction. Elle est destinée au parcours membre, pas au candidat anonyme.

## Points à confirmer avant la recette

1. Comparer le schéma de base complet (tables et types historiques inclus) avec les requêtes des fonctions, en particulier `tarif`, `demande_adhesion`, `piece` et `oeuvre`.
2. Vérifier que les buckets privés `pieces` et `oeuvres` existent avant le déploiement de la migration Storage.
3. Prévoir une limitation des tentatives pour les endpoints publics utilisant le code de suivi. Une validation correcte du code ne protège pas, à elle seule, contre les tentatives répétées.
4. Confirmer que la politique CORS et les limites de taille conviennent à l’application finale. CORS n’est pas une mesure d’autorisation serveur.
5. Appliquer les migrations dans l’ordre et vérifier leurs effets sur un environnement de recette avant toute mise en production.

## Limites

Cet audit est statique. Il ne prouve pas que les fonctions compilent, que le schéma distant est identique, ni que les politiques RLS/Storage fonctionnent sur un projet Supabase réel. Aucun test applicatif, typecheck, build ou appel distant n’a été exécuté, conformément à la consigne de regrouper les tests à la fin du développement.
