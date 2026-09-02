-- Packing RLS: only children the member may see.
-- Additive. Safe for existing production data.

drop policy if exists packing_items_select_members on public.packing_items;
create policy packing_items_select_members
  on public.packing_items
  for select
  to authenticated
  using (public.is_family_member(family_id) and public.can_view_child(child_id));

drop policy if exists packing_items_insert_members on public.packing_items;
create policy packing_items_insert_members
  on public.packing_items
  for insert
  to authenticated
  with check (public.is_family_member(family_id) and public.can_view_child(child_id));

drop policy if exists packing_items_update_members on public.packing_items;
create policy packing_items_update_members
  on public.packing_items
  for update
  to authenticated
  using (public.is_family_member(family_id) and public.can_view_child(child_id))
  with check (public.is_family_member(family_id) and public.can_view_child(child_id));

drop policy if exists packing_items_delete_members on public.packing_items;
create policy packing_items_delete_members
  on public.packing_items
  for delete
  to authenticated
  using (public.is_family_member(family_id) and public.can_view_child(child_id));

comment on policy packing_items_select_members on public.packing_items is
  'Family members see packing only for children they may view.';
