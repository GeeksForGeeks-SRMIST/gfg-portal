"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  UserCircle, Mail, Phone, MapPin, ExternalLink, ShieldCheck, 
  Loader2, Award, Sparkles, BookOpen, Edit3, X, Save, Upload, 
  Globe, Hash, User, Lock, PlusCircle 
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [privateDetails, setPrivateDetails] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Social Links State
  const [addLinkedin, setAddLinkedin] = useState("");
  const [addGithub, setAddGithub] = useState("");
  const [addInstagram, setAddInstagram] = useState("");
  const [addPortfolio, setAddPortfolio] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchFullProfile();
  }, []);

  async function fetchFullProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: privData } = await supabase.from("profile_private").select("*").eq("profile_id", user.id).single();
    
    setProfile(pData);
    setPrivateDetails(privData);
    setEditPhone(privData?.phone || pData?.phone || "");
    setEditPersonalEmail(privData?.personal_email || "");
    setAvatarPreview(pData?.avatar_path || null);

    const { data: leadsData } = await supabase
      .from("profiles")
      .select("full_name, role, srm_email, avatar_path, domain")
      .in("role", ["president", "secretary", "joint_secretary", "domain_director"])
      .eq("status", "approved");

    const relevantLeads = leadsData?.filter(l => 
      l.role !== 'domain_director' || (l.role === 'domain_director' && l.domain === pData?.domain)
    );

    setLeads(relevantLeads || []);
    setLoading(false);
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    let newAvatarUrl = profile.avatar_path;

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        newAvatarUrl = publicUrlData.publicUrl;
      }
    }

    // Build profile updates object using portfolio_url
    const profileUpdates: any = { avatar_path: newAvatarUrl };
    if (!profile.linkedin_url && addLinkedin.trim()) profileUpdates.linkedin_url = addLinkedin.trim();
    if (!profile.github_url && addGithub.trim()) profileUpdates.github_url = addGithub.trim();
    if (!profile.instagram_url && addInstagram.trim()) profileUpdates.instagram_url = addInstagram.trim();
    if (!profile.portfolio_url && addPortfolio.trim()) {
      profileUpdates.portfolio_url = addPortfolio.trim();
    }

    const { error: updateErr } = await supabase.from("profiles").update(profileUpdates).eq("id", profile.id);
    if (updateErr) {
      alert("Error updating profile links: " + updateErr.message);
    }

    // Update private info
    const { data: existingPriv } = await supabase.from("profile_private").select("id").eq("profile_id", profile.id).single();

    if (existingPriv) {
      await supabase.from("profile_private").update({
        phone: editPhone,
        personal_email: editPersonalEmail
      }).eq("profile_id", profile.id);
    } else {
      await supabase.from("profile_private").insert({
        profile_id: profile.id,
        phone: editPhone,
        personal_email: editPersonalEmail
      });
    }

    // Update password if provided
    if (newPassword.trim()) {
      const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (pwdErr) {
        alert("Error updating password: " + pwdErr.message);
      }
    }

    alert("Profile updated successfully!");
    setIsEditing(false);
    setNewPassword("");
    setAddLinkedin("");
    setAddGithub("");
    setAddInstagram("");
    setAddPortfolio("");
    setSaving(false);
    fetchFullProfile();
  }

  if (loading || !profile) {
    return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  const linkedinLink = profile.linkedin_url;
  const githubLink = profile.github_url;
  const instagramLink = profile.instagram_url;
  const portfolioLink = profile.portfolio_url;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* THEME-ADAPTIVE NEO-FLAT IDENTITY CONTAINER */}
      <div className="neo-flat rounded-[2.5rem] p-8 md:p-10 relative border border-[var(--text-muted)]/10 shadow-xl">
        
        {/* Top Header Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 neo-pressed px-4 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Verified Core Member
          </div>
          
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold neo-btn-green flex items-center gap-2 shadow"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        {/* Profile Identity Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          
          {/* Avatar */}
          <div className="w-36 h-36 rounded-[2.2rem] p-1.5 shrink-0 neo-pressed shadow-inner relative">
            {profile.avatar_path ? (
              <img src={profile.avatar_path} alt="Avatar" className="w-full h-full object-cover rounded-[1.85rem]" />
            ) : (
              <div className="w-full h-full rounded-[1.85rem] flex items-center justify-center">
                <UserCircle className="w-16 h-16 opacity-30" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[var(--bg-surface)] shadow" title="Active" />
          </div>
          
          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight">{profile.full_name}</h1>
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-xl">
                {profile.role?.replace("_", " ")}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest neo-pressed px-3.5 py-1 rounded-xl opacity-80">
                {profile.domain || "General"} Domain
              </span>
            </div>
            
            <p className="text-xs font-mono font-bold opacity-60">{profile.reg_number || "SRM Institute of Science and Technology"}</p>
            
            <p className="text-sm font-medium italic opacity-85 pt-1">
              "{profile.tagline || 'Community Leader'}"
            </p>

            {/* Branded Social Buttons */}
            <div className="flex flex-wrap gap-3 pt-3">
              {linkedinLink && (
                <a 
                  href={linkedinLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold neo-btn text-[#0A66C2] flex items-center gap-2 shadow"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> LinkedIn
                </a>
              )}
              {githubLink && (
                <a 
                  href={githubLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold neo-btn flex items-center gap-2 shadow"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> GitHub
                </a>
              )}
              {instagramLink && (
                <a 
                  href={instagramLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold neo-btn text-rose-500 flex items-center gap-2 shadow"
                >
                  Instagram
                </a>
              )}
              {portfolioLink && (
                <a 
                  href={portfolioLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold neo-btn text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow"
                >
                  <Globe className="w-4 h-4" /> Portfolio
                </a>
              )}
            </div>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Academic & Personal Details */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="neo-flat rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--text-muted)]/10 pb-4">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Personal & Academic Records</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
              <DetailItem icon={<Hash className="w-4 h-4" />} label="Registration Number" value={profile.reg_number || "N/A"} />
              <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Department & Batch" value={`${profile.department || "Computer Science"} (Batch ${profile.batch || "2027"})`} />
              <DetailItem icon={<Mail className="w-4 h-4" />} label="SRM Official Email" value={profile.srm_email || "N/A"} />
              <DetailItem icon={<Mail className="w-4 h-4" />} label="Personal Email" value={privateDetails?.personal_email || "Not Provided"} />
              <DetailItem icon={<Phone className="w-4 h-4" />} label="Contact Number" value={privateDetails?.phone || profile.phone || "Not Provided"} />
              <DetailItem icon={<User className="w-4 h-4" />} label="Account Status" value={profile.status?.toUpperCase() || "ACTIVE"} />
            </div>

            {profile.bio && (
              <div className="pt-2 border-t border-[var(--text-muted)]/10 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Bio / About</p>
                <p className="text-xs leading-relaxed opacity-90">{profile.bio}</p>
              </div>
            )}
          </div>

          <div className="neo-flat rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--text-muted)]/10 pb-4">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Faculty Advisor Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
              <DetailItem icon={<UserCircle className="w-4 h-4" />} label="Faculty Advisor Name" value={privateDetails?.fa_name || "Not Assigned"} />
              <DetailItem icon={<Phone className="w-4 h-4" />} label="Faculty Advisor Phone" value={privateDetails?.fa_phone || "N/A"} />
              <DetailItem icon={<Mail className="w-4 h-4" />} label="Faculty Advisor Email" value={privateDetails?.fa_email || "N/A"} className="col-span-2" />
            </div>
          </div>

        </div>

        {/* Right Column: Chain of Command / Hierarchy */}
        <div className="lg:col-span-4 neo-flat rounded-[2rem] p-6 space-y-4">
          <div className="px-2 border-b border-[var(--text-muted)]/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Core Hierarchy</h3>
            <p className="text-[10px] opacity-60 mt-0.5">Reporting leadership & guides</p>
          </div>

          <div className="space-y-3 pt-1">
            {leads.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-6">No reporting leads listed.</p>
            ) : (
              leads.map((lead, idx) => (
                <div key={idx} className="neo-pressed rounded-2xl p-4 flex items-center gap-3.5 border border-[var(--text-muted)]/5">
                  <div className="w-11 h-11 rounded-xl neo-flat overflow-hidden flex items-center justify-center shrink-0">
                    {lead.avatar_path ? (
                      <img src={lead.avatar_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 opacity-40 text-emerald-500" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-extrabold truncate">{lead.full_name}</p>
                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 truncate">
                      {lead.role?.replace("_", " ")} {lead.domain ? `• ${lead.domain}` : ''}
                    </p>
                    <p className="text-[9px] opacity-40 font-mono truncate mt-0.5">{lead.srm_email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProfile} className="w-full max-w-lg neo-flat rounded-3xl p-6 space-y-5 animate-in zoom-in-95 bg-[var(--bg-surface)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[var(--text-muted)]/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Edit Profile Information</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="p-1.5 neo-btn rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[10px] opacity-60">Update your photo, contact info, password, or add missing social links below.</p>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Profile Photo</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 p-3 neo-pressed rounded-2xl cursor-pointer hover:ring-1 ring-emerald-500/50 transition-all group"
              >
                <div className="w-14 h-14 rounded-full neo-flat overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-8 h-8 opacity-40" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-500">Change Photo</p>
                  <p className="text-[9px] opacity-50">PNG, JPG up to 5MB</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg" className="hidden" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Phone Number *</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Personal Email *</label>
              <input
                type="email"
                required
                value={editPersonalEmail}
                onChange={(e) => setEditPersonalEmail(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Update Login Password (Optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium"
              />
            </div>

            {/* Social Links Section (Editable ONLY if empty) */}
            <div className="space-y-3 pt-2 border-t border-[var(--text-muted)]/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Social Links (Can only be added once)</p>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">LinkedIn URL</label>
                {linkedinLink ? (
                  <input type="text" disabled value={linkedinLink} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-black/5 dark:bg-white/5 opacity-60 cursor-not-allowed font-medium" />
                ) : (
                  <input type="url" placeholder="https://linkedin.com/in/username" value={addLinkedin} onChange={(e) => setAddLinkedin(e.target.value)} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium" />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">GitHub URL</label>
                {githubLink ? (
                  <input type="text" disabled value={githubLink} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-black/5 dark:bg-white/5 opacity-60 cursor-not-allowed font-medium" />
                ) : (
                  <input type="url" placeholder="https://github.com/username" value={addGithub} onChange={(e) => setAddGithub(e.target.value)} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium" />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Instagram URL</label>
                {instagramLink ? (
                  <input type="text" disabled value={instagramLink} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-black/5 dark:bg-white/5 opacity-60 cursor-not-allowed font-medium" />
                ) : (
                  <input type="url" placeholder="https://instagram.com/username" value={addInstagram} onChange={(e) => setAddInstagram(e.target.value)} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium" />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Portfolio Website</label>
                {portfolioLink ? (
                  <input type="text" disabled value={portfolioLink} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-black/5 dark:bg-white/5 opacity-60 cursor-not-allowed font-medium" />
                ) : (
                  <input type="url" placeholder="https://yourportfolio.com" value={addPortfolio} onChange={(e) => setAddPortfolio(e.target.value)} className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-medium" />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-1/2 py-3.5 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-1/2 py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Updates</>}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

function DetailItem({ icon, label, value, className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="w-11 h-11 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500 shadow-inner">
        {icon}
      </div>
      <div className="overflow-hidden">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">{label}</p>
        <p className="text-xs font-bold truncate opacity-95">{value}</p>
      </div>
    </div>
  );
}