import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  UserCircle
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, domain, avatar_path")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "member";
  const canSeeComplaints = ["president", "secretary", "joint_secretary"].includes(role);

  return (
    <div className="min-h-screen transition-colors duration-300 flex">
      {/* Sidebar */}
      <aside className="w-72 hidden md:flex flex-col justify-between p-6 m-4 mr-0 rounded-3xl neo-flat relative z-10">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl neo-pressed flex items-center justify-center text-gfg-green font-black text-xl">
              G
            </div>
            <div>
              <h2 className="font-bold tracking-wide text-lg text-gfg-green">GFG SRMIST</h2>
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">
                {role.replace("_", " ")}
              </p>
            </div>
          </div>

          <nav className="space-y-3">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" />
            <NavLink href="/dashboard/profile" icon={<UserCircle size={18} />} label="My Profile" />
            <NavLink href="/dashboard/leaderboard" icon={<Trophy size={18} />} label="Leaderboard" />
            <NavLink href="/dashboard/tasks" icon={<CheckSquare size={18} />} label="Tasks & Points" />
            <NavLink href="/dashboard/mom" icon={<FileText size={18} />} label="Attendance & MoM" />
            <NavLink href="/dashboard/schedule" icon={<Clock size={18} />} label="Free Slots" />
            <NavLink href="/dashboard/confessions" icon={<MessageSquareQuote size={18} />} label="Confessions" />
            {canSeeComplaints && (
              <NavLink href="/dashboard/complaints" icon={<AlertOctagon size={18} />} label="Complaints" />
            )}
            <NavLink href="/dashboard/memories" icon={<ImageIcon size={18} />} label="Memories" />
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full neo-pressed overflow-hidden flex items-center justify-center p-0.5">
                {profile?.avatar_path ? (
                  <img src={profile.avatar_path} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <UserCircle className="w-6 h-6 opacity-30" />
                )}
              </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{profile?.full_name}</p>
              <p className="text-[10px] uppercase font-semibold opacity-70 truncate">{profile?.domain || "Core"}</p>
            </div>
          </div>
          
          <form action="/auth/signout" method="post">
            <button 
              type="submit" 
              className="w-full py-2.5 px-4 rounded-xl neo-btn font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-24 px-8 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold opacity-80">
            Welcome, {profile?.full_name?.split(" ")[0] || "Geek"} 👋
          </h1>
          <ThemeToggle />
        </header>

        <div className="px-8 pb-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl neo-btn font-medium text-sm transition-all hover:text-gfg-green active:neo-pressed"
    >
      {icon}
      {label}
    </Link>
  );
}