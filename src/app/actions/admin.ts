'use server';

import { createClient } from '@supabase/supabase-js';

export async function deleteUserCompletely(userId: string, email: string) {
  // Initialize Supabase Admin client with Service Role Key (Server-side only)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // 1. Delete user from Supabase Auth (This frees up their email)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting from Auth:', authError.message);
      return { success: false, error: authError.message };
    }

    // 2. Delete from all associated public database tables
    await supabaseAdmin.from('timetable_slots').delete().eq('profile_id', userId);
    await supabaseAdmin.from('profile_private').delete().eq('profile_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('club_members').delete().eq('email', email);

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected deletion error:', err);
    return { success: false, error: err.message };
  }
}