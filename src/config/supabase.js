import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project details
// Get these from: Supabase Dashboard → Settings → API
const supabaseUrl = 'https://mnldgegdtzafgaoragzp.supabase.co'
const supabaseAnonKey = 'sb_publishable_dZkU557q8t56yUoIvcErBg_wXP6ps6h' // e.g., 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// TODO: Replace the values above with your actual Supabase credentials
// 1. Go to Supabase Dashboard → Settings → API
// 2. Copy the Project URL and paste it above
// 3. Copy the anon public key and paste it above

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connected successfully!')
    return true
  } catch (err) {
    console.error('Connection test failed:', err)
    return false
  }
}
