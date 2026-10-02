"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarCheck, CheckCircle2, XCircle, Users, ClipboardList, Plus, Loader2, Trash2 } from "lucide-react";

export default function AttendancePage() {
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"logs" | "take">("logs");

  // Take Attendance State
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDomain, setSessionDomain] = useState("all");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(userProfile);

      // If Domain Director, lock session domain to their domain
      if (userProfile?.role === "domain_director") {
        setSessionDomain(userProfile.domain);
      }

      await fetchData(userProfile);
      setLoading(false);
    }
    load();
  }, []);

  async function fetchData(userProfile: any) {
    // 1. Fetch eligible members based on role hierarchy
    let memberQuery = supabase.from("profiles").select("*").eq("status", "approved");
    if (userProfile?.role === "domain_director") {
      memberQuery = memberQuery.eq("domain", userProfile.domain);
    }
    const { data: memberData } = await memberQuery;
    setMembers(memberData || []);

    // Default everyone to present when opening the sheet
    const initialMap: Record<string, boolean> = {};
    memberData?.forEach((m) => {
      initialMap[m.id] = true;
    });
    setAttendanceMap(initialMap);

    // 2. Fetch Attendance Sessions & Records with Creator Profile info
    let sessionQuery = supabase
      .from("attendance_sessions")
      .select("*, creator:profiles!attendance_sessions_created_by_fkey(full_name, role), attendance_records(*, profiles(full_name, srm_email, reg_number, domain))")
      .order("date", { ascending: false });

    // If Domain Director, only show sessions matching their domain or 'all'
    if (userProfile?.role === "domain_director") {
      sessionQuery = sessionQuery.or(`domain.eq.${userProfile.domain},domain.eq.all`);
    }

    const { data: sessionData } = await sessionQuery;
    setSessions(sessionData || []);
  }

  const isGlobalAdmin = ["president", "secretary", "joint_secretary"].includes(profile?.role);
  const isDomainDirector = profile?.role === "domain_director";
  const canTakeAttendance = isGlobalAdmin || isDomainDirector;

  const toggleAttendance = (userId: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionTitle.trim()) {
      alert("Please provide a reason or purpose for this attendance session.");
      return;
    }

    setSubmitting(true);

    const { data: sessionRes, error: sessionErr } = await supabase
      .from("attendance_sessions")
      .insert({
        title: sessionTitle,
        domain: isDomainDirector ? profile.domain : sessionDomain,
        date: sessionDate,
        created_by: profile.id
      })
      .select()
      .single();

    if (sessionErr || !sessionRes) {
      alert("Failed to create session: " + sessionErr?.message);
      setSubmitting(false);
      return;
    }

    const recordsToInsert = members.map((m) => ({
      session_id: sessionRes.id,
      user_id: m.id,
      status: attendanceMap[m.id] ? "present" : "absent"
    }));

    const { error: recordErr } = await supabase.from("attendance_records").insert(recordsToInsert);

    if (recordErr) {
      alert("Failed to save records: " + recordErr.message);
    } else {
      alert("Attendance records successfully saved with detailed logs!");
      setSessionTitle("");
      setActiveTab("logs");
      fetchData(profile);
    }

    setSubmitting(false);
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Are you sure you want to delete this attendance session and all its records?")) return;

    // 1. Delete associated records first
    const { error: recErr } = await supabase
      .from("attendance_records")
      .delete()
      .eq("session_id", sessionId);

    if (recErr) {
      alert("Failed to delete attendance records: " + recErr.message);
      return;
    }

    // 2. Delete the session itself
    const { error: sessionErr } = await supabase
      .from("attendance_sessions")
      .delete()
      .eq("id", sessionId);

    if (sessionErr) {
      alert("Failed to delete session: " + sessionErr.message);
    } else {
      alert("Attendance session deleted successfully.");
      fetchData(profile);
    }
  }

  // Calculate Personal Stats for Regular Members / Admins
  const mySessions = sessions.filter((s) => s.attendance_records?.some((r: any) => r.user_id === profile?.id));
  const myPresent = mySessions.filter((s) => s.attendance_records?.find((r: any) => r.user_id === profile?.id)?.status === "present").length;
  const totalMySessions = mySessions.length;
  const attendanceRate = totalMySessions > 0 ? Math.round((myPresent / totalMySessions) * 100) : 100;
  const myAbsences = totalMySessions - myPresent;

  if (loading) {
    return <div className="p-10 text-center opacity-50 text-xs">Loading attendance portal...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Attendance Management</h2>
            <p className="text-xs font-semibold opacity-60">
              Track your personal participation and view detailed date-wise session sheets across meetings.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "logs" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Session Records
          </button>
          {canTakeAttendance && (
            <button
              onClick={() => setActiveTab("take")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "take" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
            >
              Take Attendance
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: LOGS & METRICS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          {/* Personal Stats Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
              <p className="text-2xl font-black text-emerald-500">{attendanceRate}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Attendance Rate</p>
            </div>
            <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
              <p className="text-2xl font-black text-gradient">{myPresent}/{totalMySessions}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Meetings Attended</p>
            </div>
            <div className="neo-flat rounded-2xl p-6 text-center space-y-1">
              <p className="text-2xl font-black text-amber-500">{myAbsences}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Absences</p>
            </div>
          </div>

          {/* Session History & Detailed Breakdown (Visible to all members) */}
          <div className="neo-flat rounded-[2rem] p-6 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 px-1">
              Detailed Attendance Logs & Member Breakdown
            </h3>

            <div className="space-y-4">
              {sessions.length === 0 ? (
                <p className="text-xs opacity-50 p-6 text-center">No attendance sessions recorded yet.</p>
              ) : (
                sessions.map((session) => {
                  const presentList = session.attendance_records?.filter((r: any) => r.status === "present") || [];
                  const absentList = session.attendance_records?.filter((r: any) => r.status === "absent") || [];
                  const totalCount = session.attendance_records?.length || 0;

                  return (
                    <div key={session.id} className="neo-pressed rounded-2xl p-5 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded">
                              {session.domain}
                            </span>
                            <span className="text-[10px] opacity-50">{session.date}</span>
                            <span className="text-[9px] opacity-40">• Taken by {session.creator?.full_name || "Admin"}</span>
                          </div>
                          <h4 className="font-extrabold text-sm mt-1">{session.title}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold px-3 py-1.5 neo-flat rounded-xl">
                            Present: <span className="text-emerald-500">{presentList.length}</span> / {totalCount}
                          </div>
                          {canTakeAttendance && (
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-2 rounded-xl text-rose-500 neo-btn hover:scale-105 transition-all"
                              title="Delete Attendance Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detailed Present & Absent Lists (Now visible to everyone) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        {/* Present Column */}
                        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present ({presentList.length})
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                            {presentList.map((rec: any) => (
                              <div key={rec.id} className="flex items-center justify-between text-[11px] py-0.5 px-2 rounded hover:bg-emerald-500/10">
                                <span className="font-semibold">{rec.profiles?.full_name}</span>
                                <span className="text-[9px] opacity-50 uppercase">{rec.profiles?.reg_number}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Absent Column */}
                        <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Absent ({absentList.length})
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                            {absentList.length === 0 ? (
                              <p className="text-[11px] opacity-40 italic px-2">No absences recorded.</p>
                            ) : (
                              absentList.map((rec: any) => (
                                <div key={rec.id} className="flex items-center justify-between text-[11px] py-0.5 px-2 rounded hover:bg-rose-500/10">
                                  <span className="font-semibold">{rec.profiles?.full_name}</span>
                                  <span className="text-[9px] opacity-50 uppercase">{rec.profiles?.reg_number}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TAKE ATTENDANCE (Admins & Domain Directors) */}
      {activeTab === "take" && canTakeAttendance && (
        <form onSubmit={handleSaveAttendance} className="neo-flat rounded-[2rem] p-6 space-y-5 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">
              Take Attendance Sheet {isDomainDirector && `(${profile.domain.toUpperCase()} Domain)`}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 px-1">Reason / Meeting Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Technical Sync, Project Review"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 px-1">Date *</label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {isGlobalAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 px-1">Target Domain</label>
              <select
                value={sessionDomain}
                onChange={(e) => setSessionDomain(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all" className="bg-[var(--bg-surface)]">All Domains / General Meet</option>
                <option value="technical" className="bg-[var(--bg-surface)]">Technical Domain</option>
                <option value="events" className="bg-[var(--bg-surface)]">Events Domain</option>
                <option value="creatives" className="bg-[var(--bg-surface)]">Creatives Domain</option>
                <option value="executive" className="bg-[var(--bg-surface)]">Executive Board</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase opacity-60 px-1 block">
              Mark Member Presence ({members.length} {isDomainDirector ? `${profile.domain} members` : 'total members'})
            </label>
            <div className="neo-pressed rounded-xl p-4 max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
              {members.map((m) => {
                const isPresent = attendanceMap[m.id] ?? true;
                return (
                  <div key={m.id} onClick={() => toggleAttendance(m.id)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                        {m.avatar_path ? <img src={m.avatar_path} alt="" className="w-full h-full object-cover" /> : <Users className="w-3.5 h-3.5 opacity-40" />}
                      </div>
                      <div>
                        <p className="font-bold text-xs">{m.full_name}</p>
                        <p className="text-[9px] opacity-50 uppercase">{m.domain} • {m.reg_number}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        isPresent ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                      }`}
                    >
                      {isPresent ? "Present" : "Absent"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Attendance Record</>}
          </button>
        </form>
      )}

    </div>
  );
}