import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null
let cachedAdmin: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  cached = createClient(url, key)
  return cached
}

function getAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  cachedAdmin = createClient(url, key)
  return cachedAdmin
}

function lazyClient(resolve: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const client = resolve()
      const value = Reflect.get(client, prop, receiver)
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}

export const supabase: SupabaseClient = lazyClient(getClient)

export const supabaseAdmin: SupabaseClient | null =
  typeof window === 'undefined' ? lazyClient(getAdminClient) : null
