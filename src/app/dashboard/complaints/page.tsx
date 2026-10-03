"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  User, 
  FileText, 
  Users, 
  Clock, 
  MessageSquareCheck 
} from "lucide-react";

export default function ComplaintsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isExecutiveAdmin = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);

  // Tab State: "personal" | "team" | "submit"
  const [activeTab, setActiveTab] = useState<"personal" | "team" | "submit">("personal");

  // Complaint Form State (Member)
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Grievance");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin Resolution Modal State
  const [resolutionModal, setResolutionModal] = useState<{
    isOpen: boolean;
    complaint: any | null;
    status: string;
    notes: string;
  }>({
    isOpen: false,
    complaint: null,
    status: "In Progress",
    notes: ""
  });
  const [updatingResolution, setUpdatingResolution] = useState(false);

  // Custom Modal States
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false, message: ""
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; complaintId: string | null; subject: string }>({
    isOpen: false, complaintId: null, subject: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Real-time synchronization for complaint updates
    const channel = supabase
      .channel("complaints_realtime_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(userProfile);

    const { data: compData } = await supabase
      .from("complaints")
      .select("*, member:profiles!complaints_member_id_fkey(full_name, role, domain, srm_email)")
      .order("created_at", { ascending: false });

    setComplaints(compData || []);
    setLoading(false);
  }

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
      setAlertModal({ isOpen: true, message: "Failed to submit grievance: " + error.message });
    } else {
      setAlertModal({ isOpen: true, message: "Complaint logged successfully. Executive board has been notified." });
      setSubject("");
      setDescription("");
      setActiveTab("personal");
      fetchData();
    }
    setSubmitting(false);
  }

  // Admin Submits Resolution & Notifies Member
  async function handleSaveResolution(e: React.FormEvent) {
    e.preventDefault();
    const { complaint, status, notes } = resolutionModal;
    if (!complaint) return;

    setUpdatingResolution(true);

    const { error } = await supabase
      .from("complaints")
      .update({
        status,
        resolution_notes: notes.trim() || null
      })
      .eq("id", complaint.id);

    if (error) {
      setAlertModal({ isOpen: true, message: "Error updating complaint: " + error.message });
    } else {
      // Send real-time notification to the complaint author
      await supabase.from("notifications").insert({
        title: `⚠️ Complaint Status Updated: ${status}`,
        message: `Your grievance regarding "${complaint.subject}" is now set to ${status}.${notes ? ` Resolution details: "${notes}"` : ''}`,
        target_user_id: complaint.member_id,
        type: "notice"
      });

      setAlertModal({ isOpen: true, message: "Status updated & member notified successfully." });
      setResolutionModal({ isOpen: false, complaint: null, status: "In Progress", notes: "" });
      fetchData();
    }
    setUpdatingResolution(false);
  }

  async function confirmAndDeleteComplaint() {
    if (!deleteModal.complaintId) return;
    setIsDeleting(true);

    const { error } = await supabase.from("complaints").delete().eq("id", deleteModal.complaintId);
    setIsDeleting(false);
    setDeleteModal({ isOpen: false, complaintId: null, subject: "" });

    if (error) {
      setAlertModal({ isOpen: true, message: "Error deleting: " + error.message });
    } else {
      fetchData();
    }
  }

  if (loading) {
    return <div className="p-12 text-center opacity-50 text-xs">Loading grievance portal...</div>;
  }

  const personalComplaints = complaints.filter(c => c.member_id === profile?.id);
  const teamComplaints = complaints; // All complaints for admin view

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
    <div className="space-y-6">
      
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-rose-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Grievances & Complaints</h2>
            <p className="text-xs font-semibold opacity-65">Log confidential complaints, track status changes, and view resolution details.</p>
          </div>
        </div>

        {/* Separate Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "personal" ? "neo-pressed text-rose-500" : "neo-btn opacity-70"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Personal Complaints ({personalComplaints.length})
          </button>

          {isExecutiveAdmin && (
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "team" ? "neo-pressed text-amber-500" : "neo-btn opacity-70"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Team's Complaints ({teamComplaints.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "submit" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Log Complaint
          </button>
        </div>
      </div>

      {/* TAB 1: PERSONAL COMPLAINTS LOG (VISIBLE TO THE MEMBER) */}
      {activeTab === "personal" && (
        <div className="space-y-4">
          {personalComplaints.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">You have not logged any personal grievances.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {personalComplaints.map((comp) => (
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

                    <div className="flex items-center gap-1 text-[10px] opacity-50 font-mono">
                      <Clock className="w-3 h-3 text-amber-500" /> Logged: {new Date(comp.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="neo-pressed rounded-xl p-4 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                    {comp.description}
                  </div>

                  {/* Resolution Notes Provided by Admin */}
                  {comp.resolution_notes && (
                    <div className="p-4 neo-pressed rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-extrabold text-xs">
                        <MessageSquareCheck className="w-4 h-4" /> Admin Resolution Details
                      </div>
                      <p className="text-xs opacity-90 leading-relaxed italic">"{comp.resolution_notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEAM'S COMPLAINTS QUEUE (EXECUTIVE ADMIN ONLY) */}
      {activeTab === "team" && isExecutiveAdmin && (
        <div className="space-y-4">
          {teamComplaints.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No active grievances in team queue. All clear!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamComplaints.map((comp) => (
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
                      <button
                        onClick={() => setResolutionModal({
                          isOpen: true,
                          complaint: comp,
                          status: comp.status || "In Progress",
                          notes: comp.resolution_notes || ""
                        })}
                        className="px-3 py-2 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquareCheck className="w-3.5 h-3.5" /> Resolve / Update Status
                      </button>

                      <button
                        onClick={() => setDeleteModal({ isOpen: true, complaintId: comp.id, subject: comp.subject })}
                        className="p-2 neo-btn rounded-xl text-rose-500 hover:scale-105 transition-all cursor-pointer"
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

                  {comp.resolution_notes && (
                    <div className="p-3 neo-pressed rounded-xl border border-emerald-500/20 text-xs opacity-90 italic">
                      <span className="font-extrabold text-emerald-500 not-italic block text-[10px] uppercase">Logged Resolution Action:</span>
                      "{comp.resolution_notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOG COMPLAINT FORM */}
      {activeTab === "submit" && (
        <form onSubmit={handleCreateComplaint} className="neo-flat rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Log Club Grievance / Complaint</h3>
          </div>
          <p className="text-[10px] opacity-60">This log is securely routed directly to the Executive Committee for confidential resolution.</p>

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
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
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
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
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

          <button type="submit" disabled={submitting} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Grievance to Executives</>}
          </button>
        </form>
      )}

      {/* Admin Resolution & Action Description Modal */}
      {resolutionModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveResolution} className="w-full max-w-md neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-500 border-b border-white/10 pb-3">
              <MessageSquareCheck className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-widest">Resolve Grievance & Describe Action</h3>
            </div>

            <p className="text-xs font-bold truncate">"{resolutionModal.complaint?.subject}"</p>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Update Status *</label>
              <select
                value={resolutionModal.status}
                onChange={(e) => setResolutionModal({ ...resolutionModal, status: e.target.value })}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="Unsolved" className="bg-[var(--bg-surface)]">Unsolved</option>
                <option value="In Progress" className="bg-[var(--bg-surface)]">In Progress</option>
                <option value="Resolved" className="bg-[var(--bg-surface)] font-bold text-emerald-500">Resolved</option>
                <option value="Deadlock" className="bg-[var(--bg-surface)]">Deadlock</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Action Taken / Resolution Description</label>
              <textarea
                rows={4}
                placeholder="Describe what was done to solve this grievance or steps currently in progress..."
                value={resolutionModal.notes}
                onChange={(e) => setResolutionModal({ ...resolutionModal, notes: e.target.value })}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolutionModal({ isOpen: false, complaint: null, status: "In Progress", notes: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingResolution}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer"
              >
                {updatingResolution ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Notify Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Confirm Deletion</h3>
                <p className="text-[10px] opacity-60 font-semibold">Action is permanent</p>
              </div>
            </div>

            <div className="neo-pressed rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Grievance Subject:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteModal.subject}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, complaintId: null, subject: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteComplaint}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Notification</h3>
            </div>

            <p className="text-xs opacity-80 leading-relaxed px-1 text-[var(--text-main)]">{alertModal.message}</p>

            <button
              onClick={() => setAlertModal({ isOpen: false, message: "" })}
              className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
}