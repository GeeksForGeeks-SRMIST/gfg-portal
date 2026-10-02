"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCheck, UserX, Trash2, Shield, Search, CheckCircle, Clock, XCircle, Edit3 } from "lucide-react";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);

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

  async function deleteUser(id: string) {
    if (!confirm("Are you sure you want to remove this user from the portal?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    fetchUsers();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    await supabase
      .from("profiles")
      .update({
        full_name: editingUser.full_name,
        role: editingUser.role,
        domain: editingUser.domain,
        department: editingUser.department,
        status: editingUser.status
      })
      .eq("id", editingUser.id);
    setEditingUser(null);
    fetchUsers();
  }

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.reg_number?.toLowerCase().includes(search.toLowerCase()) ||
    u.srm_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Member Management</h2>
          <p className="text-xs font-semibold opacity-60">Approve onboarding requests, edit privileges, or adjust candidate data.</p>
        </div>

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
      </div>

      {/* Users Table */}
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
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg neo-btn opacity-70 hover:opacity-100 hover:scale-110 active:scale-95 transition-all"
                          title="Edit Info"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-1.5 rounded-lg neo-btn text-rose-500 hover:scale-110 active:scale-95 transition-all"
                          title="Delete User"
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gradient">Edit Member Details</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase opacity-60">Full Name</label>
                <input
                  type="text"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full p-2 neo-pressed rounded-lg bg-transparent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase opacity-60">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full p-2 neo-pressed rounded-lg bg-transparent focus:outline-none"
                >
                  <option value="president">President</option>
                  <option value="secretary">Secretary</option>
                  <option value="joint_secretary">Joint Secretary</option>
                  <option value="domain_director">Domain Director</option>
                  <option value="associate_director">Associate Director</option>
                  <option value="member">Member</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase opacity-60">Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full p-2 neo-pressed rounded-lg bg-transparent focus:outline-none"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-1/2 py-2 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 neo-btn-green rounded-xl text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}