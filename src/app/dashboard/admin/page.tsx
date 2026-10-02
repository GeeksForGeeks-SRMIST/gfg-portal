"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Shield, Edit3, Trash2, CheckCircle2, Clock, XCircle, Loader2, Save, X, Eye, Share2, ArrowUpDown, AlertTriangle, PhoneCall } from "lucide-react";

const EXECUTIVE_ADMINS = [
  "president",
  "secretary",
  "joint_secretary"
];

export default function AdminHubPage() {
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  // Excel-like Sorting State
  const [sortField, setSortField] = useState<string>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modals
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);

  // Edit Form State (all fields in unified profiles table)
  const [editFullName, setEditFullName] = useState("");
  const [editRegNumber, setEditRegNumber] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSrmEmail, setEditSrmEmail] = useState("");
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDomain, setEditDomain] = useState("technical");
  const [editRole, setEditRole] = useState("member");
  const [editBatch, setEditBatch] = useState("1");
  const [editTagline, setEditTagline] = useState("");
  const [editFaName, setEditFaName] = useState("");
  const [editFaEmail, setEditFaEmail] = useState("");
  const [editFaPhone, setEditFaPhone] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  // Custom Modal States
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false, message: ""
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; memberId: string | null; name: string }>({
    isOpen: false, memberId: null, name: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(userProfile);

      // Fetch all profiles cleanly from unified table
      const { data: membersData, error: membersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (membersError) {
        console.error("Error fetching members:", membersError);
      }

      setMembers(membersData || []);
    } catch (err) {
      console.error("Error loading roster:", err);
    } finally {
      setLoading(false);
    }
  }

  const isPrivilegedAdmin = EXECUTIVE_ADMINS.includes(profile?.role?.toLowerCase());

  async function handleUpdateStatus(memberId: string, newStatus: "approved" | "rejected") {
    if (!isPrivilegedAdmin) {
      setAlertModal({ isOpen: true, message: "Permission denied: Only President, Secretary, and Joint Secretary can update approval status." });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", memberId);

    if (error) {
      setAlertModal({ isOpen: true, message: "Failed to update status: " + error.message });
    } else {
      setAlertModal({ isOpen: true, message: `Member status updated to ${newStatus} successfully!` });
      fetchData();
    }
  }

  const handleOpenEdit = (member: any) => {
    if (!isPrivilegedAdmin) {
      setAlertModal({ isOpen: true, message: "Permission denied: Only President, Secretary, and Joint Secretary can modify roster data." });
      return;
    }
    setEditingMember(member);
    setEditFullName(member.full_name || "");
    setEditRegNumber(member.reg_number || "");
    setEditDepartment(member.department || "");
    setEditSrmEmail(member.srm_email || "");
    setEditPersonalEmail(member.personal_email || "");
    setEditPhone(member.phone || "");
    setEditDomain(member.domain || "technical");
    setEditRole(member.role || "member");
    setEditBatch(member.batch?.toString() || "1");
    setEditTagline(member.tagline || "");
    setEditFaName(member.fa_name || "");
    setEditFaEmail(member.fa_email || "");
    setEditFaPhone(member.fa_phone || "");
    setEditLinkedin(member.linkedin_url || "");
    setEditGithub(member.github_url || "");
    setEditInstagram(member.instagram_url || "");
  };

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);

    const profilePayload = { 
      full_name: editFullName,
      reg_number: editRegNumber,
      department: editDepartment,
      srm_email: editSrmEmail,
      personal_email: editPersonalEmail,
      phone: editPhone,
      domain: editDomain,
      role: editRole,
      batch: parseInt(editBatch) || 1,
      tagline: editTagline,
      fa_name: editFaName,
      fa_email: editFaEmail,
      fa_phone: editFaPhone,
      linkedin_url: editLinkedin,
      github_url: editGithub,
      instagram_url: editInstagram
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", editingMember.id);

    if (profileError) {
      setAlertModal({ isOpen: true, message: "Failed to update member: " + profileError.message });
    } else {
      setAlertModal({ isOpen: true, message: "Member details updated successfully!" });
      setEditingMember(null);
      fetchData();
    }
    setSaving(false);
  }

  async function confirmAndDeleteMember() {
    if (!deleteModal.memberId) return;
    setIsDeleting(true);

    const { error } = await supabase.from("profiles").delete().eq("id", deleteModal.memberId);
    setIsDeleting(false);
    setDeleteModal({ isOpen: false, memberId: null, name: "" });

    if (error) {
      setAlertModal({ isOpen: true, message: "Error deleting: " + error.message });
    } else {
      fetchData();
    }
  }

  const promptDeleteMember = (memberId: string, name: string) => {
    if (!isPrivilegedAdmin) {
      setAlertModal({ isOpen: true, message: "Permission denied: Only President, Secretary, and Joint Secretary can remove members." });
      return;
    }
    setDeleteModal({ isOpen: true, memberId, name });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.reg_number?.toLowerCase().includes(search.toLowerCase()) ||
      m.srm_email?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDomain = domainFilter === "all" || m.domain === domainFilter;
    return matchesSearch && matchesDomain;
  }).sort((a, b) => {
    let aVal = a[sortField] || "";
    let bVal = b[sortField] || "";

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <div className="p-12 text-center opacity-50 text-xs">Loading Executive Management Hub...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Executive Management Hub</h2>
          <p className="text-xs font-semibold opacity-60">
            {isPrivilegedAdmin ? "Approve, sort, edit, and manage complete chapter team roster data." : "View team dossiers, directory info, and contact details."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search name, reg no, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold cursor-pointer"
          >
            <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
            <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
            <option value="events" className="bg-[var(--bg-surface)]">Events</option>
            <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="neo-flat rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--text-muted)]/15 bg-black/5 dark:bg-white/5 font-bold uppercase tracking-wider text-[10px] opacity-70">
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("full_name")}>
                  <div className="flex items-center gap-1.5">Member <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("role")}>
                  <div className="flex items-center gap-1.5">Role / Domain <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("phone")}>
                  <div className="flex items-center gap-1.5">Phone Number <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("srm_email")}>
                  <div className="flex items-center gap-1.5">Mail ID <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("batch")}>
                  <div className="flex items-center gap-1.5">Batch <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1.5">Status <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--text-muted)]/10 font-medium">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center opacity-50">No team members found.</td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                        {m.avatar_path ? (
                          <img src={m.avatar_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{m.full_name || "N/A"}</p>
                        <p className="text-[10px] opacity-50 font-mono">{m.reg_number || "N/A"}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">{m.role?.replace("_", " ") || "Member"}</span>
                      <p className="text-[10px] opacity-50 uppercase">{m.domain || "N/A"}</p>
                    </td>

                    <td className="p-4 font-mono">
                      {m.phone ? (
                        <a 
                          href={`tel:${m.phone}`} 
                          className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                          title="Click to Call"
                        >
                          <PhoneCall className="w-3 h-3" />
                          {m.phone}
                        </a>
                      ) : (
                        <span className="opacity-40">N/A</span>
                      )}
                    </td>

                    <td className="p-4 opacity-80 truncate max-w-[180px]">{m.srm_email || "N/A"}</td>
                    <td className="p-4 opacity-80">Batch {m.batch || "1"}</td>

                    <td className="p-4">
                      {m.status === "approved" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {m.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3 animate-pulse" /> Pending
                        </span>
                      )}
                      {m.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {isPrivilegedAdmin && m.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(m.id, "approved")}
                              className="px-2.5 py-1 rounded-xl neo-btn text-emerald-500 hover:scale-105 transition-all text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
                              title="Approve Member"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(m.id, "rejected")}
                              className="px-2.5 py-1 rounded-xl neo-btn text-rose-500 hover:scale-105 transition-all text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                              title="Reject Member"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setViewingMember(m)}
                          className="px-2.5 py-1 rounded-xl neo-btn text-emerald-500 hover:scale-105 transition-all flex items-center gap-1 font-extrabold text-[10px] bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>

                        {isPrivilegedAdmin && (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-2.5 py-1 rounded-xl neo-btn text-blue-500 hover:scale-105 transition-all flex items-center gap-1 font-extrabold text-[10px] bg-blue-500/10 border border-blue-500/20 cursor-pointer"
                            title="Edit Info"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        )}

                        {isPrivilegedAdmin && (
                          <button
                            onClick={() => promptDeleteMember(m.id, m.full_name)}
                            className="p-1.5 rounded-xl neo-btn text-rose-500 hover:scale-105 transition-all bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MEMBER DETAILS MODAL */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl neo-flat rounded-3xl p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Comprehensive Member Dossier</h3>
              <button type="button" onClick={() => setViewingMember(null)} className="p-1.5 neo-btn rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                {viewingMember.avatar_path ? (
                  <img src={viewingMember.avatar_path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-8 h-8 opacity-40" />
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-base">{viewingMember.full_name || "N/A"}</h4>
                <p className="text-xs text-emerald-500 font-bold capitalize">{viewingMember.role?.replace("_", " ") || "Member"} • {viewingMember.domain || "N/A"} Domain</p>
                <p className="text-[10px] opacity-60 italic mt-0.5">"{viewingMember.tagline || 'No tagline provided'}"</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">1. Member Credentials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">SRM Email ID</span>
                  <p className="font-semibold truncate">{viewingMember.srm_email || "N/A"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Personal Email</span>
                  <p className="font-semibold truncate">{viewingMember.personal_email || "N/A"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Registration Number</span>
                  <p className="font-semibold font-mono">{viewingMember.reg_number || "N/A"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Department</span>
                  <p className="font-semibold">{viewingMember.department || "N/A"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Phone Number</span>
                  {viewingMember.phone ? (
                    <a href={`tel:${viewingMember.phone}`} className="font-semibold text-emerald-500 hover:underline flex items-center gap-1">
                      <PhoneCall className="w-3 h-3" /> {viewingMember.phone}
                    </a>
                  ) : (
                    <p className="font-semibold opacity-40">N/A</p>
                  )}
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Batch</span>
                  <p className="font-semibold">Batch {viewingMember.batch || "1"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">2. FA & Social Handles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Faculty Advisor</span>
                  <p className="font-semibold">
                    {viewingMember.fa_name || "N/A"} 
                    {viewingMember.fa_phone ? (
                      <a href={`tel:${viewingMember.fa_phone}`} className="text-emerald-500 hover:underline inline-flex items-center gap-0.5 ml-1 font-bold">
                        ({viewingMember.fa_phone})
                      </a>
                    ) : (
                      " (No phone)"
                    )}
                  </p>
                  <p className="text-[10px] opacity-60 truncate">{viewingMember.fa_email || "No email"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Social Profiles</span>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {viewingMember.linkedin_url ? <a href={viewingMember.linkedin_url} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> LinkedIn</a> : <span className="text-[10px] opacity-40">No LinkedIn</span>}
                    {viewingMember.github_url && <a href={viewingMember.github_url} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> GitHub</a>}
                    {viewingMember.instagram_url && <a href={viewingMember.instagram_url} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> Instagram</a>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-6 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && isPrivilegedAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveMember} className="w-full max-w-xl neo-flat rounded-3xl p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Edit Complete Member Profile & Signup Data</h3>
              <button type="button" onClick={() => setEditingMember(null)} className="p-1.5 neo-btn rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">1. Member Credentials & Role</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Reg Number *</label>
                  <input
                    type="text"
                    required
                    value={editRegNumber}
                    onChange={(e) => setEditRegNumber(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">SRM Email ID *</label>
                  <input
                    type="email"
                    required
                    value={editSrmEmail}
                    onChange={(e) => setEditSrmEmail(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Personal Email</label>
                  <input
                    type="email"
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Domain *</label>
                  <select
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
                    <option value="events" className="bg-[var(--bg-surface)]">Events</option>
                    <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
                    <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Position *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="president" className="bg-[var(--bg-surface)]">President</option>
                    <option value="secretary" className="bg-[var(--bg-surface)]">Secretary</option>
                    <option value="joint_secretary" className="bg-[var(--bg-surface)]">Joint Secretary</option>
                    <option value="domain_director" className="bg-[var(--bg-surface)]">Domain Director</option>
                    <option value="associate_lead" className="bg-[var(--bg-surface)]">Associate Lead</option>
                    <option value="member" className="bg-[var(--bg-surface)]">Member</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Batch *</label>
                  <select
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="1" className="bg-[var(--bg-surface)]">Batch 1</option>
                    <option value="2" className="bg-[var(--bg-surface)]">Batch 2</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">One-line Tagline</label>
                <input
                  type="text"
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">2. Faculty Advisor Details</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Name</label>
                  <input
                    type="text"
                    value={editFaName}
                    onChange={(e) => setEditFaName(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Email</label>
                  <input
                    type="email"
                    value={editFaEmail}
                    onChange={(e) => setEditFaEmail(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Phone</label>
                  <input
                    type="text"
                    value={editFaPhone}
                    onChange={(e) => setEditFaPhone(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">3. Social Profiles</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">LinkedIn</label>
                  <input
                    type="url"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">GitHub</label>
                  <input
                    type="url"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Instagram</label>
                  <input
                    type="url"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Roster Edits</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Deletion Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Remove Member</h3>
                <p className="text-[10px] opacity-60 font-semibold">Action is permanent</p>
              </div>
            </div>

            <div className="neo-pressed rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Member Name:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteModal.name}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, memberId: null, name: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteMember}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
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