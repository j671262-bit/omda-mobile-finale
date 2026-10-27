# Étape 24 — Limitation des tentatives de suivi candidat

## Modifications

- Ajout de la migration `0011_limitation_tentatives_suivi_candidat.sql` : table interne sans accès direct aux rôles `anon` et `authenticated`, fonction RPC atomique et exécutable uniquement par `service_role`.
- L’Edge Function `candidat-consulter-demande` calcule une empreinte SHA-256 de l’adresse réseau issue des en-têtes de la passerelle, puis appelle la RPC avant de consulter le dossier.
- La limite est de 20 requêtes par fenêtre de 15 minutes et par adresse réseau. Au dépassement, la fonction renvoie HTTP 429 avec le code `TROP_DE_TENTATIVES`.
- La limitation est appliquée avant de vérifier si le dossier ou le code de suivi existe, pour ne pas révéler quel élément est incorrect.
- En cas d’indisponibilité du limiteur, l’endpoint échoue fermé avec HTTP 503. L’adresse IP brute n’est pas envoyée à la base ni stockée par cette migration ; seule son empreinte est conservée.

## Conditions de déploiement

1. Appliquer les migrations de `0001` à `0011` dans l’ordre sur un environnement de recette.
2. Déployer à nouveau `candidat-consulter-demande`.
3. Vérifier sur l’environnement de recette que la passerelle Supabase fournit au moins un en-tête d’adresse réseau fiable (`cf-connecting-ip`, `x-real-ip` ou `x-forwarded-for`). Si aucun n’est présent, l’endpoint renvoie 503 par conception.
4. Vérifier les limites, le comportement après 15 minutes et l’absence d’accès direct à la table pour `anon` / `authenticated` lors de la campagne de tests finale.

## Limites

Cette mesure est un limiteur simple par adresse réseau, pas une protection complète contre les attaques distribuées. Les utilisateurs partageant une même adresse publique partagent aussi le quota. Pour la production, envisager en complément un WAF/rate limit de passerelle, des alertes et une politique de rétention adaptée. Les en-têtes IP doivent être fournis/normalisés par l’infrastructure, pas acceptés comme valeur arbitraire du corps mobile.

Aucun test applicatif, build, typecheck ni appel Supabase distant n’a été effectué à cette étape, conformément à la consigne de regrouper les tests à la fin.
