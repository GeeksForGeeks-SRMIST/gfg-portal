"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    }
    
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 rounded-[2rem] neo-flat backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl neo-pressed flex items-center justify-center p-3 mb-4">
            <Image src="/gfg.png" alt="GFG" width={40} height={40} className="object-contain drop-shadow-md" />
          </div>
          <h1 className="text-xl font-heading font-extrabold tracking-tight text-gradient">Set New Password</h1>
          <p className="text-xs font-semibold opacity-60 text-center mt-1 uppercase tracking-widest">Secure your account</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-500 bg-rose-500/10 rounded-xl neo-pressed border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-70 px-2">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 neo-pressed rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent transition-all font-medium"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl neo-btn-green font-heading font-extrabold uppercase tracking-widest text-xs flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}