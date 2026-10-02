"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Plus, CheckCircle2, Clock, XCircle, ShieldAlert, Loader2, Trash2, User, FileText, Lock } from "lucide-react";

export default function ComplaintsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "submit">("queue");

  // Complaint Form State (Member)
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Grievance");
  const [severity, setSeverity] = useState("Medium");
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

    // Fetch complaints with author join
    const { data: compData } = await supabase
      .from("complaints")
      .select("*, member:profiles!complaints_member_id_fkey(full_name, role, domain, srm_email)")
      .order("created_at", { ascending: false });

    setComplaints(compData || []);
    setLoading(false);
  }

  const isExecutiveAdmin = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);

  async function handleCreateComplaint(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !description) return;
    setSubmitting(true);

    const { error } = await supabase.from("complaints").insert({
      member_id: profile.id,
      subject,
      category,
      severity,
      description,
      status: "Unsolved"
    });

    if (error) {
      alert("Failed to submit grievance: " + error.message);
    } else {
      alert("Complaint logged successfully. Executive board has been notified.");
      setSubject("");
      setDescription("");
      setActiveTab(isExecutiveAdmin ? "queue" : "submit");
      fetchData();
    }
    setSubmitting(false);
  }

  async function handleUpdateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("complaints")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      fetchData();
    }
  }

  async function handleDeleteComplaint(id: string) {
    if (!confirm("Are you sure you want to delete this complaint record?")) return;
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    else fetchData();
  }

  if (loading) {
    return <div className="p-12 text-center opacity-50 text-xs">Loading grievance portal...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-rose-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Grievances & Complaints</h2>
            <p className="text-xs font-semibold opacity-65">
              {isExecutiveAdmin ? "Administrative resolution queue for member grievances and issues." : "Log confidential club complaints or operational feedback."}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isExecutiveAdmin && (
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "queue" ? "neo-pressed text-rose-500" : "neo-btn opacity-70"}`}
            >
              Admin Queue ({complaints.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "submit" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Log Complaint
          </button>
        </div>
      </div>

      {/* TAB 1: ADMIN QUEUE (President, Secretary, Jt. Secretary Only) */}
      {activeTab === "queue" && isExecutiveAdmin && (
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No active grievances logged. All clear!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((comp) => {
                const getStatusTheme = (st: string) => {
                  switch (st) {
                    case "Resolved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    case "In Progress": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
                    case "Deadlock": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
                    default: return "bg-rose-500/10 text-rose-500 border-rose-500/20";
                  }
                };

                const getSeverityTheme = (sev: string) => {
                  switch (sev) {
                    case "Urgent": return "text-rose-500 font-black";
                    case "High": return "text-amber-500 font-bold";
                    default: return "opacity-60 font-semibold";
                  }
                };

                return (
                  <div key={comp.id} className="neo-flat rounded-2xl p-6 space-y-4 border border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded border ${getStatusTheme(comp.status)} font-extrabold`}>
                            {comp.status}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded opacity-70">
                            {comp.category}
                          </span>
                          <span className={`text-[10px] ${getSeverityTheme(comp.severity)}`}>
                            Severity: {comp.severity}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold mt-1.5">{comp.subject}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Change Dropdown */}
                        <select
                          value={comp.status}
                          onChange={(e) => handleUpdateStatus(comp.id, e.target.value)}
                          className="px-3 py-1.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold"
                        >
                          <option value="Unsolved" className="bg-[var(--bg-surface)]">Unsolved</option>
                          <option value="In Progress" className="bg-[var(--bg-surface)]">In Progress</option>
                          <option value="Resolved" className="bg-[var(--bg-surface)]">Resolved</option>
                          <option value="Deadlock" className="bg-[var(--bg-surface)]">Deadlock</option>
                        </select>

                        <button
                          onClick={() => handleDeleteComplaint(comp.id)}
                          className="p-2 neo-btn rounded-xl text-rose-500 hover:scale-105 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-7 h-7 rounded-full neo-pressed flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 opacity-50" />
                      </div>
                      <div>
                        <p className="font-bold">{comp.member?.full_name || "Anonymous Member"}</p>
                        <p className="text-[9px] opacity-50 uppercase">{comp.member?.role?.replace("_", " ")} • {comp.member?.domain} • {comp.member?.srm_email}</p>
                      </div>
                    </div>

                    <div className="neo-pressed rounded-xl p-4 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                      {comp.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOG COMPLAINT FORM (Visible to All Members) */}
      {activeTab === "submit" && (
        <form onSubmit={handleCreateComplaint} className="neo-flat rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Log Club Grievance / Complaint</h3>
          </div>
          <p className="text-[10px] opacity-60">This log is securely routed directly to the Executive Committee (President, Secretaries) for review.</p>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Subject / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Equipment access issue in Tech Park lab"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="General Grievance" className="bg-[var(--bg-surface)]">General Grievance</option>
                <option value="Task & Scheduling" className="bg-[var(--bg-surface)]">Task & Scheduling</option>
                <option value="Interpersonal" className="bg-[var(--bg-surface)]">Interpersonal / Team Issue</option>
                <option value="Infrastructure" className="bg-[var(--bg-surface)]">Infrastructure & Lab</option>
                <option value="Other" className="bg-[var(--bg-surface)]">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="Low" className="bg-[var(--bg-surface)]">Low</option>
                <option value="Medium" className="bg-[var(--bg-surface)]">Medium</option>
                <option value="High" className="bg-[var(--bg-surface)]">High</option>
                <option value="Urgent" className="bg-[var(--bg-surface)] text-rose-500 font-bold">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Detailed Description *</label>
            <textarea
              required
              rows={5}
              placeholder="Describe the grievance or issue with relevant context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
            />
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Grievance to Executives</>}
          </button>
        </form>
      )}

    </div>
  );
}