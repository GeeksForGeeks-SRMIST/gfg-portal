"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Image as ImageIcon, 
  Plus, 
  Calendar, 
  Tag, 
  Trash2, 
  Loader2, 
  Sparkles, 
  User, 
  Upload, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Bold, 
  Italic, 
  Underline, 
  Code, 
  List, 
  Smile 
} from "lucide-react";

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "🎉", "😂", "😮"];
const ALL_EMOJIS = ["❤️", "👍", "🔥", "🎉", "😂", "😮", "👏", "🙌", "😍", "🚀", "💡", "💯", "✨", "🥳", "🙏"];

export default function MemoriesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "create">("feed");

  // Emoji Picker State
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState<string | null>(null);

  // Create Memory Form State
  const [eventTitle, setEventTitle] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Modal States
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false, message: ""
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; memoryObj: any | null }>({
    isOpen: false, memoryObj: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Real-time synchronization
    const channel = supabase
      .channel("memories_realtime_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "memory_reactions" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(userProfile);

    // 1. Fetch Memories with Member Author
    const { data: memData, error: memError } = await supabase
      .from("memories")
      .select("*, member:profiles!memories_member_id_fkey(full_name, role, domain, avatar_path)")
      .order("created_at", { ascending: false });

    if (memError) {
      console.error("Memories Fetch Error:", memError);
      setLoading(false);
      return;
    }

    // 2. Fetch Reactions safely
    const { data: reactionsData } = await supabase.from("memory_reactions").select("*");

    // Map reactions to memories
    const combinedMemories = (memData || []).map((mem) => {
      const memoryReactions = (reactionsData || []).filter((r) => r.memory_id === mem.id);
      return { ...mem, memory_reactions: memoryReactions };
    });

    setMemories(combinedMemories);
    setLoading(false);
  }

  // Toggle Reaction with Real-time Sync
  async function handleToggleReaction(memoryId: string, emoji: string) {
    if (!profile?.id) return;

    setOpenEmojiPickerId(null);

    const { data: existing } = await supabase
      .from("memory_reactions")
      .select("id")
      .eq("memory_id", memoryId)
      .eq("member_id", profile.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from("memory_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("memory_reactions").insert({
        memory_id: memoryId,
        member_id: profile.id,
        emoji
      });
    }

    fetchData();
  }

  const insertFormatting = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end) || "text";
    const newText = description.substring(0, start) + prefix + selectedText + suffix + description.substring(end);
    
    setDescription(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setAlertModal({ isOpen: true, message: "File size must be less than 5MB" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleCreateMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!eventTitle || !description) return;
    setSubmitting(true);

    let imageUrl = "";

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `memories/${profile.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, imageFile, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    // 1. Save memory
    const { error } = await supabase.from("memories").insert({
      member_id: profile.id,
      event_title: eventTitle,
      memory_date: memoryDate,
      description,
      image_url: imageUrl
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Failed to share memory: " + error.message });
    } else {
      // 2. Send Broadcast Notification to Entire Team (target_user_id = null)
      await supabase.from("notifications").insert({
        title: `📸 New Club Memory: ${eventTitle}`,
        message: `${profile?.full_name || 'A team member'} posted a new story highlight! Check it out in the Memories feed.`,
        target_user_id: null,
        type: "notice"
      });

      setEventTitle("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      setActiveTab("feed");
      fetchData();
    }
    setSubmitting(false);
  }

  const isPrivileged = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);

  const promptDeleteMemory = (mem: any) => {
    const canDelete = isPrivileged || mem.member_id === profile?.id;
    if (!canDelete) {
      setAlertModal({ isOpen: true, message: "You can only delete your own memories." });
      return;
    }
    setDeleteModal({ isOpen: true, memoryObj: mem });
  };

  async function confirmAndDeleteMemory() {
    if (!deleteModal.memoryObj) return;
    setIsDeleting(true);

    const { error } = await supabase.from("memories").delete().eq("id", deleteModal.memoryObj.id);
    setIsDeleting(false);
    setDeleteModal({ isOpen: false, memoryObj: null });

    if (error) {
      setAlertModal({ isOpen: true, message: "Error deleting: " + error.message });
    } else {
      fetchData();
    }
  }

  const getChatTheme = (id: string) => {
    const themes = [
      { border: "border-emerald-500/30", bg: "bg-emerald-500/5", tag: "text-emerald-500 bg-emerald-500/10" },
      { border: "border-blue-500/30", bg: "bg-blue-500/5", tag: "text-blue-500 bg-blue-500/10" },
      { border: "border-purple-500/30", bg: "bg-purple-500/5", tag: "text-purple-500 bg-purple-500/10" },
      { border: "border-amber-500/30", bg: "bg-amber-500/5", tag: "text-amber-500 bg-amber-500/10" },
      { border: "border-rose-500/30", bg: "bg-rose-500/5", tag: "text-rose-500 bg-rose-500/10" },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return themes[Math.abs(hash) % themes.length];
  };

  const renderFormattedText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/`(.*?)`/g, '<code class="bg-black/20 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Club Group Chat & Memories</h2>
            <p className="text-xs font-semibold opacity-60">Share group highlights, event moments, and stories with the core team.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "feed" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Chat Feed ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Post Memory
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT FEED */}
      {activeTab === "feed" && (
        <div className="space-y-4 max-w-xl mx-auto">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : memories.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No memories posted yet. Start the conversation!</p>
            </div>
          ) : (
            memories.map((mem) => {
              const canModify = isPrivileged || mem.member_id === profile?.id;
              const theme = getChatTheme(mem.member_id || "default");
              
              const reactionCounts: Record<string, { count: number; reactedByMe: boolean }> = {};
              (mem.memory_reactions || []).forEach((r: any) => {
                if (!reactionCounts[r.emoji]) {
                  reactionCounts[r.emoji] = { count: 0, reactedByMe: false };
                }
                reactionCounts[r.emoji].count += 1;
                if (r.member_id === profile?.id) {
                  reactionCounts[r.emoji].reactedByMe = true;
                }
              });

              return (
                <div key={mem.id} className={`neo-flat rounded-2xl p-4 space-y-3 border relative group ${theme.border} ${theme.bg}`}>
                  
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full neo-pressed overflow-hidden flex items-center justify-center shrink-0">
                        {mem.member?.avatar_path ? (
                          <img src={mem.member.avatar_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{mem.member?.full_name || "Club Member"}</p>
                        <p className="text-[9px] opacity-50 uppercase tracking-widest font-extrabold">
                          {mem.member?.role?.replace("_", " ")} • {mem.member?.domain || "General"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOpenEmojiPickerId(openEmojiPickerId === mem.id ? null : mem.id)}
                        className="p-1.5 neo-btn rounded-lg text-amber-500 hover:scale-105 transition-all cursor-pointer"
                        title="React with Emoji"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {canModify && (
                        <button
                          onClick={() => promptDeleteMemory(mem)}
                          className="p-1.5 neo-btn rounded-lg text-rose-500 hover:scale-105 transition-all cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Floating Emoji Picker */}
                  {openEmojiPickerId === mem.id && (
                    <div className="absolute top-12 right-4 z-30 neo-flat p-2 rounded-2xl flex items-center gap-1.5 shadow-2xl border border-white/20 animate-in zoom-in-95 bg-[var(--bg-base)]">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(mem.id, emoji)}
                          className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Event Tag */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${theme.tag}`}>
                      <Tag className="w-3 h-3" /> {mem.event_title}
                    </span>
                    <span className="text-[9px] opacity-40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {mem.memory_date}
                    </span>
                  </div>

                  {/* Image Attachment */}
                  {mem.image_url && (
                    <div className="rounded-xl overflow-hidden neo-pressed flex justify-center bg-black/10">
                      <img 
                        src={mem.image_url} 
                        alt="Memory Attachment" 
                        className="w-auto h-auto max-w-full max-h-[450px] object-contain rounded-lg" 
                      />
                    </div>
                  )}

                  {/* Caption */}
                  <div 
                    className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap font-medium"
                    dangerouslySetInnerHTML={{ __html: renderFormattedText(mem.description) }}
                  />

                  {/* Reactions Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {Object.entries(reactionCounts).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(mem.id, emoji)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          data.reactedByMe 
                            ? "neo-pressed border border-emerald-500/40 text-emerald-500 bg-emerald-500/10" 
                            : "neo-btn opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] font-mono">{data.count}</span>
                      </button>
                    ))}
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: POST MEMORY FORM */}
      {activeTab === "create" && (
        <form onSubmit={handleCreateMemory} className="neo-flat rounded-2xl p-6 max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Post Club Memory</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Event / Highlight Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. JAVA-VERSE 2026 Night"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Date *</label>
              <input
                type="date"
                required
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60">Caption / Story *</label>
              
              <div className="flex items-center gap-1 p-1 neo-pressed rounded-lg">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-1 neo-btn rounded text-[10px] font-bold hover:text-emerald-500 cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-1 neo-btn rounded text-[10px] font-bold hover:text-emerald-500 cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("<u>", "</u>")}
                  className="p-1 neo-btn rounded text-[10px] font-bold hover:text-emerald-500 cursor-pointer"
                  title="Underline"
                >
                  <Underline className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("`", "`")}
                  className="p-1 neo-btn rounded text-[10px] font-bold hover:text-emerald-500 cursor-pointer"
                  title="Code block"
                >
                  <Code className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("- ")}
                  className="p-1 neo-btn rounded text-[10px] font-bold hover:text-emerald-500 cursor-pointer"
                  title="List Item"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              required
              rows={5}
              placeholder="Write your story... (Use **bold**, *italic*, <u>underline</u>, or `code`)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Attach Photo (Optional)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 neo-pressed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:ring-1 ring-emerald-500/50 transition-all overflow-hidden relative group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">Change Photo</span>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-emerald-500 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Click to upload photo (Max 5MB)</span>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg" className="hidden" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Message & Alert Team"}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
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
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Memory Event:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteModal.memoryObj?.event_title}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, memoryObj: null })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteMemory}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Memory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Notification</h3>
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