-- Username ve premium kolonu
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Gruplar
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grup üyeleri
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Basit politikalar (döngü olmadan)
CREATE POLICY "groups_select" ON groups FOR SELECT USING (true);
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_delete" ON groups FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "gm_select" ON group_members FOR SELECT USING (true);
CREATE POLICY "gm_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gm_delete" ON group_members FOR DELETE USING (auth.uid() IS NOT NULL);
