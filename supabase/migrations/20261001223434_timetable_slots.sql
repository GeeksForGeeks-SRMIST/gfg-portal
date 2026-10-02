-- 1. Create Timetable Free Slots Table
CREATE TABLE timetable_slots (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_order SMALLINT CHECK (day_order BETWEEN 1 AND 5),
  free_slots TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (profile_id, day_order)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Timetable Slots
CREATE POLICY "Timetables viewable by authenticated users"
  ON timetable_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can edit own timetable"
  ON timetable_slots FOR ALL
  TO authenticated
  USING (profile_id = auth.uid());