import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_PASSWORD = "Geeks@1srm2026";

interface MemberRow {
  Name: string;
  Phone: string | number;
  "Registration Number": string;
  "Club Domain": string;
  "Club Position": string;
  "SRM Mail ID": string;
  "Personal Mail ID": string;
  Department: string;
  "LinkedIn Profile Link": string;
  "Batch (1/2)": string | number;
  "Faculty Advisor Name": string;
  "FA Phone Number": string | number;
  "FA Mail ID": string;
  "Day Order 1": string;
  "Day Order 2": string;
  "Day Order 3": string;
  "Day Order 4": string;
  "Day Order 5": string;
  "Instagram Profile Link": string;
  "Github Profile Link": string;
  "Give one tagline to describe yourself": string;
}

const parseRole = (position: string): string => {
  const pos = (position || "").toLowerCase().trim();
  if (pos.includes("president")) return "president";
  if (pos.includes("joint secretary") || pos.includes("jt secretary")) return "joint_secretary";
  if (pos.includes("secretary")) return "secretary";
  if (pos.includes("associate director")) return "associate_director";
  if (pos.includes("director")) return "domain_director";
  return "member";
};

const parseDomain = (domain: string): string | null => {
  const dom = (domain || "").toLowerCase().trim();
  if (dom.includes("tech")) return "technical";
  if (dom.includes("event")) return "events";
  if (dom.includes("creative")) return "creatives";
  return null;
};

const parseSlots = (slotStr: string): string[] => {
  if (!slotStr) return [];
  return slotStr
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
};

async function importMembers() {
  const csvFilePath = path.join(process.cwd(), "members.csv");
  if (!fs.existsSync(csvFilePath)) {
    console.error("members.csv file not found in project root directory.");
    return;
  }

  const results: MemberRow[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (data: MemberRow) => results.push(data))
    .on("end", async () => {
      console.log(`Starting import for ${results.length} members...`);

      for (const row of results) {
        const srmEmail = row["SRM Mail ID"]?.trim();
        const fullName = row["Name"]?.trim();
        const regNum = row["Registration Number"]?.trim();

        if (!srmEmail || !fullName || !regNum) {
          console.warn(`Skipping row with missing mandatory fields: ${fullName}`);
          continue;
        }

        // 1. Create Supabase Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: srmEmail,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (authError) {
          console.error(`Auth Error for ${srmEmail}:`, authError.message);
          continue;
        }

        const userId = authData.user.id;

        // 2. Insert into Public Profiles
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: fullName,
          reg_number: regNum,
          srm_email: srmEmail,
          department: row["Department"]?.trim() || null,
          batch: parseInt(String(row["Batch (1/2)"])) || 1,
          role: parseRole(row["Club Position"]),
          domain: parseDomain(row["Club Domain"]),
          linkedin_url: row["LinkedIn Profile Link"]?.trim() || null,
          instagram_url: row["Instagram Profile Link"]?.trim() || null,
          github_url: row["Github Profile Link"]?.trim() || null,
          tagline: row["Give one tagline to describe yourself"]?.trim() || null,
          must_change_password: true,
        });

        if (profileError) {
          console.error(`Profile Error for ${fullName}:`, profileError.message);
          continue;
        }

        // 3. Insert into Profile Private
        const { error: privateError } = await supabase.from("profile_private").insert({
          profile_id: userId,
          phone: row["Phone"] ? String(row["Phone"]).trim() : null,
          personal_email: row["Personal Mail ID"]?.trim() || null,
          fa_name: row["Faculty Advisor Name"]?.trim() || null,
          fa_phone: row["FA Phone Number"] ? String(row["FA Phone Number"]).trim() : null,
          fa_email: row["FA Mail ID"]?.trim() || null,
        });

        if (privateError) {
          console.error(`Private Info Error for ${fullName}:`, privateError.message);
        }

        // 4. Insert Timetable Slots (Day Orders 1-5)
        for (let day = 1; day <= 5; day++) {
          const rawDayVal = row[`Day Order ${day}` as keyof MemberRow] as string;
          const freeSlots = parseSlots(rawDayVal);

          if (freeSlots.length > 0) {
            const { error: slotError } = await supabase.from("timetable_slots").insert({
              profile_id: userId,
              day_order: day,
              free_slots: freeSlots,
            });

            if (slotError) {
              console.error(`Slot Error for ${fullName} DO ${day}:`, slotError.message);
            }
          }
        }

        console.log(`Successfully imported: ${fullName} (${srmEmail})`);
      }

      console.log("\nImport process completed successfully!");
    });
}

importMembers();