"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarCheck, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function AttendancePage() {
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
          <CalendarCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Attendance Logs</h2>
          <p className="text-xs font-semibold opacity-60">Track your attendance across core meetings and event duties.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
          <p className="text-2xl font-black text-emerald-500">100%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Attendance Rate</p>
        </div>
        <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
          <p className="text-2xl font-black text-gradient">12/12</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Meetings Attended</p>
        </div>
        <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
          <p className="text-2xl font-black text-amber-500">0</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Absences</p>
        </div>
      </div>

      <div className="neo-flat rounded-[2rem] p-6 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 px-1">Recent Meeting Logs</h3>
        <div className="space-y-3">
          <div className="neo-pressed rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">General Body Meeting #3</p>
              <p className="text-[10px] opacity-50">September 28, 2026 • Tech Park Auditorium</p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Present
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}