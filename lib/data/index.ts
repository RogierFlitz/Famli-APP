import { memoryRepository } from "@/lib/data/memory-store";
import { supabaseRepository } from "@/lib/data/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { FamilyRepository } from "@/lib/data/repository";

export function getRepository(): FamilyRepository {
  if (isSupabaseConfigured()) return supabaseRepository;
  return memoryRepository;
}
