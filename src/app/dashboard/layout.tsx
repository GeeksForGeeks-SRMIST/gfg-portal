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
  CalendarCheck,
  MessageSquareQuote, 
  AlertOctagon, 
  Clock, 
  LogOut,
  User,
  Shield,
  Bell,
  Image as ImageIcon,
  Menu,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        .select("id, full_name, role, domain, avatar_path")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
    loadUser();
  }, [router, supabase]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const role = profile.role || "member";
  const isExecutiveLead = ["president", "secretary", "joint_secretary"].includes(role);
  const isDomainDirector = role === "domain_director";
  const isLeadOrDirector = isExecutiveLead || isDomainDirector;

  const formatDesignation = (rawRole: string, domain?: string) => {
    const roleMap: Record<string, string> = {
      president: "President",
      secretary: "Secretary",
      joint_secretary: "Joint Secretary",
      domain_director: `${domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : ""} Director`,
      associate_lead: `${domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : ""} Associate`,
      member: `${domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : "Core"} Member`
    };
    return roleMap[rawRole] || rawRole.replace("_", " ");
  };

  return (
    <div className="h-screen w-screen flex bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden font-sans">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="w-68 hidden md:flex flex-col justify-between p-4 m-3 mr-0 rounded-[2rem] neo-flat relative z-30 shrink-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="space-y-6">
          
          {/* Brand Identity Header */}
          <div className="flex items-center gap-3.5 px-2 pt-2">
            <div className="w-11 h-11 rounded-xl neo-pressed flex items-center justify-center p-2 shrink-0">
              <Image src="/gfg.png" alt="GFG Logo" width={30} height={30} className="object-contain drop-shadow-sm" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-black tracking-tight text-xs text-gradient leading-tight truncate">
                GeeksforGeeks
              </h2>
              <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider truncate">
                SRMIST • CORE TEAM
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={16} strokeWidth={2.5} />} label="Overview" currentPath={pathname} />
            <NavLink href="/dashboard/notices" icon={<Bell size={16} strokeWidth={2.5} />} label="Notice Board" currentPath={pathname} />
            <NavLink href="/dashboard/tasks" icon={<CheckSquare size={16} strokeWidth={2.5} />} label="Tasks & Points" currentPath={pathname} />
            <NavLink href="/dashboard/leaderboard" icon={<Trophy size={16} strokeWidth={2.5} />} label="Leaderboard" currentPath={pathname} />
            
            <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Operations
            </div>
            <NavLink href="/dashboard/available-members" icon={<Clock size={16} strokeWidth={2.5} />} label="Available Members" currentPath={pathname} />
            <NavLink href="/dashboard/attendance" icon={<CalendarCheck size={16} strokeWidth={2.5} />} label="Attendance" currentPath={pathname} />
            <NavLink href="/dashboard/mom" icon={<FileText size={16} strokeWidth={2.5} />} label="Minutes of Meeting" currentPath={pathname} />
            
            <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Community & Governance
            </div>
            <NavLink href="/dashboard/confessions" icon={<MessageSquareQuote size={16} strokeWidth={2.5} />} label="Confessions" currentPath={pathname} />
            <NavLink href="/dashboard/memories" icon={<ImageIcon size={16} strokeWidth={2.5} />} label="Memories" currentPath={pathname} />
            
            {isLeadOrDirector && (
              <NavLink href="/dashboard/complaints" icon={<AlertOctagon size={16} strokeWidth={2.5} />} label="Complaints" currentPath={pathname} />
            )}
            {isExecutiveLead && (
              <NavLink href="/dashboard/admin" icon={<Shield size={16} strokeWidth={2.5} />} label="Manage Team" currentPath={pathname} />
            )}

            <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Account
            </div>
            <NavLink href="/dashboard/profile" icon={<User size={16} strokeWidth={2.5} />} label="My Profile" currentPath={pathname} />
          </nav>
        </div>

        {/* User Identity Footer */}
        <div className="pt-4 border-t border-[var(--text-muted)]/15 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-9 h-9 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0 border border-emerald-500/30">
              {profile.avatar_path ? (
                <img src={profile.avatar_path} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 opacity-40" />
              )}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight">{profile.full_name}</p>
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatDesignation(profile.role, profile.domain)}
              </p>
            </div>
          </div>
          
          <form action="/auth/signout" method="post">
            <button 
              type="submit" 
              className="w-full py-2.5 px-3 rounded-xl neo-btn font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={12} strokeWidth={2.5} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-72 h-full bg-[var(--bg-base)] p-4 flex flex-col justify-between overflow-y-auto shadow-2xl border-r border-white/10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl neo-pressed flex items-center justify-center p-2 shrink-0">
                    <Image src="/gfg.png" alt="GFG Logo" width={26} height={26} className="object-contain" />
                  </div>
                  <div>
                    <h2 className="font-black tracking-tight text-xs text-gradient">GeeksforGeeks</h2>
                    <p className="text-[9px] font-extrabold opacity-60 uppercase">SRMIST • CORE</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl neo-btn text-rose-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="space-y-1.5 text-xs">
                <NavLink href="/dashboard" icon={<LayoutDashboard size={16} strokeWidth={2.5} />} label="Overview" currentPath={pathname} />
                <NavLink href="/dashboard/notices" icon={<Bell size={16} strokeWidth={2.5} />} label="Notice Board" currentPath={pathname} />
                <NavLink href="/dashboard/tasks" icon={<CheckSquare size={16} strokeWidth={2.5} />} label="Tasks & Points" currentPath={pathname} />
                <NavLink href="/dashboard/leaderboard" icon={<Trophy size={16} strokeWidth={2.5} />} label="Leaderboard" currentPath={pathname} />
                
                <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Operations
                </div>
                <NavLink href="/dashboard/available-members" icon={<Clock size={16} strokeWidth={2.5} />} label="Available Members" currentPath={pathname} />
                <NavLink href="/dashboard/attendance" icon={<CalendarCheck size={16} strokeWidth={2.5} />} label="Attendance" currentPath={pathname} />
                <NavLink href="/dashboard/mom" icon={<FileText size={16} strokeWidth={2.5} />} label="Minutes of Meeting" currentPath={pathname} />
                
                <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Community & Governance
                </div>
                <NavLink href="/dashboard/confessions" icon={<MessageSquareQuote size={16} strokeWidth={2.5} />} label="Confessions" currentPath={pathname} />
                <NavLink href="/dashboard/memories" icon={<ImageIcon size={16} strokeWidth={2.5} />} label="Memories" currentPath={pathname} />
                
                {isLeadOrDirector && (
                  <NavLink href="/dashboard/complaints" icon={<AlertOctagon size={16} strokeWidth={2.5} />} label="Complaints" currentPath={pathname} />
                )}
                {isExecutiveLead && (
                  <NavLink href="/dashboard/admin" icon={<Shield size={16} strokeWidth={2.5} />} label="Manage Team" currentPath={pathname} />
                )}

                <div className="pt-3 pb-1 px-2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Account
                </div>
                <NavLink href="/dashboard/profile" icon={<User size={16} strokeWidth={2.5} />} label="My Profile" currentPath={pathname} />
              </nav>
            </div>

            <div className="pt-4 border-t border-[var(--text-muted)]/15 space-y-2.5">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-9 h-9 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0 border border-emerald-500/30">
                  {profile.avatar_path ? (
                    <img src={profile.avatar_path} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 opacity-40" />
                  )}
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight">{profile.full_name}</p>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {formatDesignation(profile.role, profile.domain)}
                  </p>
                </div>
              </div>
              
              <form action="/auth/signout" method="post">
                <button 
                  type="submit" 
                  className="w-full py-2.5 px-3 rounded-xl neo-btn font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={12} strokeWidth={2.5} /> Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Sticky Header with Mobile Menu Button */}
        <header className="h-16 px-4 md:px-8 flex items-center justify-between shrink-0 bg-[var(--bg-base)] border-b border-[var(--text-muted)]/10 z-20">
          <div className="flex items-center gap-2.5 md:gap-3">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden p-2.5 rounded-xl neo-btn text-emerald-500 items-center justify-center shrink-0 cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>

            <span className="text-xs sm:text-sm md:text-lg font-black tracking-widest text-[var(--text-main)] uppercase truncate">
              GFG SRMIST
            </span>
            <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full neo-pressed text-emerald-600 dark:text-emerald-400 font-black tracking-widest uppercase border border-emerald-500/20">
              CORE TEAM
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Main Content Pane */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

function NavLink({ href, icon, label, currentPath }: { href: string; icon: React.ReactNode; label: string; currentPath: string }) {
  const isActive = currentPath === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
        isActive 
          ? "neo-pressed text-emerald-600 dark:text-emerald-400 font-extrabold" 
          : "neo-btn text-[var(--text-muted)] hover:text-emerald-500"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}