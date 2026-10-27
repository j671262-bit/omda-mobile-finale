# Étape 3 — Demandes de catégories supplémentaires

## Modifications

- `demanderCategorieSupplementaire` et `demanderCategorieSupplementaireAvecOeuvres` appellent maintenant la RPC Supabase `demander_categorie_supplementaire` au lieu de retourner `erreurNonBranche()` ou de tenter une écriture directe soumise à RLS.
- La migration `0005_demande_categorie_oeuvres.sql` ajoute `demande_categorie_oeuvre`, une table pour conserver les titres, chemins, MIME et tailles des fichiers et attestations joints.
- La RPC vérifie la session, le statut actif du membre, l'existence d'une catégorie active, l'absence de demande déjà en attente, la réouverture uniquement des demandes `ANNULEE` ou `REJETEE`, le nombre minimal d'œuvres et les champs/MIME/tailles de chaque fichier.
- La création/réouverture de l'appartenance et l'enregistrement des pièces jointes sont exécutés dans une transaction Postgres. Le membre ne peut jamais se donner le statut `ACTIVE`.
- Les pièces jointes de la table sont supprimées lors de l'annulation de la demande. Les objets binaires Storage ne sont pas supprimés par ce déclencheur et nécessitent une politique de nettoyage séparée.

## À appliquer dans Supabase

Après les migrations 0001 à 0004, exécuter `supabase/migrations/0005_demande_categorie_oeuvres.sql` dans le SQL Editor de Supabase. Ne pas copier la clé `service_role` dans l'application.

## Validation requise avant production

La migration et le code ont été écrits, mais n'ont pas été exécutés sur le projet Supabase distant. L'installation de dépendances a expiré dans l'environnement de travail ; `npm run typecheck` n'a donc pas pu être validé (les fichiers de dépendances/types sont incomplets). Tester au minimum : membre non connecté, catégorie inactive, catégorie déjà en attente, demande annulée/réjetée réouverte, moins de deux œuvres, MIME incorrect, taille supérieure à 20 Mo, et lecture interdite des pièces jointes d'un autre membre.
