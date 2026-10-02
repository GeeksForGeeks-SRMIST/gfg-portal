"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus, Calendar, Clock, MapPin, User, Tag, Trash2, Edit3, Loader2, CheckCircle2 } from "lucide-react";

export default function MinutesOfMeetingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [moms, setMoms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Form State for Create / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [domain, setDomain] = useState("general");
  const [host, setHost] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(userProfile);
    
    // Default recorder to current logged-in user if creating new
    if (!recordedBy && userProfile) {
      setRecordedBy(userProfile.id);
    }

    // Fetch approved members for dropdowns
    const { data: memberData } = await supabase
      .from("profiles")
      .select("id, full_name, role, domain")
      .eq("status", "approved")
      .order("full_name", { ascending: true });
    setMembers(memberData || []);

    const { data: momData } = await supabase
      .from("minutes_of_meeting")
      .select("*, recorder:profiles!minutes_of_meeting_recorded_by_fkey(full_name, role)")
      .order("date", { ascending: false });

    setMoms(momData || []);
    setLoading(false);
  }

  const isPrivileged = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);

  const handleOpenEdit = (mom: any) => {
    setEditingId(mom.id);
    setSubject(mom.subject);
    setVenue(mom.venue);
    setDate(mom.date);
    setStartTime(mom.start_time);
    setEndTime(mom.end_time);
    setDomain(mom.domain);
    setHost(mom.host);
    setRecordedBy(mom.recorded_by || profile?.id);
    setDescription(mom.description);
    setActiveTab("create");
  };

  const resetForm = () => {
    setEditingId(null);
    setSubject("");
    setVenue("");
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("17:00");
    setEndTime("18:00");
    setDomain("general");
    setHost("");
    setRecordedBy(profile?.id || "");
    setDescription("");
  };

  async function handleSaveMOM(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !venue || !description || !host || !recordedBy) return;
    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase.from("minutes_of_meeting").update({
        subject,
        venue,
        date,
        start_time: startTime,
        end_time: endTime,
        domain,
        host,
        recorded_by: recordedBy,
        description
      }).eq("id", editingId);

      if (error) alert("Error updating MOM: " + error.message);
      else alert("Minutes of Meeting updated successfully!");
    } else {
      const { error } = await supabase.from("minutes_of_meeting").insert({
        subject,
        venue,
        date,
        start_time: startTime,
        end_time: endTime,
        domain,
        host,
        recorded_by: recordedBy,
        description
      });

      if (error) alert("Error creating MOM: " + error.message);
      else alert("Minutes of Meeting recorded successfully!");
    }

    setSubmitting(false);
    resetForm();
    setActiveTab("list");
    fetchData();
  }

  async function handleDeleteMOM(mom: any) {
    const canDelete = isPrivileged || mom.recorded_by === profile?.id;
    if (!canDelete) {
      alert("You do not have permission to delete this record.");
      return;
    }

    if (!confirm("Are you sure you want to delete these minutes of meeting?")) return;

    const { error } = await supabase.from("minutes_of_meeting").delete().eq("id", mom.id);
    if (error) alert("Error deleting: " + error.message);
    else fetchData();
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Minutes of Meeting (MoM)</h2>
            <p className="text-xs font-semibold opacity-60">Record and review meeting notes, venues, agendas, and decisions.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setActiveTab("list"); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "list" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            All MoM Records ({moms.length})
          </button>
          <button
            onClick={() => { resetForm(); setActiveTab("create"); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Record New MoM
          </button>
        </div>
      </div>

      {/* TAB 1: MOM LIST */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : moms.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No minutes of meeting recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {moms.map((mom) => {
                const canModify = isPrivileged || mom.recorded_by === profile?.id;
                return (
                  <div key={mom.id} className="neo-flat rounded-2xl p-6 space-y-4 border border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded">
                            {mom.domain}
                          </span>
                          <span className="text-[10px] opacity-50 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {mom.date}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold mt-1">{mom.subject}</h3>
                      </div>

                      {canModify && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(mom)}
                            className="p-2 neo-btn rounded-xl text-emerald-500 hover:scale-105 transition-all"
                            title="Edit MoM"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMOM(mom)}
                            className="p-2 neo-btn rounded-xl text-rose-500 hover:scale-105 transition-all"
                            title="Delete MoM"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="neo-pressed rounded-xl p-2.5 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</span>
                        <p className="font-semibold truncate">{mom.venue}</p>
                      </div>

                      <div className="neo-pressed rounded-xl p-2.5 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-1"><Clock className="w-3 h-3" /> Timings</span>
                        <p className="font-semibold">{mom.start_time} - {mom.end_time}</p>
                      </div>

                      <div className="neo-pressed rounded-xl p-2.5 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-1"><User className="w-3 h-3" /> Host</span>
                        <p className="font-semibold truncate">{mom.host}</p>
                      </div>

                      <div className="neo-pressed rounded-xl p-2.5 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-1"><FileText className="w-3 h-3" /> Recorder</span>
                        <p className="font-semibold text-emerald-500 truncate">{mom.recorder?.full_name || "Member"}</p>
                      </div>
                    </div>

                    <div className="neo-pressed rounded-xl p-4 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                      {mom.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE / EDIT FORM */}
      {activeTab === "create" && (
        <form onSubmit={handleSaveMOM} className="neo-flat rounded-2xl p-6 max-w-2xl mx-auto space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">
            {editingId ? "Edit Minutes of Meeting" : "Record New Minutes of Meeting"}
          </h3>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Meeting Subject / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Core Team Sprint Planning & Tech Stack Review"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Venue *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tech Park Mini Hall 2 / Online GMeet"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Meeting Host *</label>
              <select
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="" className="bg-[var(--bg-surface)]">-- Select Meeting Host --</option>
                {members.map((m) => (
                  <option key={m.id} value={`${m.full_name} (${m.role.replace('_', ' ').toUpperCase()})`} className="bg-[var(--bg-surface)]">
                    {m.full_name} ({m.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">MoM Recorder (Taken By) *</label>
              <select
                required
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-emerald-500 font-bold"
              >
                <option value="" className="bg-[var(--bg-surface)]">-- Select Member Taking MoM --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                    {m.full_name} ({m.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Domain Classification</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="general" className="bg-[var(--bg-surface)]">General Meeting</option>
                <option value="technical" className="bg-[var(--bg-surface)]">Technical Domain</option>
                <option value="events" className="bg-[var(--bg-surface)]">Events Domain</option>
                <option value="creatives" className="bg-[var(--bg-surface)]">Creatives Domain</option>
                <option value="executive" className="bg-[var(--bg-surface)]">Executive Board</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Meeting Notes, Updates & Decisions *</label>
            <textarea
              required
              rows={6}
              placeholder="Detail all discussion points, action items, task delegations, and key updates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { resetForm(); setActiveTab("list"); }}
              className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Update MoM Record" : "Save MoM Record")}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}