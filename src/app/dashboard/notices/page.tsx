"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Plus, Loader2, Trash2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function NoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  // Custom Modal States (Self-contained like dashboard overview)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noticeId: string | null; title: string }>({
    isOpen: false,
    noticeId: null,
    title: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ""
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Subscribe to real-time notice insertions/deletions
    const channel = supabase
      .channel("notices_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
      setProfile(profileData);
    }

    const { data: noticesData } = await supabase
      .from("notices")
      .select("*, author:profiles(full_name, role)")
      .order("created_at", { ascending: false });
    
    setNotices(noticesData || []);
    setLoading(false);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;
    setIsPublishing(true);

    // 1. Insert Notice
    await supabase.from("notices").insert({
      title,
      content,
      is_important: isImportant,
      author_id: profile?.id
    });

    // 2. Send Real-Time Broadcast Notification
    await supabase.from("notifications").insert({
      title: `📢 New Notice: ${title}`,
      message: content.substring(0, 100) + "...",
      type: "notice"
    });

    setTitle("");
    setContent("");
    setIsImportant(false);
    setIsPublishing(false);
    fetchData();
  }

  async function confirmAndDeleteNotice() {
    if (!deleteModal.noticeId) return;
    setIsDeleting(true);

    // Optimistically filter out from UI
    setNotices(prev => prev.filter(n => n.id !== deleteModal.noticeId));

    const { error } = await supabase.from("notices").delete().eq("id", deleteModal.noticeId);
    if (error) {
      fetchData();
    }

    setIsDeleting(false);
    setDeleteModal({ isOpen: false, noticeId: null, title: "" });
  }

  async function handleSendReminder(notice: any) {
    await supabase.from("notifications").insert({
      title: `⏰ REMINDER: ${notice.title}`,
      message: `Important reminder regarding notice published on ${new Date(notice.created_at).toLocaleDateString()}`,
      type: "reminder"
    });
    setAlertModal({
      isOpen: true,
      message: `Real-time reminder sent to all members for: "${notice.title}"`
    });
  }

  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gradient">Notice Board</h2>
          <p className="text-xs font-semibold opacity-60">Official announcements, reminders, and meeting updates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Notices Feed */}
        <div className={`flex flex-col gap-4 ${isLead ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : notices.length === 0 ? (
            <div className="neo-flat rounded-3xl p-10 text-center opacity-50">No announcements published yet.</div>
          ) : (
            notices.map((notice) => (
              <div key={notice.id} className="neo-flat rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
                {notice.is_important && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />}
                
                <div className="space-y-2 pl-2">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-bold">{notice.title}</h3>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                </div>

                <div className="pt-3 border-t border-[var(--text-muted)]/10 flex items-center justify-between pl-2">
                  <p className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest">
                    Posted by {notice.author?.full_name || "Executive Lead"} • {notice.author?.role?.replace("_", " ")}
                  </p>

                  {isLead && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendReminder(notice)}
                        className="px-2.5 py-1.5 neo-btn rounded-xl text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                        title="Send Real-time Alert Notification"
                      >
                        <Send className="w-3 h-3" /> Send Reminder
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, noticeId: notice.id, title: notice.title })}
                        className="p-2 neo-btn rounded-xl text-rose-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Notice Form (Leads Only) */}
        {isLead && (
          <div className="lg:col-span-4">
            <form onSubmit={handlePublish} className="neo-flat rounded-3xl p-6 space-y-4 sticky top-28">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Publish Announcement</h3>
              
              <input
                type="text"
                placeholder="Notice Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-transparent font-medium"
              />
              
              <textarea
                placeholder="Message, meeting links, agendas..."
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-transparent font-medium custom-scrollbar resize-none"
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="peer sr-only" />
                <div className="w-5 h-5 neo-pressed rounded-md flex items-center justify-center peer-checked:text-rose-500 transition-colors">
                  {isImportant && <AlertTriangle className="w-3 h-3" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Mark as High Priority</span>
              </label>

              <button type="submit" disabled={isPublishing} className="w-full py-3 neo-btn-green rounded-xl text-[10px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer">
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Publish & Notify All</>}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Custom Confirmation Dialog Modal for Deletion */}
      {deleteModal.isOpen && (
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
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Notice to Delete:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteModal.title}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, noticeId: null, title: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteNotice}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal for Reminder Feedback */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Reminder Dispatched</h3>
            </div>

            <p className="text-xs opacity-80 leading-relaxed px-1 text-[var(--text-main)]">{alertModal.message}</p>

            <button
              onClick={() => setAlertModal({ isOpen: false, message: "" })}
              className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
}