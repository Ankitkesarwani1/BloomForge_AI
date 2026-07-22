-- The syllabus-management client writes the normalized curriculum after the
-- parent syllabus row is created. These policies match the app's existing
-- authenticated read/write model and prevent RLS from blocking that workflow.

drop policy if exists "authenticated_manage_units" on public.units;
create policy "authenticated_manage_units"
  on public.units
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_manage_topics" on public.topics;
create policy "authenticated_manage_topics"
  on public.topics
  for all
  to authenticated
  using (true)
  with check (true);
