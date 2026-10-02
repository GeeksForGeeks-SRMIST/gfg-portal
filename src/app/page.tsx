"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Mail, AlertCircle, Loader2, Clock, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setIsPendingApproval(false);

    // ----------------------------------------------------
    // Custom Identity-Verified Reset Mode (Using Aadhaar 4 digits)
    // ----------------------------------------------------
    if (isResetMode) {
      if (!/^\d{4}$/.test(aadhaarLast4)) {
        setError("Please enter exactly the last 4 digits of your Aadhaar.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin-reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            srmEmail: email, 
            aadhaarLast4: aadhaarLast4, 
            newPassword 
          }),
        });

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          throw new Error("Server returned an invalid response.");
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to update password.");
        }

        setMessage("Password updated successfully! You can now sign in.");
        setIsResetMode(false);
        setPassword("");
        setNewPassword("");
        setAadhaarLast4("");
      } catch (err: any) {
        setError(err.message || "Failed to verify identity or update password.");
      }
      setLoading(false);
      return;
    }

    // ----------------------------------------------------
    // Standard Login Mode
    // ----------------------------------------------------
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status, must_change_password")
      .eq("id", authData.user.id)
      .single();

    if (profile?.status === "pending") {
      setIsPendingApproval(true);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile?.status === "rejected") {
      setError("Your application was not approved by the admin team.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile?.must_change_password) {
      router.push("/change-password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-base)]">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm p-7 rounded-[2rem] neo-flat space-y-6 animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl neo-pressed p-3 mb-1">
            <Image src="/gfg.png" alt="GeeksforGeeks Logo" width={48} height={48} className="object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">GeeksforGeeks</h1>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">SRMIST Core Portal</p>
        </div>

        {isPendingApproval && (
          <div className="p-4 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-2xl neo-pressed border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Approval Pending</span>
            </div>
            <p className="opacity-80 leading-relaxed">Your registration is waiting for review by the President or Secretary.</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-500 rounded-xl neo-pressed animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 dark:text-emerald-400 rounded-xl neo-pressed animate-in slide-in-from-top-2">
            <span className="font-medium">{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1">SRM Mail ID</label>
            <div className="relative group">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl neo-pressed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent text-xs transition-all font-medium placeholder:opacity-40"
                placeholder="xx1234@srmist.edu.in"
              />
            </div>
          </div>

          {!isResetMode ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1">Password</label>
              <div className="relative group">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl neo-pressed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent text-xs transition-all font-medium placeholder:opacity-40"
                  placeholder="••••••••"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1">Identity Verification</label>
                <div className="relative group">
                  <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    title="Please enter exactly 4 digits"
                    value={aadhaarLast4}
                    onChange={(e) => setAadhaarLast4(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl neo-pressed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent text-xs transition-all font-medium placeholder:opacity-40"
                    placeholder="Aadhaar Last 4 Digits (XXXX)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1">New Password</label>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl neo-pressed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent text-xs transition-all font-medium placeholder:opacity-40"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl neo-btn-green font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isResetMode ? "Verify & Update Password" : "Sign In")}
          </button>
        </form>

        <div className="flex flex-col gap-3 text-center pt-1 border-t border-[var(--text-muted)]/15">
          <button 
            type="button" 
            onClick={() => { 
              setIsResetMode(!isResetMode); 
              setError(null); 
              setMessage(null); 
            }} 
            className="text-[11px] font-bold opacity-60 hover:opacity-100 hover:text-emerald-500 transition-all"
          >
            {isResetMode ? "Back to Login" : "Forgot Password?"}
          </button>
          
          <p className="text-[11px] font-medium opacity-70">
            New Core Member?{" "}
            <Link href="/signup" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
              Onboard Here <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}