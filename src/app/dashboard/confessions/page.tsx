"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquareHeart, Plus, CheckCircle2, XCircle, ShieldCheck, Loader2, Trash2, EyeOff, Sparkles, Flame, Laugh, Heart, Globe } from "lucide-react";

export default function ConfessionsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "submit" | "moderation">("feed");

  // Submission Form State
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);

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

    const { data: confData } = await supabase
      .from("confessions")
      .select("*")
      .order("created_at", { ascending: false });

    setConfessions(confData || []);
    setLoading(false);
  }

  const isExecutiveAdmin = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);

  async function handleSubmitConfession(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("confessions").insert({
      message: message.trim(),
      category,
      status: "pending"
    });

    if (error) {
      alert("Failed to submit confession: " + error.message);
    } else {
      alert("Anonymous confession submitted successfully! It will appear on the feed after admin approval.");
      setMessage("");
      setActiveTab("feed");
      fetchData();
    }
    setSubmitting(false);
  }

  async function handleUpdateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("confessions")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      fetchData();
    }
  }

  async function handleDeleteConfession(id: string) {
    if (!confirm("Are you sure you want to delete this confession?")) return;
    const { error } = await supabase.from("confessions").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    else fetchData();
  }

  // Category Styling Helper
  const getCategoryTheme = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "campus life":
        return {
          border: "border-blue-500/30 hover:border-blue-500/50",
          bg: "bg-blue-500/5",
          badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: <Globe className="w-3.5 h-3.5 text-blue-400" />
        };
      case "tech & hackathons":
        return {
          border: "border-emerald-500/30 hover:border-emerald-500/50",
          bg: "bg-emerald-500/5",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        };
      case "funny":
        return {
          border: "border-amber-500/30 hover:border-amber-500/50",
          bg: "bg-amber-500/5",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: <Laugh className="w-3.5 h-3.5 text-amber-400" />
        };
      case "secret crush":
        return {
          border: "border-rose-500/30 hover:border-rose-500/50",
          bg: "bg-rose-500/5",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          icon: <Heart className="w-3.5 h-3.5 text-rose-400" />
        };
      default:
        return {
          border: "border-purple-500/30 hover:border-purple-500/50",
          bg: "bg-purple-500/5",
          badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          icon: <Flame className="w-3.5 h-3.5 text-purple-400" />
        };
    }
  };

  const approvedConfessions = confessions.filter((c) => c.status === "approved");
  const pendingConfessions = confessions.filter((c) => c.status === "pending");

  return (
    <div className="space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Anonymous Confessions</h2>
            <p className="text-xs font-semibold opacity-60">Share thoughts anonymously. Fully confidential and moderated by executives.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "feed" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Confessions Feed ({approvedConfessions.length})
          </button>
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "submit" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Submit Anonymous
          </button>
          {isExecutiveAdmin && (
            <button
              onClick={() => setActiveTab("moderation")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "moderation" ? "neo-pressed text-amber-500" : "neo-btn text-amber-500"}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Moderation ({pendingConfessions.length})
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: APPROVED CONFESSIONS FEED */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : approvedConfessions.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <EyeOff className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No confessions approved yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedConfessions.map((conf) => {
                const theme = getCategoryTheme(conf.category);
                return (
                  <div key={conf.id} className={`neo-flat rounded-2xl p-6 space-y-4 relative flex flex-col justify-between border ${theme.border} ${theme.bg} transition-all`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border flex items-center gap-1.5 ${theme.badge}`}>
                          {theme.icon} {conf.category || "General"}
                        </span>
                        <span className="text-[10px] opacity-40 font-mono">{new Date(conf.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed italic opacity-95">"{conf.message}"</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] opacity-50">
                      <span className="flex items-center gap-1 font-bold text-emerald-500/80"><EyeOff className="w-3 h-3" /> Anonymous Member</span>
                      {isExecutiveAdmin && (
                        <button
                          onClick={() => handleDeleteConfession(conf.id)}
                          className="p-1.5 rounded-lg text-rose-500 neo-btn hover:scale-105 transition-all"
                          title="Delete Confession"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT ANONYMOUS CONFESSION */}
      {activeTab === "submit" && (
        <form onSubmit={handleSubmitConfession} className="neo-flat rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <EyeOff className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Anonymous Confession Box</h3>
          </div>
          <p className="text-[10px] opacity-60">Your identity is completely hidden. No profile, user ID, or logs are attached to your message.</p>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Category Theme</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="General" className="bg-[var(--bg-surface)]">💬 General Confession</option>
              <option value="Campus Life" className="bg-[var(--bg-surface)]">🏛️ Campus Life & SRM</option>
              <option value="Tech & Hackathons" className="bg-[var(--bg-surface)]">⚡ Tech & Hackathons</option>
              <option value="Funny" className="bg-[var(--bg-surface)]">😂 Funny & Memes</option>
              <option value="Secret Crush" className="bg-[var(--bg-surface)]">❤️ Secret Crush / Appreciation</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Your Confession *</label>
            <textarea
              required
              rows={5}
              placeholder="Write your anonymous confession here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
            />
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Confession Anonymously</>}
          </button>
        </form>
      )}

      {/* TAB 3: ADMIN MODERATION QUEUE */}
      {activeTab === "moderation" && isExecutiveAdmin && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 px-1">Confessions Moderation Queue</h3>

          {pendingConfessions.length === 0 ? (
            <div className="neo-flat rounded-2xl p-10 text-center opacity-50 text-xs">No pending confessions to review.</div>
          ) : (
            <div className="space-y-3">
              {pendingConfessions.map((conf) => {
                const theme = getCategoryTheme(conf.category);
                return (
                  <div key={conf.id} className="neo-pressed rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border inline-flex items-center gap-1 ${theme.badge}`}>
                        {theme.icon} {conf.category}
                      </span>
                      <p className="text-xs font-medium italic pt-1">"{conf.message}"</p>
                      <p className="text-[9px] opacity-40">Submitted: {new Date(conf.created_at).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateStatus(conf.id, "approved")}
                        className="px-3 py-2 neo-btn-green rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(conf.id, "rejected")}
                        className="px-3 py-2 neo-btn rounded-xl text-rose-500 text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}