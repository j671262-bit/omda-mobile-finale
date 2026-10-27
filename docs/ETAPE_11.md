# Étape 11 — Consultation sécurisée d'un dossier candidat

## Ajout

La fonction `candidat-consulter-demande` permet de retrouver les informations d'un dossier sans compte Supabase Auth, à partir du numéro de dossier et du code de suivi.

Elle :
- n'accepte que `POST` et traite les requêtes CORS `OPTIONS` ;
- valide le format des deux identifiants ;
- compare l'empreinte SHA-256 du code au hash enregistré en base ;
- ne renvoie jamais `jeton_suivi_hash`, les chemins de stockage privés ou les identifiants internes du candidat ;
- renvoie l'identité, la catégorie, l'état du dossier et les métadonnées des pièces et œuvres, sans URL de téléchargement ;
- utilise `SUPABASE_SERVICE_ROLE_KEY` uniquement côté Edge Function.

## Déploiement ultérieur

Après la phase de développement et les tests finaux, déployer avec :

```bash
supabase functions deploy candidat-consulter-demande --no-verify-jwt
```

La fonction utilise les tables `demande_adhesion`, `candidat`, `categorie`, `piece` et `oeuvre` du schéma existant ; aucune migration supplémentaire n'est requise pour cette étape.

## Limite connue

Cette étape ajoute le point d'accès serveur. L'interface mobile de reprise/consultation doit encore appeler cette fonction et afficher les données retournées. Il faut aussi ajouter une protection anti-abus/rate limit côté serveur avant production. Aucun test, compilation ou déploiement distant n'est effectué à ce stade, conformément à la consigne de reporter les tests jusqu'à la fin du projet.
