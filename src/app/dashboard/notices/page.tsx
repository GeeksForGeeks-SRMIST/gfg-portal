"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/app/actions/notify";
import { 
  Bell, Plus, Loader2, Trash2, Send, AlertTriangle, CheckCircle2, 
  Bold, Italic, List, Code, Link2, ExternalLink, Sparkles, LayoutList, PenSquare, Lock
} from "lucide-react";

export default function NoticesPage() {
  const [activeTab, setActiveTab] = useState<"board" | "post">("board");
  const [notices, setNotices] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Custom Modal States
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

  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role?.toLowerCase());

  // Text Formatting Helpers for Textarea
  function insertFormatting(syntaxBefore: string, syntaxAfter: string = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "text";
    const replacement = `${syntaxBefore}${selectedText}${syntaxAfter}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxBefore.length, end + syntaxBefore.length);
    }, 0);
  }

  // Helper to parse content text, bold/italic syntax, and turn URLs into clickable links
  function renderFormattedContent(text: string) {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const paragraphs = text.split("\n");

    return paragraphs.map((paragraph, pIdx) => {
      const parts = paragraph.split(urlRegex);

      return (
        <p key={pIdx} className="min-h-[1.2em] leading-relaxed">
          {parts.map((part, idx) => {
            if (part.match(urlRegex)) {
              const href = part.startsWith("http") ? part : `https://${part}`;
              return (
                <a
                  key={idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-500 font-bold hover:underline bg-emerald-500/10 px-1.5 py-0.5 rounded-md my-0.5 break-all cursor-pointer transition-colors hover:bg-emerald-500/20"
                >
                  {part}
                  <ExternalLink className="w-3 h-3 shrink-0 inline"/>
                </a>
              );
            }

            let formattedPart: React.ReactNode = part;
            if (part.includes("**")) {
              const boldSegments = part.split(/\*\*(.*?)\*\*/g);
              formattedPart = boldSegments.map((seg, bIdx) =>
                bIdx % 2 === 1 ? <strong key={bIdx} className="font-extrabold text-[var(--text-main)]">{seg}</strong> : seg
              );
            }

            return <span key={idx}>{formattedPart}</span>;
          })}
        </p>
      );
    });
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content || !isLead) return;
    setIsPublishing(true);

    // 1. Insert Notice into Database
    await supabase.from("notices").insert({
      title,
      content,
      is_important: isImportant,
      author_id: profile?.id
    });

    const broadcastTitle = `${isImportant ? '🚨' : '📢'} New Notice: ${title}`;
    const broadcastMessage = content.substring(0, 100) + "...";

    // 2. Trigger Real-time Bell & OS Push via Server Action
    try {
      await sendNotification({
        title: broadcastTitle,
        message: broadcastMessage,
        link: "/dashboard/notices",
        target_user_id: null // Broadcast to all
      });
    } catch (pushErr) {
      console.error("Failed to trigger push notification:", pushErr);
    }

    setTitle("");
    setContent("");
    setIsImportant(false);
    setIsPublishing(false);
    
    await fetchData();
    setActiveTab("board");
  }

  async function confirmAndDeleteNotice() {
    if (!deleteModal.noticeId) return;
    setIsDeleting(true);

    setNotices(prev => prev.filter(n => n.id !== deleteModal.noticeId));

    const { error } = await supabase.from("notices").delete().eq("id", deleteModal.noticeId);
    if (error) {
      fetchData();
    }

    setIsDeleting(false);
    setDeleteModal({ isOpen: false, noticeId: null, title: "" });
  }

  async function handleSendReminder(notice: any) {
    const reminderTitle = `⏰ REMINDER: ${notice.title}`;
    const reminderMessage = `Important reminder regarding notice published on ${new Date(notice.created_at).toLocaleDateString()}`;

    // Trigger Real-time Bell & OS Push via Server Action
    try {
      await sendNotification({
        title: reminderTitle,
        message: reminderMessage,
        link: "/dashboard/notices",
        target_user_id: null
      });
    } catch (pushErr) {
      console.error("Failed to trigger push reminder:", pushErr);
    }

    setAlertModal({
      isOpen: true,
      message: `Real-time push reminder sent to all members for: "${notice.title}"`
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Page Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <Bell className="w-6 h-6"/>
          </div>
          <div>
            <h2 className="text-xl font-black text-gradient">Announcements & Notices</h2>
            <p className="text-xs font-semibold opacity-60">Official board updates, broadcasts, and reminders.</p>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="flex p-1.5 neo-pressed rounded-2xl shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("board")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "board" 
                ? "neo-flat text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 shadow-sm" 
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Notice Board
          </button>

          <button
            onClick={() => setActiveTab("post")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "post" 
                ? "neo-flat text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 shadow-sm" 
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {isLead ? <PenSquare className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} 
            Post Notice
          </button>
        </div>
      </div>

      {/* TAB 1: NOTICE BOARD FEED */}
      {activeTab === "board" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50"/></div>
          ) : notices.length === 0 ? (
            <div className="neo-flat rounded-3xl p-12 text-center opacity-50 text-xs font-bold">
              No announcements published yet.
            </div>
          ) : (
            notices.map((notice) => (
              <div key={notice.id} className="neo-flat rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden transition-all border border-white/5">
                {/* Left urgency indicator bar */}
                <div className={`absolute top-0 left-0 w-2 h-full ${notice.is_important ? 'bg-gradient-to-b from-rose-500 to-amber-500' : 'bg-emerald-500'}`} />
                
                <div className="space-y-3 pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-black tracking-tight ${
                        notice.is_important 
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500 font-extrabold text-lg' 
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 font-bold'
                      }`}>
                        {notice.title}
                      </h3>
                      {notice.is_important && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5"/> High Priority
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0 font-mono">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Notice Content */}
                  <div className="text-xs opacity-90 space-y-1.5 font-medium leading-relaxed">
                    {renderFormattedContent(notice.content)}
                  </div>
                </div>

                {/* Footer Metadata & Actions */}
                <div className="pt-3 border-t border-[var(--text-muted)]/10 flex items-center justify-between pl-3">
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
                        <Send className="w-3 h-3"/> Send Reminder
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, noticeId: notice.id, title: notice.title })}
                        className="p-2 neo-btn rounded-xl text-rose-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: POST NOTICE FORM */}
      {activeTab === "post" && (
        <div className="animate-in fade-in duration-200">
          {!isLead ? (
            <div className="neo-flat rounded-3xl p-10 text-center space-y-3">
              <Lock className="w-8 h-8 text-rose-500 mx-auto opacity-80" />
              <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Access Restricted</h3>
              <p className="text-xs opacity-60 max-w-sm mx-auto">
                Only chapter leads (President, Secretary, Joint Secretary, Domain Directors) are authorized to publish official notices.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="neo-flat rounded-3xl p-8 space-y-5 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Publish New Notice</h3>
                  <p className="text-[10px] opacity-60 mt-0.5">Dispatches real-time broadcast to all chapter members</p>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-500 opacity-60"/>
              </div>
              
              {/* Heading */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Heading / Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Core Team Sync & Agenda"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-transparent font-extrabold"
                />
              </div>

              {/* Notice Content & Formatting Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[9px] font-extrabold uppercase opacity-60">Description & Links *</label>
                  
                  {/* Text Formatting Toolbar */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertFormatting("**", "**")}
                      className="p-1.5 neo-btn rounded-md hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-3 h-3"/>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("*", "*")}
                      className="p-1.5 neo-btn rounded-md hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-3 h-3"/>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("\n- ")}
                      className="p-1.5 neo-btn rounded-md hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Bullet Point"
                    >
                      <List className="w-3 h-3"/>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("https://")}
                      className="p-1.5 neo-btn rounded-md hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Insert URL Link"
                    >
                      <Link2 className="w-3 h-3"/>
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  placeholder="Type description, meeting links (e.g. https://meet.google.com/xyz), agendas..."
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-transparent font-medium custom-scrollbar resize-none leading-relaxed"
                />
              </div>

              {/* High Priority Toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="peer sr-only" />
                <div className="w-5 h-5 neo-pressed rounded-md flex items-center justify-center peer-checked:text-rose-500 transition-colors shrink-0">
                  {isImportant && <AlertTriangle className="w-3.5 h-3.5"/>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Mark as High Priority (Red Alert Broadcast)</span>
              </label>

              <button type="submit" disabled={isPublishing} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer shadow-lg">
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4"/> Publish & Broadcast Notice</>}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Confirmation Modal for Notice Deletion */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500"/>
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
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Delete Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal for Reminders */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500">
                <CheckCircle2 className="w-5 h-5"/>
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