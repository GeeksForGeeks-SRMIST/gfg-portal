"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  CheckSquare, 
  MessageSquareQuote, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  Trophy, 
  MessageCircle, 
  CalendarDays, 
  Award,
  AlertOctagon,
  ArrowUpRight,
  Users,
  CheckCircle2,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Stars,
  Layers,
  Crown
} from "lucide-react";
import Link from "next/link";

interface TimePhase {
  greeting: string;
  badge: string;
  icon: React.ReactNode;
  gradientStyle: React.CSSProperties;
  nameColorClass: string;
  badgeContainerStyle: string;
  buttonStyle: string;
}

export default function DashboardOverview() {
  const [profile, setProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [timePhase, setTimePhase] = useState<TimePhase>({
    greeting: "Good Morning",
    badge: "Morning Zenith",
    icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
    gradientStyle: {
      background: "linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(16, 185, 129, 0.18) 50%, rgba(20, 184, 166, 0.12) 100%)"
    },
    nameColorClass: "from-amber-500 via-emerald-500 to-teal-500",
    badgeContainerStyle: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    buttonStyle: "bg-emerald-600 hover:bg-emerald-700 text-white"
  });

  // Real-time Data States
  const [notices, setNotices] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [topLeaderboard, setTopLeaderboard] = useState<any[]>([]);
  const [latestConfession, setLatestConfession] = useState<any | null>(null);
  const [myPoints, setMyPoints] = useState(0);

  // Admin Metrics
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [totalApprovedMembers, setTotalApprovedMembers] = useState(0);

  // Quick Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Custom Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; eventId: string | null; title: string }>({
    isOpen: false,
    eventId: null,
    title: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const updateClockAndPhase = () => {
      const now = new Date();
      const hours = now.getHours();
      
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

      // Dynamic Time-Aware Color Harmonization Engine
      if (hours >= 5 && hours < 7) {
        setTimePhase({
          greeting: "Good Dawn",
          badge: "Dawn Glow",
          icon: <Sunrise className="w-3.5 h-3.5 text-rose-500" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(244, 63, 94, 0.22) 0%, rgba(245, 158, 11, 0.18) 50%, rgba(249, 115, 22, 0.12) 100%)"
          },
          nameColorClass: "from-rose-500 via-amber-500 to-orange-500",
          badgeContainerStyle: "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
          buttonStyle: "bg-rose-600 hover:bg-rose-700 text-white"
        });
      } else if (hours >= 7 && hours < 12) {
        setTimePhase({
          greeting: "Good Morning",
          badge: "Morning Zenith",
          icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(16, 185, 129, 0.18) 50%, rgba(20, 184, 166, 0.12) 100%)"
          },
          nameColorClass: "from-emerald-600 via-teal-500 to-amber-500 dark:from-emerald-400 dark:via-teal-300 dark:to-amber-300",
          badgeContainerStyle: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
          buttonStyle: "bg-emerald-600 hover:bg-emerald-700 text-white"
        });
      } else if (hours >= 12 && hours < 17) {
        setTimePhase({
          greeting: "Good Afternoon",
          badge: "Solar Peak",
          icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.22) 0%, rgba(245, 158, 11, 0.18) 50%, rgba(16, 185, 129, 0.12) 100%)"
          },
          nameColorClass: "from-sky-500 via-amber-500 to-emerald-500",
          badgeContainerStyle: "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
          buttonStyle: "bg-sky-600 hover:bg-sky-700 text-white"
        });
      } else if (hours >= 17 && hours < 19) {
        setTimePhase({
          greeting: "Good Evening",
          badge: "Evening Twilight",
          icon: <Sunset className="w-3.5 h-3.5 text-orange-500" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(244, 63, 94, 0.20) 50%, rgba(168, 85, 247, 0.15) 100%)"
          },
          nameColorClass: "from-orange-500 via-rose-500 to-purple-500",
          badgeContainerStyle: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
          buttonStyle: "bg-orange-600 hover:bg-orange-700 text-white"
        });
      } else if (hours >= 19 && hours < 21) {
        setTimePhase({
          greeting: "Good Twilight",
          badge: "Dusk Twilight",
          icon: <Stars className="w-3.5 h-3.5 text-indigo-400" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.20) 50%, rgba(244, 63, 94, 0.15) 100%)"
          },
          nameColorClass: "from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300",
          badgeContainerStyle: "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
          buttonStyle: "bg-indigo-600 hover:bg-indigo-700 text-white"
        });
      } else {
        setTimePhase({
          greeting: "Good Night",
          badge: "Night Starlight",
          icon: <Moon className="w-3.5 h-3.5 text-purple-400" />,
          gradientStyle: {
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.22) 50%, rgba(236, 72, 153, 0.15) 100%)"
          },
          nameColorClass: "from-purple-500 via-indigo-400 to-pink-500 dark:from-purple-300 dark:via-indigo-200 dark:to-pink-300",
          badgeContainerStyle: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300",
          buttonStyle: "bg-purple-600 hover:bg-purple-700 text-white"
        });
      }
    };

    updateClockAndPhase();
    const timer = setInterval(updateClockAndPhase, 1000);

    fetchDashboardData();

    const channel = supabase
      .channel("dashboard_realtime_overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "points_ledger" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchDashboardData())
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(profileData);

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .eq("status", "pending")
      .order("deadline", { ascending: true });
    setMyTasks(tasksData || []);

    const { data: noticesData } = await supabase
      .from("notices")
      .select("*, author:profiles(full_name, role)")
      .order("created_at", { ascending: false })
      .limit(10);
    setNotices(noticesData || []);

    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });
    setUpcomingEvents(eventsData || []);

    const { data: profilesWithPoints } = await supabase
      .from("profiles")
      .select("id, full_name, domain, role, avatar_path")
      .eq("status", "approved");

    const { data: ledger } = await supabase.from("points_ledger").select("profile_id, points_awarded");

    const pointsMap: Record<string, number> = {};
    ledger?.forEach((item) => {
      pointsMap[item.profile_id] = (pointsMap[item.profile_id] || 0) + item.points_awarded;
    });

    const rankedList = (profilesWithPoints || []).map((p) => ({
      ...p,
      points: pointsMap[p.id] || 0
    })).sort((a, b) => b.points - a.points);

    setTopLeaderboard(rankedList);
    setMyPoints(pointsMap[user.id] || 0);

    const { data: confessionData } = await supabase
      .from("confessions")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestConfession(confessionData);

    const { count: pendingCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending");
    setPendingUsersCount(pendingCount || 0);

    const { count: compCount } = await supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "Unsolved");
    setComplaintsCount(compCount || 0);

    const { count: approvedCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved");
    setTotalApprovedMembers(approvedCount || 58);
  }

  async function handleQuickAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingEvent(true);
    await supabase.from("events").insert({
      title: eventTitle,
      event_date: eventDate,
      location: eventLocation || "TP Ganesan Auditorium / SRMIST"
    });
    setEventTitle("");
    setEventDate("");
    setEventLocation("");
    setIsCreatingEvent(false);
    setShowAddEventModal(false);
    fetchDashboardData();
  }

  async function confirmAndDeleteEvent() {
    if (!deleteConfirmModal.eventId) return;
    setIsDeleting(true);

    const targetId = deleteConfirmModal.eventId;
    setUpcomingEvents(prev => prev.filter(evt => evt.id !== targetId));

    const { error } = await supabase.from("events").delete().eq("id", targetId);
    if (error) {
      alert("Error deleting event: " + error.message);
      fetchDashboardData();
    }

    setIsDeleting(false);
    setDeleteConfirmModal({ isOpen: false, eventId: null, title: "" });
  }

  if (!profile) {
    return <div className="h-36 w-full neo-flat rounded-2xl animate-pulse" />;
  }

  const role = profile.role || "member";
  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(role);

  const formatRoleTitle = (rawRole: string) => {
    const roleMap: Record<string, string> = {
      president: "President",
      secretary: "Secretary",
      joint_secretary: "Joint Secretary",
      domain_director: "Domain Director",
      associate_lead: "Associate Lead",
      member: "Core Member"
    };
    return roleMap[rawRole] || rawRole.replace("_", " ").toUpperCase();
  };

  const domainDisplay = (profile.domain || "Executive").toUpperCase();

  return (
    <div className="space-y-4 md:space-y-5 pb-6">
      
      {/* Dynamic Theme-Adapted Hero Banner */}
      <div 
        style={timePhase.gradientStyle}
        className="neo-flat rounded-[2rem] p-5 md:p-6 relative overflow-hidden border border-white/10 shadow-lg transition-all duration-700"
      >
        {/* Top Time Phase Badge */}
        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 dark:bg-black/30 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] shadow-xs">
            {timePhase.icon}
            <span>{timePhase.badge}</span>
          </div>
        </div>

        {/* Greeting Body */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {timePhase.greeting},
            </p>
            
            {/* Bold Name Typography */}
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-[900] tracking-tight bg-gradient-to-r ${timePhase.nameColorClass} bg-clip-text text-transparent drop-shadow-xs`}>
              {profile.full_name}
            </h1>

            {/* Badges: Role & Domain */}
            <div className="flex flex-wrap items-center gap-2 pt-2.5">
              {/* Badge 1: Role */}
              <div className={`px-3 py-1 rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-xs ${timePhase.badgeContainerStyle}`}>
                <Crown className="w-3 h-3 shrink-0" />
                <span>{formatRoleTitle(profile.role)}</span>
              </div>

              {/* Badge 2: Domain */}
              <div className="px-3 py-1 rounded-xl bg-white/40 dark:bg-black/30 backdrop-blur-md text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1.5 border border-white/20">
                <Layers className="w-3 h-3 text-teal-400 shrink-0" />
                <span>{domainDisplay} Domain</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 pt-1 md:pt-0">
            <a 
              href="https://chat.whatsapp.com/JuIQo4lWYsCJSqcBtXTV98" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all ${timePhase.buttonStyle}`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Track WhatsApp Community</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-80 shrink-0" />
            </a>
          </div>
        </div>

      </div>

      {/* Top Square Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <div className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24">
          <div className="flex items-center justify-between text-emerald-500">
            <Clock className="w-4 h-4" />
            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-emerald-500">
              {currentDate || "04 OCT 2026"}
            </span>
          </div>
          <div>
            <p className="text-lg md:text-2xl font-mono font-extrabold text-emerald-500 leading-none">{currentTime || "03:00:00"}</p>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-wider mt-1">Station Time</p>
          </div>
        </div>

        <div className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24">
          <div className="flex items-center justify-between text-emerald-500">
            <Award className="w-4 h-4" />
            <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Ledger</span>
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-gradient leading-none">{myPoints}</p>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-wider mt-1">Total Points</p>
          </div>
        </div>

        <div className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24">
          <div className="flex items-center justify-between text-amber-500">
            <CheckSquare className="w-4 h-4" />
            <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Pending</span>
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black leading-none">{myTasks.length}</p>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-wider mt-1">Active Tasks</p>
          </div>
        </div>

        <div className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24">
          <div className="flex items-center justify-between text-emerald-500">
            <Users className="w-4 h-4" />
            <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Enrolled</span>
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black leading-none">{totalApprovedMembers || 58}</p>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-wider mt-1">Core Members</p>
          </div>
        </div>

      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
        
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Link href="/dashboard/complaints" className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24 hover:scale-[1.01] transition-transform border border-rose-500/20">
              <div className="flex items-center justify-between text-rose-500">
                <AlertOctagon className="w-4 h-4" />
                <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-60">Portal</span>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-black text-rose-500 leading-none">{complaintsCount}</p>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider mt-1">Complaints</p>
              </div>
            </Link>

            <Link href="/dashboard/admin" className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24 hover:scale-[1.01] transition-transform border border-amber-500/30">
              <div className="flex items-center justify-between text-amber-500">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
                <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-60">Admin</span>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-black text-amber-500 leading-none">{pendingUsersCount}</p>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider mt-1">Pending Signups</p>
              </div>
            </Link>
          </div>

          <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-4 h-[320px] flex flex-col justify-between">
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckSquare className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest">My Active Tasks</h3>
              </div>
              <Link href="/dashboard/tasks" className="text-[10px] font-bold opacity-60 hover:text-emerald-500 flex items-center gap-1 transition-colors">
                All Tasks <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {myTasks.length === 0 ? (
                <div className="neo-pressed rounded-2xl p-6 text-center opacity-50 flex flex-col items-center justify-center h-full">
                  <CheckCircle2 className="w-6 h-6 mb-2 text-emerald-500" />
                  <p className="text-xs font-bold">No pending tasks assigned right now.</p>
                </div>
              ) : (
                myTasks.map((task) => (
                  <div key={task.id} className="neo-pressed rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-white/5">
                    <div className="space-y-0.5 overflow-hidden">
                      <h4 className="text-xs font-bold truncate">{task.title}</h4>
                      <p className="text-[10px] opacity-60 line-clamp-1">{task.description}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}
                      </span>
                      <p className="text-[10px] font-bold text-emerald-500">+{task.points} PTS</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-4 h-[432px] flex flex-col justify-between">
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Trophy className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest">Top Performers</h3>
              </div>
              <Link href="/dashboard/leaderboard" className="text-[10px] font-bold opacity-60 hover:text-emerald-500">
                Board
              </Link>
            </div>

            <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {topLeaderboard.length === 0 ? (
                <p className="text-xs opacity-50 text-center p-4">No rankings generated.</p>
              ) : (
                topLeaderboard.map((member, rank) => (
                  <div key={member.id} className="neo-pressed rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                        rank === 0 ? "bg-amber-500 text-black" :
                        rank === 1 ? "bg-slate-300 text-black" :
                        rank === 2 ? "bg-amber-700 text-white" : "neo-btn opacity-60"
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate">{member.full_name}</p>
                        <p className="text-[9px] opacity-50 uppercase tracking-widest truncate">{member.domain}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-emerald-500 shrink-0">
                      {member.points} PTS
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Horizontal Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
        
        {/* Notice Board */}
        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 h-[280px] flex flex-col justify-between">
          <div className="flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Bell className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Notice Board</h3>
            </div>
            <Link href="/dashboard/notices" className="text-[10px] font-bold opacity-60 hover:text-emerald-500">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {notices.length === 0 ? (
              <p className="text-xs opacity-50 p-4 text-center">No announcements.</p>
            ) : (
              notices.map((n) => (
                <Link key={n.id} href="/dashboard/notices" className="block neo-pressed rounded-xl p-3 hover:border-emerald-500/30 transition-all border border-transparent space-y-1">
                  <p className="text-xs font-bold line-clamp-1">{n.title}</p>
                  <p className="text-[10px] opacity-70 line-clamp-2">{n.content}</p>
                  <div className="flex items-center justify-between pt-1 text-[8px] font-extrabold uppercase tracking-wider text-emerald-500">
                    <span>{n.author?.full_name || "Executive Lead"}</span>
                    <span className="opacity-50 text-[var(--text-main)]">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 h-[280px] flex flex-col justify-between relative">
          <div className="flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Upcoming Events</h3>
            </div>
            {isLead && (
              <button
                onClick={() => setShowAddEventModal(true)}
                className="p-1.5 neo-btn rounded-xl text-[9px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Event
              </button>
            )}
          </div>

          <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {upcomingEvents.length === 0 ? (
              <div className="neo-pressed rounded-xl p-4 text-center opacity-50 flex items-center justify-center h-full">
                <p className="text-xs font-bold">No upcoming events scheduled</p>
              </div>
            ) : (
              upcomingEvents.map((evt) => (
                <div key={evt.id} className="neo-pressed rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{evt.title}</p>
                    <p className="text-[9px] font-semibold opacity-60 text-emerald-500 truncate">
                      {new Date(evt.event_date).toLocaleDateString()} • {evt.location}
                    </p>
                  </div>
                  {isLead && (
                    <button
                      onClick={() => setDeleteConfirmModal({ isOpen: true, eventId: evt.id, title: evt.title })}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Confession */}
        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 h-[280px] flex flex-col justify-between bg-gradient-to-br from-transparent to-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 px-1 shrink-0">
            <MessageSquareQuote className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest">Latest Confession</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-y-auto custom-scrollbar pr-1">
            {latestConfession ? (
              <div className="neo-pressed rounded-2xl p-4 italic text-xs opacity-80 leading-relaxed border border-white/5">
                "{latestConfession.message}"
              </div>
            ) : (
              <div className="neo-pressed rounded-2xl p-4 text-center text-xs opacity-50">
                No approved confessions yet.
              </div>
            )}
          </div>

          <Link href="/dashboard/confessions" className="block text-center text-[10px] font-extrabold uppercase tracking-widest opacity-60 hover:text-emerald-500 transition-colors pt-1 shrink-0">
            Submit Anonymous Post
          </Link>
        </div>

      </div>

      {/* Confirmation Dialog Modal for Deletion */}
      {deleteConfirmModal.isOpen && (
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
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Event to Delete:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteConfirmModal.title}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, eventId: null, title: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteEvent}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleQuickAddEvent} className="w-full max-w-md neo-flat rounded-3xl p-6 space-y-4 animate-in zoom-in-95 bg-[var(--bg-base)] shadow-2xl border border-white/10">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">Schedule Chapter Event</h3>
            
            <input
              type="text"
              required
              placeholder="Event Title (e.g. JAVA-VERSE 2026)"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />

            <input
              type="datetime-local"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />

            <input
              type="text"
              placeholder="Venue (e.g. TP Ganesan Auditorium / Tech Park)"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingEvent}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 cursor-pointer shadow-md"
              >
                {isCreatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Event"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}