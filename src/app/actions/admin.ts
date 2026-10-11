'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function deleteUserCompletely(userId: string, email: string) {
  // 1. Verify that the requester is an authenticated Admin / Executive member
  const supabaseUserClient = await createServerClient();
  const { data: { user: currentUser }, error: authCheckError } = await supabaseUserClient.auth.getUser();

  if (authCheckError || !currentUser) {
    return { success: false, error: 'Unauthorized: Session expired or invalid.' };
  }

  const { data: requesterProfile } = await supabaseUserClient
    .from('profiles')
    .select('role, status')
    .eq('id', currentUser.id)
    .single();

  const isExecutive = ['admin', 'president', 'secretary', 'lead'].includes(
    requesterProfile?.role?.toLowerCase() || ''
  );

  if (!isExecutive || requesterProfile?.status !== 'approved') {
    return { success: false, error: 'Forbidden: Insufficient administrative privileges.' };
  }

  // 2. Initialize Supabase Admin Service Client
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return { success: false, error: 'Server configuration error: Service role credentials missing.' };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 3. Delete user from Supabase Auth (Frees email for re-registration)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting user from Auth:', deleteAuthError.message);
      return { success: false, error: deleteAuthError.message };
    }

    // 4. Clean up relational user data across public tables
    await Promise.all([
      supabaseAdmin.from('timetable_slots').delete().eq('profile_id', userId),
      supabaseAdmin.from('profile_private').delete().eq('profile_id', userId),
      supabaseAdmin.from('profiles').delete().eq('id', userId),
      supabaseAdmin.from('club_members').delete().eq('email', email),
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected deletion error:', err);
    return { success: false, error: err?.message || 'Failed to complete user deletion.' };
  }
}