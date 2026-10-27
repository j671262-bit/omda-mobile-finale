# Étape 8 — Téléversement candidat sécurisé

## Ajouts

- Nouvelle Edge Function `candidat-televerser-fichier` : accepte un fichier multipart, vérifie le numéro et le code de suivi en comparant l'empreinte SHA-256 conservée en base, puis autorise le dépôt uniquement tant que le dossier est `BROUILLON`.
- Le serveur impose les types MIME autorisés et la limite de 20 Mo, construit lui-même le chemin de stockage et utilise sa clé `service_role` uniquement côté serveur.
- `HttpCandidateApi.televerserFichier()` utilise cette fonction Supabase au lieu de l'ancienne route Express `/v1/fichiers`.
- Les fichiers sont rangés sous le numéro de dossier dans un bucket privé. Le nom de fichier est normalisé et un identifiant aléatoire évite les collisions.

## Déploiement à faire après la fin du développement

```bash
supabase functions deploy candidat-televerser-fichier --no-verify-jwt
```

La fonction doit disposer des secrets Supabase standards `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` côté Edge Functions. Ne jamais copier la clé `service_role` dans `.env` public ou dans l'application mobile.

## Limites connues à résoudre dans les étapes suivantes

- Les métadonnées du fichier (pièce/œuvre/attestation, relation à la demande et éventuel remplacement) ne sont pas encore enregistrées dans les tables métier. Cette étape ne fait que sécuriser l'objet Storage et renvoyer son chemin.
- Le code de suivi est un secret d'accès ; la fonction applique une limite de taille, mais la protection contre les tentatives répétées et le rate limiting doivent être ajoutés avant la production.
- Les attestations doivent rester limitées à PDF/JPEG/PNG, même si le bucket `oeuvres` accepte aussi les formats audio pour les fichiers d'œuvres. Une vérification spécifique du rôle du fichier sera ajoutée avec l'enregistrement des métadonnées.
- Conformément à la consigne du projet, aucun test applicatif ni test distant n'a été lancé à cette étape. La validation globale sera effectuée lorsque le projet sera terminé.
