# Étape 4 — Sécurisation de Supabase Storage

## Modifications

- Ajout de `supabase/migrations/0006_storage_prive_proprietaire.sql`.
- Les buckets `pieces` et `oeuvres` sont privés, avec limite de 20 Mo et listes MIME explicites.
- Suppression des politiques initiales qui autorisaient tout utilisateur public à téléverser ou lire des objets de ces buckets.
- Les opérations Storage sont désormais réservées aux sessions `authenticated` et aux chemins dont le premier dossier est exactement `auth.uid()`.
- Le service mobile normalise les nouveaux téléversements sous `bucket/auth.uid()/...` et refuse les liens signés ou suppressions lorsque le chemin ne correspond pas à l'utilisateur courant.

## À appliquer

1. Vérifier que les migrations 0001 à 0005 ont été appliquées.
2. Exécuter `supabase/migrations/0006_storage_prive_proprietaire.sql` dans le SQL Editor Supabase.
3. Tester avec deux comptes membre distincts : chaque compte doit pouvoir déposer et consulter ses propres fichiers, mais pas ceux de l'autre compte.

## Limites et précautions

- Les chemins historiques déjà enregistrés en base ne sont pas automatiquement déplacés. Les anciens objets ne respecteront probablement pas le nouveau préfixe ; il faut migrer les fichiers existants et leurs chemins en base avant de les rendre accessibles sous cette politique.
- Cette migration concerne le parcours membre authentifié. Le parcours candidat sans compte ne peut pas téléverser directement dans ces buckets : il devra passer par des Edge Functions avec une vérification de dossier et des autorisations limitées.
- Le code mobile n'a pas été compilé ni testé contre le projet Supabase distant dans cet environnement. Il s'agit d'une modification préparatoire à valider, pas d'une garantie de production.
- Les écrans qui appellent explicitement les dépôts mockés doivent encore être raccordés à la factory de services avant que l'application entière utilise ces opérations réelles.
