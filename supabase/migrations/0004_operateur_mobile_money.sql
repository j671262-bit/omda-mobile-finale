-- OMDA — Migration 0004 : référentiel des opérateurs Mobile Money.
-- Le schéma initial documente cette table comme référentiel public mais ne la crée pas.
-- Paiement de l'adhésion dans l'application mobile : mock uniquement ; aucune transaction n'est initiée ici.

create table if not exists public.operateur_mobile_money (
  code public.operateur_paiement primary key,
  libelle text not null,
  actif boolean not null default true,
  ordre integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.operateur_mobile_money enable row level security;

drop policy if exists "operateur_mobile_money_select_public" on public.operateur_mobile_money;
create policy "operateur_mobile_money_select_public" on public.operateur_mobile_money
  for select to anon, authenticated using (actif = true or public.is_agent_or_admin());

drop policy if exists "operateur_mobile_money_admin_all" on public.operateur_mobile_money;
create policy "operateur_mobile_money_admin_all" on public.operateur_mobile_money
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.operateur_mobile_money (code, libelle, actif, ordre)
values ('MVOLA', 'MVola', true, 1)
on conflict (code) do nothing;
