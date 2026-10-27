-- OMDA Mobile — Étape 4 : rendre le Storage privé et limiter l'accès au propriétaire.
-- Les objets du membre doivent être rangés sous auth.uid()/ dans le bucket.
-- Le client mobile normalise désormais les nouveaux chemins sous ce préfixe.
-- Le parcours candidat sans compte sera traité ultérieurement via Edge Functions.

-- Buckets privés avec limites et types autorisés explicites.
update storage.buckets
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = case id
      when 'pieces' then array['image/jpeg', 'image/png', 'application/pdf']::text[]
      when 'oeuvres' then array['audio/mpeg', 'audio/wav', 'application/pdf', 'image/jpeg', 'image/png']::text[]
      else allowed_mime_types
    end
where id in ('pieces', 'oeuvres');

-- Supprimer les anciennes politiques trop permissives.
drop policy if exists "Autoriser upload pieces" on storage.objects;
drop policy if exists "Autoriser lecture pieces" on storage.objects;
drop policy if exists "Autoriser upload oeuvres" on storage.objects;
drop policy if exists "Autoriser lecture oeuvres" on storage.objects;

-- Supprimer aussi les politiques alternatives éventuelles nommées dans les versions précédentes.
drop policy if exists "pieces_owner_insert" on storage.objects;
drop policy if exists "pieces_owner_select" on storage.objects;
drop policy if exists "oeuvres_owner_insert" on storage.objects;
drop policy if exists "oeuvres_owner_select" on storage.objects;
drop policy if exists "member_storage_insert" on storage.objects;
drop policy if exists "member_storage_select" on storage.objects;

create policy "pieces_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pieces'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "pieces_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'pieces'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "pieces_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'pieces'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'pieces'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "pieces_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pieces'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "oeuvres_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'oeuvres'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "oeuvres_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'oeuvres'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "oeuvres_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'oeuvres'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'oeuvres'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "oeuvres_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'oeuvres'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
