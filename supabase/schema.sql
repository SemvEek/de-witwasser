-- De Witwasser: database voor de gebruikersapp
-- Plak dit script in Supabase > SQL Editor en klik op Run.
-- Het script kan veilig opnieuw worden uitgevoerd.

-- 1. Profielen: een rij per gebruiker
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  naam              text check (naam is null or char_length(naam) between 1 and 100),
  straat            text check (straat is null or char_length(straat) between 1 and 100),
  huisnummer        text check (huisnummer is null or huisnummer ~ '^[0-9]{1,5}[ -]?[A-Za-z0-9]{0,6}$'),
  postcode          text check (postcode is null or postcode ~ '^[1-9][0-9]{3} [A-Z]{2}$'),
  frequentie        text check (frequentie in ('elke week', 'om de week', 'los')),
  ophaaldag         text check (ophaaldag in ('maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag')),
  brengdag          text check (brengdag in ('maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag')),
  brengdagdeel      text check (brengdagdeel in ('ochtend', 'middag', 'avond')),
  studenten_in_huis integer check (studenten_in_huis between 1 and 50),
  status            text not null default 'actief' check (status in ('actief', 'gepauzeerd', 'opgezegd')),
  gepauzeerd_tot    date,
  opgezegd_op       timestamptz,
  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),
  constraint pauze_heeft_datum check (status <> 'gepauzeerd' or gepauzeerd_tot is not null)
);

-- 2. Rij-niveau-toegang: iedereen ziet en wijzigt alleen zijn eigen rij
alter table public.profiles enable row level security;

drop policy if exists "Eigen profiel lezen" on public.profiles;
create policy "Eigen profiel lezen" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Eigen profiel aanmaken" on public.profiles;
create policy "Eigen profiel aanmaken" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Eigen profiel wijzigen" on public.profiles;
create policy "Eigen profiel wijzigen" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Geen delete-policy: opzeggen is een statuswijziging, geen verwijdering.

-- 3. Kolomrechten: niet-ingelogde bezoekers mogen niets, ingelogde gebruikers
--    mogen id, e-mail en tijdstempels niet zelf wijzigen.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, naam, postcode, frequentie, ophaaldag, studenten_in_huis)
  on public.profiles to authenticated;
grant update (naam, straat, huisnummer, postcode, frequentie, ophaaldag, brengdag, brengdagdeel,
              studenten_in_huis, status, gepauzeerd_tot, opgezegd_op)
  on public.profiles to authenticated;

-- 4. bijgewerkt_op automatisch bijhouden
create or replace function public.zet_bijgewerkt_op()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.bijgewerkt_op := now();
  return new;
end;
$$;

drop trigger if exists profiles_bijgewerkt_op on public.profiles;
create trigger profiles_bijgewerkt_op
  before update on public.profiles
  for each row execute function public.zet_bijgewerkt_op();

-- 5. Profiel aanmaken zodra er een account bijkomt, met de gegevens uit het aanmeldformulier.
--    Ongeldige waarden worden genegeerd in plaats van dat het aanmaken van het account mislukt.
create or replace function public.maak_profiel_voor_nieuwe_gebruiker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  pc text := upper(regexp_replace(coalesce(m ->> 'postcode', ''), '\s', '', 'g'));
  st text := m ->> 'studenten_in_huis';
begin
  insert into public.profiles (id, email, naam, postcode, frequentie, ophaaldag, studenten_in_huis)
  values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(m ->> 'naam', '')), 100), ''),
    case when pc ~ '^[1-9][0-9]{3}[A-Z]{2}$' then left(pc, 4) || ' ' || right(pc, 2) end,
    case when m ->> 'frequentie' in ('elke week', 'om de week', 'los') then m ->> 'frequentie' end,
    case when m ->> 'ophaaldag' in ('maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag')
         then m ->> 'ophaaldag' end,
    case when st ~ '^[0-9]{1,2}$' and st::int between 1 and 50 then st::int end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.maak_profiel_voor_nieuwe_gebruiker() from public, anon, authenticated;

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.maak_profiel_voor_nieuwe_gebruiker();
