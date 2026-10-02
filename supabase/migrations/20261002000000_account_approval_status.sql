-- 1. Create custom enum type for account approval status
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create the missing auth_user_role() helper function
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 3. Add the status column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status account_status NOT NULL DEFAULT 'pending';

-- 4. Mark existing users as 'approved' so current core members aren't locked out
UPDATE profiles SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- 5. Drop existing policy if present and recreate the lead write policy
DROP POLICY IF EXISTS "Leads can insert, update, delete all profiles" ON profiles;

CREATE POLICY "Leads can insert, update, delete all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth_user_role() IN ('president', 'secretary', 'joint_secretary')
  );