import { supabase } from "./supabase.js";

export const RUN_PAGE_SIZE = 20;
const metadata = "id,wpm,acc,mode,created_at,elapsed_s,duration_s,word_count";

function ownerQuery(userId, mode, signal) {
  let query = supabase
    .from("results")
    .select(metadata)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (mode !== "all") query = query.eq("mode", mode);
  return query.abortSignal(
    AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  );
}

export async function loadRunPage(userId, mode, cursor, signal) {
  let query = ownerQuery(userId, mode, signal);
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  const { data, error } = await query.limit(RUN_PAGE_SIZE + 1);
  if (error) throw error;
  return {
    rows: (data || []).slice(0, RUN_PAGE_SIZE),
    hasMore: (data || []).length > RUN_PAGE_SIZE,
  };
}

export async function loadRunOverview(userId, mode, signal) {
  const { data, error } = await ownerQuery(userId, mode, signal)
    .not("mode", "like", "custom-%")
    .limit(30);
  if (error) throw error;
  return data || [];
}

export async function loadRunDetails(userId, id, signal) {
  const { data, error } = await supabase
    .from("results")
    .select(`${metadata},samples,missed_keys`)
    .eq("user_id", userId)
    .eq("id", id)
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(10000)]))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Run is no longer available.");
  return data;
}
