-- Expense receipt metadata (receipt_url stores private storage path)
alter table public.expenses
  add column if not exists receipt_filename text,
  add column if not exists receipt_uploaded_at timestamptz,
  add column if not exists receipt_mime_type text;

-- Storage: expense receipts under {family_id}/receipts/ use expense capabilities
create policy "storage_receipts_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'view_expenses')
);

create policy "storage_receipts_insert"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);

create policy "storage_receipts_update"
on storage.objects for update
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);

create policy "storage_receipts_delete"
on storage.objects for delete
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);
