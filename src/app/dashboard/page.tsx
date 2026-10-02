// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, KeyRound, Mail, AlertCircle, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isResetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/change-password`,
      });
      if (error) setError(error.message);
      else setMessage("Password reset link sent to your SRM email.");
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("must_change_password").single();
    if (profile?.must_change_password) router.push("/change-password");
    else router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 rounded-3xl neo-flat space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full neo-flat text-[var(--gfg-green)] mb-4">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--gfg-green)]">GFG SRMIST</h1>
          <p className="text-sm font-medium opacity-70">Internal Team Dashboard</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-500 rounded-xl neo-pressed">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 p-3 text-sm text-[var(--gfg-green)] rounded-xl neo-pressed">
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 px-1">SRM Mail ID</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl neo-pressed focus:outline-none focus:ring-2 focus:ring-[var(--gfg-green)] bg-transparent"
                placeholder="xx1234@srmist.edu.in"
              />
            </div>
          </div>

          {!isResetMode && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 px-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl neo-pressed focus:outline-none focus:ring-2 focus:ring-[var(--gfg-green)] bg-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl neo-btn-green font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isResetMode ? "Send Reset Link" : "Sign In")}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => setIsResetMode(!isResetMode)} className="text-xs font-bold opacity-70 hover:text-[var(--gfg-green)] transition-colors">
            {isResetMode ? "Back to Login" : "Forgot Password?"}
          </button>
        </div>
      </div>
    </main>
  );
}