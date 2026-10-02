"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCheck, UserX, Trash2, Shield, Search, CheckCircle, Clock, XCircle, Plus, CalendarDays, CheckSquare, Loader2 } from "lucide-react";
import { deleteUserCompletely } from "@/app/actions/admin";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "events" | "tasks">("members");

  // Event Creation State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Task Creation State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPoints, setTaskPoints] = useState(100);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    await supabase.from("profiles").update({ status }).eq("id", id);
    fetchUsers();
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm("Are you sure you want to completely remove this user from Auth and the portal?")) return;
    
    const result = await deleteUserCompletely(id, email);
    if (!result.success) {
      alert("Failed to delete from Auth: " + result.error);
    } else {
      alert("User completely removed from authentication and database!");
    }
    fetchUsers();
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreatingEvent(true);
    await supabase.from("events").insert({
      title: eventTitle,
      description: eventDesc,
      event_date: eventDate,
      location: eventLocation || "TP Ganesan Auditorium / SRMIST Campus"
    });
    setEventTitle("");
    setEventDesc("");
    setEventDate("");
    setEventLocation("");
    setCreatingEvent(false);
    alert("Event scheduled successfully!");
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTask(true);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("tasks").insert({
      title: taskTitle,
      description: taskDesc,
      assigned_to: taskAssignee,
      assigned_by: user?.id,
      points: taskPoints,
      deadline: taskDeadline,
      status: "pending"
    });

    setTaskTitle("");
    setTaskDesc("");
    setTaskAssignee("");
    setTaskPoints(100);
    setTaskDeadline("");
    setCreatingTask(false);
    alert("Task assigned successfully!");
  }

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.reg_number?.toLowerCase().includes(search.toLowerCase()) ||
    u.srm_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Executive Management Hub</h2>
          <p className="text-xs font-semibold opacity-60">Approve onboarding requests, schedule chapter events, and assign deliverables.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "members" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Members Queue
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "events" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Schedule Event
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "tasks" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Assign Task
          </button>
        </div>
      </div>

      {/* Tab 1: Member Approvals Directory */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="neo-flat rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--text-muted)]/15 bg-black/5 dark:bg-white/5 font-bold uppercase tracking-wider text-[10px] opacity-70">
                    <th className="p-4">Member</th>
                    <th className="p-4">Role / Domain</th>
                    <th className="p-4">Reg Number</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--text-muted)]/10 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center opacity-50">Loading directory...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center opacity-50">No users found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                            {u.avatar_path ? (
                              <img src={u.avatar_path} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="w-4 h-4 opacity-40" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold">{u.full_name}</p>
                            <p className="text-[10px] opacity-50">{u.srm_email}</p>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">{u.role?.replace("_", " ")}</span>
                          <p className="text-[10px] opacity-50 capitalize">{u.domain || "N/A"}</p>
                        </td>

                        <td className="p-4 opacity-80">{u.reg_number}</td>

                        <td className="p-4">
                          {u.status === "approved" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {u.status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                              <Clock className="w-3 h-3 animate-pulse" /> Pending
                            </span>
                          )}
                          {u.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.status === "pending" && (
                              <button
                                onClick={() => updateStatus(u.id, "approved")}
                                className="p-1.5 rounded-lg neo-btn text-emerald-500 hover:scale-110 active:scale-95 transition-all"
                                title="Approve Member"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {u.status === "pending" && (
                              <button
                                onClick={() => updateStatus(u.id, "rejected")}
                                className="p-1.5 rounded-lg neo-btn text-amber-500 hover:scale-110 active:scale-95 transition-all"
                                title="Reject Member"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(u.id, u.srm_email)}
                              className="p-1.5 rounded-lg neo-btn text-rose-500 hover:scale-110 active:scale-95 transition-all"
                              title="Delete User Completely"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Create Event */}
      {activeTab === "events" && (
        <form onSubmit={handleCreateEvent} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Schedule Chapter Event</h3>
          <input
            type="text"
            required
            placeholder="Event Title (e.g. JAVA-VERSE 2026, Design Sprint)"
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
            placeholder="Location / Venue (e.g. TP Ganesan Auditorium / Mini Hall 2)"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <textarea
            placeholder="Event Brief / Objectives"
            rows={3}
            value={eventDesc}
            onChange={(e) => setEventDesc(e.target.value)}
            className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <button type="submit" disabled={creatingEvent} className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Publish Event</>}
          </button>
        </form>
      )}

      {/* Tab 3: Assign Deliverable Task */}
      {activeTab === "tasks" && (
        <form onSubmit={handleCreateTask} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Assign Member Task & Points</h3>
          
          <input
            type="text"
            required
            placeholder="Task Title (e.g. Design Recruitment Posters, Develop API Route)"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <select
            required
            value={taskAssignee}
            onChange={(e) => setTaskAssignee(e.target.value)}
            className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="" className="bg-[var(--bg-surface)]">-- Select Assignee Member --</option>
            {users.filter(u => u.status === 'approved').map(u => (
              <option key={u.id} value={u.id} className="bg-[var(--bg-surface)]">
                {u.full_name} ({u.domain} - {u.role})
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase opacity-60 px-1">Reward Points</label>
              <input
                type="number"
                required
                value={taskPoints}
                onChange={(e) => setTaskPoints(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase opacity-60 px-1">Completion Deadline</label>
              <input
                type="datetime-local"
                required
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <textarea
            placeholder="Task guidelines, resources, or links..."
            rows={3}
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />

          <button type="submit" disabled={creatingTask} className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckSquare className="w-4 h-4" /> Assign Task</>}
          </button>
        </form>
      )}

    </div>
  );
}