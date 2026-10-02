"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCircle, Mail, Phone, MapPin, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [privateDetails, setPrivateDetails] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchFullProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch User Public & Private Data
      const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: privData } = await supabase.from("profile_private").select("*").eq("profile_id", user.id).single();
      
      setProfile(pData);
      setPrivateDetails(privData);

      // Fetch Leads (President, Secretary, or the user's specific Domain Director)
      const { data: leadsData } = await supabase
        .from("profiles")
        .select("full_name, role, srm_email, avatar_path")
        .in("role", ["president", "secretary", "domain_director"])
        .eq("status", "approved");

      // Filter domain directors to only show the user's domain director
      const relevantLeads = leadsData?.filter(l => 
        l.role !== 'domain_director' || (l.role === 'domain_director' && l.domain === pData.domain)
      );

      setLeads(relevantLeads || []);
    }
    fetchFullProfile();
  }, [supabase]);

  if (!profile) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      
      {/* Top Identity Card */}
      <div className="neo-flat rounded-[2.5rem] overflow-hidden relative">
        <div className="h-32 w-full bg-gradient-to-r from-emerald-600 to-teal-900 opacity-90" />
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12 relative z-10">
            <div className="w-28 h-28 rounded-[2rem] neo-flat p-1 shrink-0 bg-[var(--bg-base)]">
              {profile.avatar_path ? (
                <img src={profile.avatar_path} alt="Avatar" className="w-full h-full object-cover rounded-[1.75rem]" />
              ) : (
                <div className="w-full h-full rounded-[1.75rem] neo-pressed flex items-center justify-center">
                  <UserCircle className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>
            
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-extrabold">{profile.full_name}</h1>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                {profile.role.replace("_", " ")} • {profile.domain}
              </p>
              <p className="text-xs opacity-70 mt-2 max-w-xl">"{profile.tagline}"</p>
            </div>
            
            <div className="pb-2 flex gap-3">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" className="p-3 neo-btn rounded-xl hover:text-blue-500 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" className="p-3 neo-btn rounded-xl hover:text-gray-500 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Details Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="neo-flat rounded-[2rem] p-8">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 mb-6">Personal & Academic Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem icon={<MapPin />} label="Registration Number" value={profile.reg_number} />
              <DetailItem icon={<ShieldCheck />} label="Department & Batch" value={`${profile.department} (Batch ${profile.batch})`} />
              <DetailItem icon={<Mail />} label="SRM Email" value={profile.srm_email} />
              <DetailItem icon={<Mail />} label="Personal Email" value={privateDetails?.personal_email || "N/A"} />
              <DetailItem icon={<Phone />} label="Phone Number" value={privateDetails?.phone || "N/A"} />
            </div>
          </div>

          <div className="neo-flat rounded-[2rem] p-8">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 mb-6">Faculty Advisor Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem icon={<UserCircle />} label="FA Name" value={privateDetails?.fa_name || "N/A"} />
              <DetailItem icon={<Phone />} label="FA Phone" value={privateDetails?.fa_phone || "N/A"} />
              <DetailItem icon={<Mail />} label="FA Email" value={privateDetails?.fa_email || "N/A"} className="col-span-2" />
            </div>
          </div>
        </div>

        {/* Chain of Command / Hierarchy Column */}
        <div className="lg:col-span-4 neo-flat rounded-[2rem] p-6">
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">Core Hierarchy</h3>
            <p className="text-[10px] opacity-60 mt-1">Your reporting leads</p>
          </div>

          <div className="space-y-4">
            {leads.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-4">No leads assigned yet.</p>
            ) : (
              leads.map((lead, idx) => (
                <div key={idx} className="neo-pressed rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl neo-flat overflow-hidden flex items-center justify-center shrink-0 bg-[var(--bg-surface)]">
                    {lead.avatar_path ? (
                      <img src={lead.avatar_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 opacity-40" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{lead.full_name}</p>
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 truncate">
                      {lead.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DetailItem({ icon, label, value, className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="w-10 h-10 rounded-xl neo-pressed flex items-center justify-center shrink-0 opacity-70">
        <div className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      </div>
      <div className="overflow-hidden">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">{label}</p>
        <p className="text-xs font-bold truncate">{value}</p>
      </div>
    </div>
  );
}