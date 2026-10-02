"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Search, Shield, Edit3, Trash2, CheckCircle2, Clock, XCircle, Loader2, Save, X, Eye, Mail, Phone, Hash, Globe, Share2 } from "lucide-react";

const ADMIN_ROLES = [
  "president",
  "secretary",
  "joint_secretary",
  "domain_director",
  "admin",
  "super_admin"
];

export default function AdminHubPage() {
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  // Modals
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);

  // Expanded Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editRegNumber, setEditRegNumber] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDomain, setEditDomain] = useState("technical");
  const [editRole, setEditRole] = useState("member");
  const [editBatch, setEditBatch] = useState("2027");
  const [editTagline, setEditTagline] = useState("");
  const [editFaName, setEditFaName] = useState("");
  const [editFaEmail, setEditFaEmail] = useState("");
  const [editFaPhone, setEditFaPhone] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error:", authError);
        return;
      }
      if (!user) {
        console.error("No authenticated user found.");
        setLoading(false);
        return;
      }

      // Fetch current user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Current profile fetch error:", profileError);
      } else {
        console.log("CURRENT USER PROFILE:", userProfile);
        setProfile(userProfile);
      }

      // Fetch ALL team members with error tracking
      const { data: membersData, error: membersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (membersError) {
        console.error("MEMBERS FETCH ERROR:", membersError);
        alert("Could not load team members: " + membersError.message);
        setMembers([]);
      } else {
        console.log("ALL TEAM MEMBERS:", membersData);
        setMembers(membersData || []);
      }
    } catch (err) {
      console.error("Unexpected Admin Hub error:", err);
    } finally {
      setLoading(false);
    }
  }

  const isGlobalAdmin = ADMIN_ROLES.includes(profile?.role?.toLowerCase());

  const handleOpenEdit = (member: any) => {
    if (!isGlobalAdmin) {
      alert("Permission denied: Administrative clearance required to modify team roster data.");
      return;
    }
    setEditingMember(member);
    setEditFullName(member.full_name || "");
    setEditRegNumber(member.reg_number || "");
    setEditDepartment(member.department || "");
    setEditPersonalEmail(member.personal_email || "");
    setEditPhone(member.phone || "");
    setEditDomain(member.domain || "technical");
    setEditRole(member.role || "member");
    setEditBatch(member.batch || "2027");
    setEditTagline(member.tagline || "");
    setEditFaName(member.fa_name || "");
    setEditFaEmail(member.fa_email || "");
    setEditFaPhone(member.fa_phone || "");
    setEditLinkedin(member.linkedin_link || "");
    setEditGithub(member.github_link || "");
    setEditInstagram(member.instagram_link || "");
  };

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);

    const updatePayload = { 
      full_name: editFullName,
      reg_number: editRegNumber,
      department: editDepartment,
      personal_email: editPersonalEmail,
      phone: editPhone,
      domain: editDomain,
      role: editRole,
      batch: editBatch,
      tagline: editTagline,
      fa_name: editFaName,
      fa_email: editFaEmail,
      fa_phone: editFaPhone,
      linkedin_link: editLinkedin,
      github_link: editGithub,
      instagram_link: editInstagram
    };

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", editingMember.id);

    if (error) {
      console.error("Update error:", error);
      alert("Failed to update member: " + error.message);
    } else {
      alert("Member details updated successfully!");
      setEditingMember(null);
      fetchData();
    }
    setSaving(false);
  }

  async function handleDeleteMember(memberId: string) {
    if (!isGlobalAdmin) {
      alert("Permission denied: Only executive admins can remove members.");
      return;
    }
    if (!confirm("Are you sure you want to remove this member from the directory?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", memberId);
    if (error) alert("Error deleting: " + error.message);
    else fetchData();
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.reg_number?.toLowerCase().includes(search.toLowerCase()) ||
      m.srm_email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDomain = domainFilter === "all" || m.domain === domainFilter;
    return matchesSearch && matchesDomain;
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
            Approve onboarding requests, view complete profiles, and manage chapter member data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold"
          >
            <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
            <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
            <option value="events" className="bg-[var(--bg-surface)]">Events</option>
            <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
          </select>
        </div>
      </div>

      {/* Members Table with View, Edit & Delete */}
      <div className="neo-flat rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--text-muted)]/15 bg-black/5 dark:bg-white/5 font-bold uppercase tracking-wider text-[10px] opacity-70">
                <th className="p-4">Member</th>
                <th className="p-4">Role / Domain</th>
                <th className="p-4">Reg Number</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--text-muted)]/10 font-medium">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center opacity-50">No team members found.</td>
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
                        <p className="font-bold">{m.full_name}</p>
                        <p className="text-[10px] opacity-50">{m.srm_email}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">{m.role?.replace("_", " ")}</span>
                      <p className="text-[10px] opacity-50 uppercase">{m.domain || "N/A"}</p>
                    </td>

                    <td className="p-4 opacity-80 font-mono">{m.reg_number || "N/A"}</td>

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
                      <div className="flex items-center justify-end gap-2">
                        {/* VIEW BUTTON */}
                        <button
                          onClick={() => setViewingMember(m)}
                          className="px-3 py-1.5 rounded-xl neo-btn text-emerald-500 hover:scale-105 transition-all flex items-center gap-1 font-extrabold text-[10px] bg-emerald-500/10 border border-emerald-500/20"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>

                        {/* EDIT BUTTON */}
                        {isGlobalAdmin && (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-3 py-1.5 rounded-xl neo-btn text-blue-500 hover:scale-105 transition-all flex items-center gap-1 font-extrabold text-[10px] bg-blue-500/10 border border-blue-500/20"
                            title="Edit Info"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}

                        {/* DELETE BUTTON */}
                        {isGlobalAdmin && (
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-2 rounded-xl neo-btn text-rose-500 hover:scale-105 transition-all bg-rose-500/10 border border-rose-500/20"
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
              <button type="button" onClick={() => setViewingMember(null)} className="p-1.5 neo-btn rounded-xl">
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
                <h4 className="font-extrabold text-base">{viewingMember.full_name}</h4>
                <p className="text-xs text-emerald-500 font-bold capitalize">{viewingMember.role?.replace("_", " ")} • {viewingMember.domain} Domain</p>
                <p className="text-[10px] opacity-60 italic mt-0.5">"{viewingMember.tagline || 'No tagline provided'}"</p>
              </div>
            </div>

            {/* Section 1: Credentials */}
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
                  <p className="font-semibold">{viewingMember.phone || "N/A"}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Batch</span>
                  <p className="font-semibold">{viewingMember.batch || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Section 2: FA & Social Handles */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">2. FA & Social Handles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Faculty Advisor</span>
                  <p className="font-semibold">{viewingMember.fa_name || "N/A"} ({viewingMember.fa_phone || "No phone"})</p>
                  <p className="text-[10px] opacity-60 truncate">{viewingMember.fa_email}</p>
                </div>
                <div className="neo-pressed rounded-xl p-3 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-45">Social Profiles</span>
                  <div className="flex gap-2 pt-1">
                    {viewingMember.linkedin_link && <a href={viewingMember.linkedin_link} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> LinkedIn</a>}
                    {viewingMember.github_link && <a href={viewingMember.github_link} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> GitHub</a>}
                    {viewingMember.instagram_link && <a href={viewingMember.instagram_link} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px] font-bold"><Share2 className="w-3 h-3" /> Instagram</a>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-6 py-3 neo-btn rounded-xl text-xs font-bold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && isGlobalAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveMember} className="w-full max-w-xl neo-flat rounded-3xl p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Edit Member Profile & Credentials</h3>
              <button type="button" onClick={() => setEditingMember(null)} className="p-1.5 neo-btn rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1 Edit */}
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
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Personal Email</label>
                  <input
                    type="email"
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Domain *</label>
                  <select
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
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
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  >
                    <option value="president" className="bg-[var(--bg-surface)]">President</option>
                    <option value="secretary" className="bg-[var(--bg-surface)]">Secretary</option>
                    <option value="joint_secretary" className="bg-[var(--bg-surface)]">Joint Secretary</option>
                    <option value="domain_director" className="bg-[var(--bg-surface)]">Domain Director</option>
                    <option value="associate_lead" className="bg-[var(--bg-surface)]">Associate Lead</option>
                    <option value="member" className="bg-[var(--bg-surface)]">Member</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Batch *</label>
                  <select
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  >
                    <option value="1" className="bg-[var(--bg-surface)]">Batch 1</option>
                    <option value="2" className="bg-[var(--bg-surface)]">Batch 2</option>
                    <option value="2027" className="bg-[var(--bg-surface)]">2027</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">One-line Tagline *</label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 Edit */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">2. FA & Social Handles</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Name *</label>
                  <input
                    type="text"
                    value={editFaName}
                    onChange={(e) => setEditFaName(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Email *</label>
                  <input
                    type="email"
                    value={editFaEmail}
                    onChange={(e) => setEditFaEmail(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">FA Phone *</label>
                  <input
                    type="text"
                    value={editFaPhone}
                    onChange={(e) => setEditFaPhone(e.target.value)}
                    className="w-full px-3 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">LinkedIn *</label>
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
                  <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Instagram *</label>
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
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Roster Edits</>}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}