"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Search, Clock, UserCheck } from "lucide-react";

const TIME_SLOTS = [
  "8:00 - 8:50", "8:50 - 9:40", "9:45 - 10:35", "10:40 - 11:30", "11:35 - 12:25", 
  "12:30 - 1:20", "1:25 - 2:15", "2:20 - 3:10", "3:10 - 4:00", "4:00 - 4:50"
];

export default function AvailableMembersPage() {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<string>("8:00 - 8:50");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFreeMembers();
  }, [selectedDay, selectedSlot]);

  async function fetchFreeMembers() {
    setLoading(true);
    // Query timetable slots matching selected day and slot
    const { data: slotRecords } = await supabase
      .from("timetable_slots")
      .select("profile_id, free_slots")
      .eq("day_order", selectedDay);

    const matchingUserIds = slotRecords
      ?.filter((r: any) => r.free_slots && r.free_slots.includes(selectedSlot))
      .map((r: any) => r.profile_id) || [];

    if (matchingUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role, domain, avatar_path, reg_number")
        .in("id", matchingUserIds)
        .eq("status", "approved");
      setAvailableMembers(profiles || []);
    } else {
      setAvailableMembers([]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Available Members Lookup</h2>
          <p className="text-xs font-semibold opacity-60">Find free team members for quick meetings or event duties.</p>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="neo-flat rounded-[2rem] p-6 space-y-4">
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 block mb-2 px-1">Select Day Order</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  selectedDay === day ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"
                }`}
              >
                Day Order {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 block mb-2 px-1">Select Time Block</label>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                  selectedSlot === slot ? "neo-pressed text-emerald-500" : "neo-btn opacity-60"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="neo-flat rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">
            Free Members ({availableMembers.length})
          </h3>
          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
            Day Order {selectedDay} • {selectedSlot}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-xs opacity-50 col-span-full py-8 text-center">Searching schedule database...</p>
          ) : availableMembers.length === 0 ? (
            <p className="text-xs opacity-50 col-span-full py-8 text-center">No free members found for this specific slot.</p>
          ) : (
            availableMembers.map((member) => (
              <div key={member.id} className="neo-pressed rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neo-flat overflow-hidden flex items-center justify-center shrink-0">
                  {member.avatar_path ? (
                    <img src={member.avatar_path} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-extrabold truncate">{member.full_name}</p>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate">
                    {member.domain || "Core"} • {member.role.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}