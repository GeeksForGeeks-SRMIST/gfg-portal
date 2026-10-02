-- 1. Create Custom Enums
CREATE TYPE app_role AS ENUM (
  'president',
  'secretary',
  'joint_secretary',
  'domain_director',
  'associate_director',
  'member'
);

CREATE TYPE club_domain AS ENUM (
  'technical',
  'events',
  'creatives'
);

-- 2. Public Profile Directory
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  reg_number TEXT UNIQUE NOT NULL,
  srm_email TEXT UNIQUE NOT NULL,
  department TEXT,
  batch SMALLINT CHECK (batch IN (1, 2)),
  role app_role NOT NULL DEFAULT 'member',
  domain club_domain,
  linkedin_url TEXT,
  instagram_url TEXT,
  github_url TEXT,
  tagline TEXT,
  avatar_path TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sensitive Private Details
CREATE TABLE profile_private (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone TEXT,
  personal_email TEXT,
  fa_name TEXT,
  fa_phone TEXT,
  fa_email TEXT
);

-- 4. Helper Function for Role Checks
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_private ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Profiles
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own public profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 7. RLS Policies for Profile Private
CREATE POLICY "Private profile viewable by self and leads"
  ON profile_private FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR 
    auth_user_role() IN ('president', 'secretary', 'joint_secretary')
  );

CREATE POLICY "Users can update own private profile"
  ON profile_private FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());