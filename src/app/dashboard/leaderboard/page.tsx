"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, 
  Crown, 
  User, 
  Search, 
  Loader2, 
  History, 
  X, 
  CheckCircle2, 
  Sparkles, 
  TrendingDown 
} from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");

  // Member Points History Modal State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberLedger, setMemberLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchLeaderboard();

    // Real-time synchronization
    const channel = supabase
      .channel("leaderboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "points_ledger" }, () => fetchLeaderboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchLeaderboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);

    // 1. Fetch approved profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, domain, role, avatar_path, total_points")
      .eq("status", "approved");

    // 2. Fallback ledger summation if total_points isn't populated yet
    const { data: ledger } = await supabase.from("points_ledger").select("profile_id, points_awarded");

    const pointsMap: Record<string, number> = {};
    ledger?.forEach((item) => {
      pointsMap[item.profile_id] = (pointsMap[item.profile_id] || 0) + item.points_awarded;
    });

    const ranked = (profiles || []).map((p) => ({
      ...p,
      points: (p.total_points ?? pointsMap[p.id]) || 0
    })).sort((a, b) => b.points - a.points);

    setLeaderboard(ranked);
    setLoading(false);
  }

  // Fetch individual point history for any member
  async function openMemberHistory(member: any) {
    setSelectedMember(member);
    setLoadingLedger(true);

    const { data: history } = await supabase
      .from("points_ledger")
      .select("*")
      .eq("profile_id", member.id)
      .order("created_at", { ascending: false });

    setMemberLedger(history || []);
    setLoadingLedger(false);
  }

  const filteredList = leaderboard.filter((m) => {
    const matchesSearch = m.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          m.domain?.toLowerCase().includes(search.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || m.domain?.toLowerCase() === selectedDomain.toLowerCase();
    return matchesSearch && matchesDomain;
  });

  const topThree = leaderboard.slice(0, 3);
  const restOfList = filteredList.slice(selectedDomain === 'all' && search === '' ? 3 : 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl neo-pressed flex items-center justify-center text-amber-500 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gradient">Global Leaderboard</h2>
            <p className="text-xs font-semibold opacity-60">Chapter rankings based on task deliverables and contribution points.</p>
          </div>
        </div>

        {/* Search & Domain Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-48">
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
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium capitalize cursor-pointer"
          >
            <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
            <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
            <option value="events" className="bg-[var(--bg-surface)]">Events</option>
            <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin opacity-50 text-emerald-500" /></div>
      ) : leaderboard.length === 0 ? (
        <div className="neo-flat rounded-3xl p-12 text-center opacity-50">No leaderboard rankings generated yet.</div>
      ) : (
        <>
          {/* Top 3 Podium Showcase (Only shown on 'all' filter without search) */}
          {selectedDomain === 'all' && search === '' && topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="neo-flat rounded-3xl p-6 flex flex-col items-center text-center space-y-3 relative order-2 md:order-1 border border-slate-300/20">
                  <div className="absolute -top-3 w-8 h-8 rounded-full bg-slate-300 text-black font-black text-xs flex items-center justify-center shadow-md">
                    #2
                  </div>
                  <div className="w-16 h-16 rounded-full neo-pressed overflow-hidden border-2 border-slate-300/50 flex items-center justify-center mt-2">
                    {topThree[1].avatar_path ? (
                      <img src={topThree[1].avatar_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 opacity-40" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black">{topThree[1].full_name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{topThree[1].domain || "Core"}</p>
                  </div>
                  <div className="neo-pressed px-4 py-1.5 rounded-xl">
                    <span className="text-xs font-mono font-black text-slate-300">{topThree[1].points} PTS</span>
                  </div>

                  <button
                    onClick={() => openMemberHistory(topThree[1])}
                    className="mt-1 px-3 py-1.5 neo-btn rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                  >
                    <History className="w-3 h-3 text-slate-300" /> View History
                  </button>
                </div>
              )}

              {/* 1st Place (Crown Winner) */}
              {topThree[0] && (
                <div className="neo-flat rounded-3xl p-6 flex flex-col items-center text-center space-y-3 relative order-1 md:order-2 border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent shadow-xl">
                  <div className="absolute -top-4 w-10 h-10 rounded-full bg-amber-500 text-black font-black text-sm flex items-center justify-center shadow-lg">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="w-20 h-20 rounded-full neo-pressed overflow-hidden border-2 border-amber-500 flex items-center justify-center mt-2">
                    {topThree[0].avatar_path ? (
                      <img src={topThree[0].avatar_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 opacity-40" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black">{topThree[0].full_name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-amber-500 font-extrabold">{topThree[0].domain || "Core"}</p>
                  </div>
                  <div className="neo-pressed px-5 py-2 rounded-xl">
                    <span className="text-sm font-mono font-black text-amber-400">{topThree[0].points} PTS</span>
                  </div>

                  <button
                    onClick={() => openMemberHistory(topThree[0])}
                    className="mt-1 px-3.5 py-1.5 neo-btn rounded-xl text-[10px] font-bold text-amber-400 flex items-center gap-1.5 hover:scale-105 transition-all border border-amber-500/20 cursor-pointer"
                  >
                    <History className="w-3 h-3 text-amber-400" /> View History
                  </button>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="neo-flat rounded-3xl p-6 flex flex-col items-center text-center space-y-3 relative order-3 border border-amber-700/20">
                  <div className="absolute -top-3 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                    #3
                  </div>
                  <div className="w-16 h-16 rounded-full neo-pressed overflow-hidden border-2 border-amber-700/50 flex items-center justify-center mt-2">
                    {topThree[2].avatar_path ? (
                      <img src={topThree[2].avatar_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 opacity-40" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black">{topThree[2].full_name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold">{topThree[2].domain || "Core"}</p>
                  </div>
                  <div className="neo-pressed px-4 py-1.5 rounded-xl">
                    <span className="text-xs font-mono font-black text-amber-600">{topThree[2].points} PTS</span>
                  </div>

                  <button
                    onClick={() => openMemberHistory(topThree[2])}
                    className="mt-1 px-3 py-1.5 neo-btn rounded-xl text-[10px] font-bold text-amber-600 flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                  >
                    <History className="w-3 h-3 text-amber-600" /> View History
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Full Rankings Table */}
          <div className="neo-flat rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--text-muted)]/15 bg-black/5 dark:bg-white/5 font-bold uppercase tracking-wider text-[10px] opacity-70">
                    <th className="p-4 w-16 text-center">Rank</th>
                    <th className="p-4">Member</th>
                    <th className="p-4">Domain</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 text-center">Contribution Score</th>
                    <th className="p-4 text-right pr-6">Points Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--text-muted)]/10 font-medium">
                  {restOfList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center opacity-50">No members match the filter criteria.</td>
                    </tr>
                  ) : (
                    restOfList.map((member, index) => {
                      const actualRank = selectedDomain === 'all' && search === '' ? index + 4 : index + 1;
                      return (
                        <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 text-center font-black font-mono opacity-80">
                            #{actualRank}
                          </td>

                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                              {member.avatar_path ? (
                                <img src={member.avatar_path} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 opacity-40" />
                              )}
                            </div>
                            <span className="font-bold">{member.full_name}</span>
                          </td>

                          <td className="p-4 uppercase tracking-wider font-extrabold text-[10px] opacity-70">
                            {member.domain || "N/A"}
                          </td>

                          <td className="p-4 capitalize text-emerald-600 dark:text-emerald-400 font-bold">
                            {member.role?.replace("_", " ")}
                          </td>

                          <td className="p-4 text-center font-mono font-black text-emerald-500 text-sm">
                            {member.points} PTS
                          </td>

                          <td className="p-4 text-right pr-6">
                            <button
                              onClick={() => openMemberHistory(member)}
                              className="px-3 py-1.5 neo-btn rounded-xl text-[10px] font-bold text-emerald-500 inline-flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                            >
                              <History className="w-3 h-3" /> History
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Member Points History Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--text-muted)]/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0 border border-emerald-500/30">
                  {selectedMember.avatar_path ? (
                    <img src={selectedMember.avatar_path} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black">{selectedMember.full_name}</h3>
                  <p className="text-[10px] uppercase font-bold text-emerald-500">{selectedMember.domain} • {selectedMember.role?.replace("_", " ")}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full neo-pressed flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Points Summary */}
            <div className="neo-pressed p-4 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold opacity-60 uppercase tracking-wider">Total Accumulated Score</span>
              <span className="text-base font-mono font-black text-emerald-500">{selectedMember.points} PTS</span>
            </div>

            {/* Ledger List */}
            <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Detailed Points Audit Trail</p>
              
              {loadingLedger ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin opacity-50 text-emerald-500" /></div>
              ) : memberLedger.length === 0 ? (
                <div className="p-6 text-center opacity-50 text-xs neo-pressed rounded-xl">No point transactions recorded for this member.</div>
              ) : (
                memberLedger.map((item) => {
                  const isNegative = item.points_awarded < 0;
                  const isBonus = item.reason?.includes("Executive Bonus");
                  
                  return (
                    <div key={item.id} className="neo-pressed p-3.5 rounded-2xl flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {isNegative ? (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : isBonus ? (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <p className="text-xs font-bold leading-tight">{item.reason}</p>
                        </div>
                        <p className="text-[9px] opacity-40 font-mono pl-5">{new Date(item.created_at).toLocaleString()}</p>
                      </div>

                      <span className={`text-xs font-mono font-black shrink-0 ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isNegative ? `${item.points_awarded} PTS` : `+${item.points_awarded} PTS`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              className="w-full py-3 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer mt-2"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}