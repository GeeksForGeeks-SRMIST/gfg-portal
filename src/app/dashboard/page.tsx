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
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  const [profile, setProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  
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

  const supabase = createClient();

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      const hours = now.getHours();
      
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

      if (hours < 12) setGreeting("Good morning");
      else if (hours < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");
    };

    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 1000);

    fetchDashboardData();

    const channel = supabase
      .channel("dashboard_realtime_overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "points_ledger" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, () => fetchDashboardData())
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
      .limit(2);
    setNotices(noticesData || []);

    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(3);
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

    setTopLeaderboard(rankedList.slice(0, 5));
    setMyPoints(pointsMap[user.id] || 0);

    const { data: confessionData } = await supabase.from("confessions").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(1).single();
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

  if (!profile) {
    return <div className="h-40 w-full neo-flat rounded-2xl animate-pulse" />;
  }

  const role = profile.role || "member";
  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(role);

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
    <div className="space-y-4 md:space-y-6 pb-6">
      
      {/* Greeting Banner */}
      <div className="neo-flat rounded-[2rem] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-0.5 relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
            {greeting},
          </p>
          <h2 className="text-lg md:text-2xl font-black tracking-tight">
            <span className="text-gradient">{profile.full_name}</span>
          </h2>
          <p className="text-[10px] md:text-[11px] font-bold opacity-60 uppercase tracking-wider">
            {formatDesignation(profile.role, profile.domain)} • GFG SRMIST
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
          <a 
            href="https://chat.whatsapp.com/JuIQo4lWYsCJSqcBtXTV98" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full md:w-auto px-4 py-2.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border border-emerald-500/30"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Community Chat</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          </a>
        </div>
      </div>

      {/* Top Square Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <div className="neo-flat rounded-2xl p-3.5 flex flex-col justify-between h-24">
          <div className="flex items-center justify-between text-emerald-500">
            <Clock className="w-4 h-4" />
            <span className="text-[9px] font-mono font-black text-emerald-500/90 uppercase tracking-wider">
              {currentDate || "02 OCT 2026"}
            </span>
          </div>
          <div>
            <p className="text-lg md:text-2xl font-mono font-extrabold text-emerald-500 leading-none">{currentTime || "18:02:29"}</p>
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

          <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckSquare className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest">My Active Tasks & Deliverables</h3>
              </div>
              <Link href="/dashboard/tasks" className="text-[10px] font-bold opacity-60 hover:text-emerald-500 flex items-center gap-1 transition-colors">
                All Tasks <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
              {myTasks.length === 0 ? (
                <div className="neo-pressed rounded-2xl p-6 text-center opacity-50 flex flex-col items-center justify-center">
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
          <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Trophy className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest">Top Performers</h3>
              </div>
              <Link href="/dashboard/leaderboard" className="text-[10px] font-bold opacity-60 hover:text-emerald-500">
                Board
              </Link>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-around">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Bell className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Notice Board</h3>
            </div>
            <Link href="/dashboard/notices" className="text-[10px] font-bold opacity-60 hover:text-emerald-500">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
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

        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 flex flex-col justify-between relative">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest">Upcoming Events</h3>
            </div>
            {isLead && (
              <button
                onClick={() => setShowAddEventModal(true)}
                className="p-1.5 neo-btn rounded-xl text-[9px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1 hover:scale-105 transition-all"
              >
                <Plus className="w-3 h-3" /> Event
              </button>
            )}
          </div>

          <div className="space-y-2.5 flex-1">
            {upcomingEvents.length === 0 ? (
              <div className="neo-pressed rounded-xl p-4 text-center opacity-50 flex items-center justify-center h-full">
                <p className="text-xs font-bold">No upcoming events scheduled</p>
              </div>
            ) : (
              upcomingEvents.map((evt) => (
                <div key={evt.id} className="neo-pressed rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold">{evt.title}</p>
                  <p className="text-[9px] font-semibold opacity-60 text-emerald-500">
                    {new Date(evt.event_date).toLocaleDateString()} • {evt.location}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="neo-flat rounded-[2rem] p-5 md:p-6 space-y-3 flex flex-col justify-between bg-gradient-to-br from-transparent to-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 px-1">
            <MessageSquareQuote className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest">Latest Confession</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center">
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

          <Link href="/dashboard/confessions" className="block text-center text-[10px] font-extrabold uppercase tracking-widest opacity-60 hover:text-emerald-500 transition-colors pt-1">
            Submit Anonymous Post
          </Link>
        </div>

      </div>

      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleQuickAddEvent} className="w-full max-w-md neo-flat rounded-3xl p-6 space-y-4 animate-in zoom-in-95 bg-[var(--bg-base)]">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">Schedule Chapter Event</h3>
            
            <input
              type="text"
              required
              placeholder="Event Title (e.g. JAVA-VERSE 2026)"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <input
              type="datetime-local"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <input
              type="text"
              placeholder="Venue (e.g. TP Ganesan Auditorium / Tech Park)"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingEvent}
                className="w-1/2 py-2.5 neo-btn-green rounded-xl text-xs font-bold flex justify-center items-center gap-2"
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