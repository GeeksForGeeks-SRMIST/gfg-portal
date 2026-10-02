"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Trophy, 
  CheckSquare, 
  FileText, 
  MessageSquareQuote, 
  AlertOctagon, 
  Image as ImageIcon, 
  Clock, 
  LogOut,
  UserCircle,
  Shield
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, domain, avatar_path")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
    loadUser();
  }, [router, supabase]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const role = profile.role || "member";
  const isExecutiveLead = ["president", "secretary", "joint_secretary"].includes(role);

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden">
      {/* Sidebar - Compact Neumorphic Panel */}
      <aside className="w-64 hidden md:flex flex-col justify-between p-5 m-3 mr-0 rounded-[2rem] neo-flat relative z-10">
        <div className="space-y-6">
          {/* Official Brand Identity */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-xl neo-pressed flex items-center justify-center p-2 shrink-0">
              <Image src="/gfg.png" alt="GFG Logo" width={28} height={28} className="object-contain drop-shadow-sm" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-extrabold tracking-tight text-sm text-gradient leading-tight truncate">
                GeeksforGeeks
              </h2>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
                SRMIST • {role.replace("_", " ")}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={16} strokeWidth={2.5} />} label="Overview" currentPath={pathname} />
            <NavLink href="/dashboard/profile" icon={<UserCircle size={16} strokeWidth={2.5} />} label="My Profile" currentPath={pathname} />
            <NavLink href="/dashboard/leaderboard" icon={<Trophy size={16} strokeWidth={2.5} />} label="Leaderboard" currentPath={pathname} />
            <NavLink href="/dashboard/tasks" icon={<CheckSquare size={16} strokeWidth={2.5} />} label="Tasks & Points" currentPath={pathname} />
            <NavLink href="/dashboard/mom" icon={<FileText size={16} strokeWidth={2.5} />} label="Attendance & MoM" currentPath={pathname} />
            <NavLink href="/dashboard/schedule" icon={<Clock size={16} strokeWidth={2.5} />} label="Free Slots" currentPath={pathname} />
            
            <div className="pt-3 pb-1 px-3 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              Community & Governance
            </div>
            
            <NavLink href="/dashboard/confessions" icon={<MessageSquareQuote size={16} strokeWidth={2.5} />} label="Confessions" currentPath={pathname} />
            <NavLink href="/dashboard/memories" icon={<ImageIcon size={16} strokeWidth={2.5} />} label="Memories" currentPath={pathname} />
            
            {isExecutiveLead && (
              <>
                <NavLink href="/dashboard/complaints" icon={<AlertOctagon size={16} strokeWidth={2.5} />} label="Complaints" currentPath={pathname} />
                <NavLink href="/dashboard/admin" icon={<Shield size={16} strokeWidth={2.5} />} label="Manage Team" currentPath={pathname} />
              </>
            )}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-[var(--text-muted)]/15 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full neo-pressed overflow-hidden flex items-center justify-center p-0.5 shrink-0">
              {profile.avatar_path ? (
                <img src={profile.avatar_path} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <UserCircle className="w-5 h-5 opacity-40" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{profile.full_name}</p>
              <p className="text-[9px] uppercase font-semibold text-[var(--text-muted)] truncate">{profile.domain || "Core"}</p>
            </div>
          </div>
          
          <form action="/auth/signout" method="post">
            <button 
              type="submit" 
              className="w-full py-2.5 px-3 rounded-xl neo-btn font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={14} strokeWidth={2.5} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <header className="h-20 px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md bg-[var(--bg-base)]/80 border-b border-[var(--text-muted)]/10">
          <h1 className="text-base md:text-lg font-extrabold tracking-tight uppercase text-[var(--text-main)] opacity-90">
            GFG SRMIST PORTAL <span className="text-emerald-500 mx-2">|</span> CORE TEAM
          </h1>
          <ThemeToggle />
        </header>

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  const isActive = currentPath === href;
  
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
        isActive 
          ? "neo-pressed text-emerald-600 dark:text-emerald-400" 
          : "neo-btn text-[var(--text-muted)] hover:text-emerald-500"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}