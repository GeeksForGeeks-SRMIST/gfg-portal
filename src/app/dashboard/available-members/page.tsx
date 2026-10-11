"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  UserCheck,
  Check,
  Filter,
  Search,
  Loader2,
  CalendarDays,
  Clock,
  Layers,
  Sparkles,
  X,
} from "lucide-react";

const TIME_SLOTS = [
  "8:00 - 8:50",
  "8:50 - 9:40",
  "9:45 - 10:35",
  "10:40 - 11:30",
  "11:35 - 12:25",
  "12:30 - 1:20",
  "1:25 - 2:15",
  "2:20 - 3:10",
  "3:10 - 4:00",
  "4:00 - 4:50",
];

const DOMAINS = [
  { label: "All Domains", value: "all" },
  { label: "Technical", value: "technical" },
  { label: "Events", value: "events" },
  { label: "Creatives", value: "creatives" },
  { label: "Executive", value: "executive" },
];

export default function AvailableMembersPage() {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(["8:00 - 8:50"]);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [allMembersWithSlots, setAllMembersWithSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const resolveBatch = (member: any): string => {
    if (member.batch) {
      const str = String(member.batch).toLowerCase();
      if (str.includes("2")) return "2";
      if (str.includes("1")) return "1";
    }
    if (member.reg_number) {
      const lastDigits = parseInt(member.reg_number.slice(-2), 10);
      if (!isNaN(lastDigits)) {
        return lastDigits % 2 === 0 ? "2" : "1";
      }
    }
    return "1";
  };

  const fetchFreeMembers = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Query all timetable records for the chosen Day Order
      const { data: slotRecords } = await supabase
        .from("timetable_slots")
        .select("profile_id, free_slots")
        .eq("day_order", selectedDay);

      const memberSlotsMap: Record<string, string[]> = {};
      slotRecords?.forEach((r: any) => {
        memberSlotsMap[r.profile_id] = r.free_slots || [];
      });

      // 2. Query all approved profiles (optionally filtered by domain)
      let profileQuery = supabase
        .from("profiles")
        .select("id, full_name, role, domain, avatar_path, reg_number, batch")
        .eq("status", "approved");

      if (selectedDomain !== "all") {
        profileQuery = profileQuery.ilike("domain", selectedDomain);
      }

      const { data: profiles } = await profileQuery;

      // 3. Attach the free slots for the selected Day Order to each profile
      const enrichedProfiles = (profiles || []).map((p) => ({
        ...p,
        batchResolved: resolveBatch(p),
        allFreeSlots: memberSlotsMap[p.id] || [],
      }));

      setAllMembersWithSlots(enrichedProfiles);
    } catch (err) {
      console.error("Failed to fetch available members:", err);
      setAllMembersWithSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, selectedDomain, supabase]);

  useEffect(() => {
    fetchFreeMembers();
  }, [fetchFreeMembers]);

  const toggleSlotSelection = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSelectFullDay = () => {
    setSelectedSlots([...TIME_SLOTS]);
  };

  const handleClearSlots = () => {
    setSelectedSlots([]);
  };

  // Smart Filter Logic:
  // 1. If searching for a person by name/reg_number: display that person along with ALL their free slots for the selected Day Order.
  // 2. If no search query: display members who are free during AT LEAST ONE of the selected time slots.
  const isSearchActive = searchQuery.trim().length > 0;

  const filteredMembers = allMembersWithSlots.filter((m) => {
    // Batch filter
    const matchesBatch =
      selectedBatch === "all" || String(m.batchResolved) === String(selectedBatch);
    if (!matchesBatch) return false;

    if (isSearchActive) {
      const q = searchQuery.toLowerCase().trim();
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.reg_number?.toLowerCase().includes(q)
      );
    } else {
      if (selectedSlots.length === 0) return true;
      return selectedSlots.some((slot) => m.allFreeSlots.includes(slot));
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Available Members Lookup</h2>
            <p className="text-xs font-semibold opacity-60">
              Filter available core team members by Day Order, Time Slots, Domain, and Batch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="neo-flat px-4 py-2 rounded-xl text-center border border-emerald-500/20">
            <span className="text-sm font-black text-emerald-500">
              {filteredMembers.length}
            </span>
            <span className="text-[10px] opacity-60 font-bold ml-2 uppercase tracking-wider">
              {isSearchActive ? "Member Found" : "Members Free"}
            </span>
          </div>
        </div>
      </div>

      {/* Control Matrix */}
      <div className="neo-flat rounded-[2rem] p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--text-muted)]/10 pb-5">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 mb-2 px-1">
              <CalendarDays className="w-3.5 h-3.5" /> 1. Select Day Order
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedDay === day
                      ? "neo-pressed text-emerald-500 border border-emerald-500/30"
                      : "neo-btn opacity-70"
                  }`}
                >
                  Day Order {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            <button
              onClick={handleSelectFullDay}
              className="px-4 py-2.5 neo-btn-green rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" /> Select All 10 Slots
            </button>
            {selectedSlots.length > 0 && (
              <button
                onClick={handleClearSlots}
                className="px-3 py-2.5 neo-btn rounded-xl text-xs font-bold opacity-60 hover:opacity-100 transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 3-Column Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 px-1">
              <Filter className="w-3.5 h-3.5" /> Filter Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-bold"
            >
              {DOMAINS.map((d) => (
                <option
                  key={d.value}
                  value={d.value}
                  className="bg-[var(--bg-surface)] text-[var(--text-main)]"
                >
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 px-1">
              <Layers className="w-3.5 h-3.5" /> Filter Batch
            </label>
            <div className="flex gap-1.5">
              {[
                { label: "All", val: "all" },
                { label: "Batch 1", val: "1" },
                { label: "Batch 2", val: "2" },
              ].map((b) => (
                <button
                  key={b.val}
                  type="button"
                  onClick={() => setSelectedBatch(b.val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedBatch === b.val
                      ? "neo-pressed text-emerald-500 border border-emerald-500/30"
                      : "neo-btn opacity-70"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 px-1">
              <Search className="w-3.5 h-3.5" /> Direct Member Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or Reg No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pr-8 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Time Slot Selector Matrix */}
        <div className="space-y-2 pt-2 border-t border-[var(--text-muted)]/10">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
              Selected Time Blocks ({selectedSlots.length}/10 Slots Selected)
            </label>
            {isSearchActive && (
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                Search Mode Active: Showing Day Order {selectedDay} slots for "{searchQuery}"
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlotSelection(slot)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "neo-pressed text-emerald-500 border border-emerald-500/30 font-extrabold"
                      : "neo-btn opacity-60"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="neo-flat rounded-[2rem] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">
            {isSearchActive ? `Member Search Results (${filteredMembers.length})` : `Available Members (${filteredMembers.length})`}
          </h3>
          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
            Day Order {selectedDay} • {selectedSlots.length} Slot(s) Selected • Batch: {selectedBatch.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-xs opacity-50 font-semibold">Checking member timetables...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs font-bold opacity-60">
              {isSearchActive
                ? `No member named "${searchQuery}" found for Day Order ${selectedDay}.`
                : "No members found matching your selected criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="neo-pressed rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/30 border border-transparent transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl neo-flat overflow-hidden flex items-center justify-center shrink-0">
                      {member.avatar_path ? (
                        <img
                          src={member.avatar_path}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCheck className="w-5 h-5 opacity-40 text-emerald-500" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-extrabold truncate">{member.full_name}</p>
                      <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate">
                        {member.domain || "Core"} • {member.role?.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Batch {member.batchResolved}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--text-muted)]/10">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-40">
                      Day Order {selectedDay} Free Slots ({member.allFreeSlots.length}):
                    </p>
                    <span className="text-[8px] font-mono opacity-50 uppercase">
                      {member.reg_number}
                    </span>
                  </div>

                  {member.allFreeSlots.length === 0 ? (
                    <p className="text-[10px] opacity-40 italic py-1">No free slots recorded on Day Order {selectedDay}.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {member.allFreeSlots.map((s: string, idx: number) => {
                        const isTargetSlot = selectedSlots.includes(s);
                        return (
                          <span
                            key={idx}
                            className={`text-[8px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                              isTargetSlot
                                ? "bg-emerald-500/20 text-emerald-500 font-extrabold border border-emerald-500/30"
                                : "neo-flat opacity-70"
                            }`}
                          >
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}