"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Image as ImageIcon, Plus, Calendar, Tag, Trash2, Loader2, Sparkles, User, Upload, MessageCircle } from "lucide-react";

export default function MemoriesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "create">("feed");

  // Create Memory Form State
  const [eventTitle, setEventTitle] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(userProfile);

    const { data: memData } = await supabase
      .from("memories")
      .select("*, member:profiles!memories_member_id_fkey(full_name, role, domain, avatar_path)")
      .order("created_at", { ascending: false });

    setMemories(memData || []);
    setLoading(false);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
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

    const { error } = await supabase.from("memories").insert({
      member_id: profile.id,
      event_title: eventTitle,
      memory_date: memoryDate,
      description,
      image_url: imageUrl
    });

    if (error) {
      alert("Failed to share memory: " + error.message);
    } else {
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

  async function handleDeleteMemory(mem: any) {
    const canDelete = isPrivileged || mem.member_id === profile?.id;
    if (!canDelete) {
      alert("You can only delete your own memories.");
      return;
    }

    if (!confirm("Delete this memory message?")) return;

    const { error } = await supabase.from("memories").delete().eq("id", mem.id);
    if (error) alert("Error deleting: " + error.message);
    else fetchData();
  }

  // Generate distinct chat bubble accent colors based on member ID string
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "feed" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Chat Feed ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Post Memory
          </button>
        </div>
      </div>

      {/* TAB 1: WHATSAPP-STYLE CHAT FEED */}
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
              return (
                <div key={mem.id} className={`neo-flat rounded-2xl p-4 space-y-3 border ${theme.border} ${theme.bg}`}>
                  {/* Author Header & Delete Option */}
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

                    {canModify && (
                      <button
                        onClick={() => handleDeleteMemory(mem)}
                        className="p-1.5 neo-btn rounded-lg text-rose-500 hover:scale-105 transition-all"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Event & Date Tag */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${theme.tag}`}>
                      <Tag className="w-3 h-3" /> {mem.event_title}
                    </span>
                    <span className="text-[9px] opacity-40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {mem.memory_date}
                    </span>
                  </div>

                  {/* Native Aspect Ratio Image Attachment */}
                  {mem.image_url && (
                    <div className="rounded-xl overflow-hidden neo-pressed flex justify-center bg-black/10">
                      <img 
                        src={mem.image_url} 
                        alt="Memory Attachment" 
                        className="w-auto h-auto max-w-full max-h-[450px] object-contain rounded-lg" 
                      />
                    </div>
                  )}

                  {/* Description Message */}
                  <p className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">{mem.description}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: POST NEW MEMORY FORM */}
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

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Caption / Story *</label>
            <textarea
              required
              rows={4}
              placeholder="Write your message..."
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
              className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Message"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}