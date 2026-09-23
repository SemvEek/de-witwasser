-- De Witwasser: naam invullen voor het demo-account van Sem
-- Voer dit uit NADAT je in Authentication > Users de gebruiker sem@example.com hebt aangemaakt.
-- De rest (adres, planning) vul je zelf in de app in.

update public.profiles
set naam = 'Sem'
where email = 'sem@example.com';
