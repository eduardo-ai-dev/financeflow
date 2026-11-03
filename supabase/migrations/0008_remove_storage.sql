-- ============================================================================
-- Migração 0008: Rollback e Remoção Completa de Storage / user-attachments
-- Motivo: Conformidade de privacidade (sistema opera 100% com dados numéricos e textuais criptografados)
-- ============================================================================

do $$
begin
  -- 1. Remove políticas de segurança do bucket user-attachments em storage.objects
  execute 'drop policy if exists storage_objects_select_own on storage.objects';
  execute 'drop policy if exists storage_objects_insert_own on storage.objects';
  execute 'drop policy if exists storage_objects_update_own on storage.objects';
  execute 'drop policy if exists storage_objects_delete_own on storage.objects';

  -- 2. Remove objetos vinculados ao bucket (se existirem)
  delete from storage.objects where bucket_id = 'user-attachments';

  -- 3. Exclui o bucket de armazenamento
  delete from storage.buckets where id = 'user-attachments';

exception
  when insufficient_privilege or undefined_table then
    raise notice 'Esquema de storage não disponível ou sem privilégios de alteração direta. Continuando com sucesso.';
end;
$$;
