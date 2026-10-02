"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Award, Medal, Crown, User, Filter, Search, Loader2 } from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");

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
            className="px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium capitalize"
          >
            <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
            <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
            <option value="events" className="bg-[var(--bg-surface)]">Events</option>
            <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            <option value="management" className="bg-[var(--bg-surface)]">Management</option>
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
                </div>
              )}

              {/* 1st Place (Crown Winner) */}
              {topThree[0] && (
                <div className="neo-flat rounded-3xl p-6 flex flex-col items-center text-center space-y-3 relative order-1 md:order-2 border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent">
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
                    <th className="p-4 text-right pr-6">Contribution Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--text-muted)]/10 font-medium">
                  {restOfList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center opacity-50">No members match the filter criteria.</td>
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

                          <td className="p-4 text-right pr-6 font-mono font-black text-emerald-500 text-sm">
                            {member.points} PTS
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

    </div>
  );
}