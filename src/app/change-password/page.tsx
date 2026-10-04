"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, Mail, KeyRound, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [srmEmail, setSrmEmail] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!/^\d{4}$/.test(aadhaarLast4)) {
      setError("Verification code requires exactly 4 digits.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srmEmail: srmEmail.trim(),
          aadhaarLast4: aadhaarLast4.trim(),
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="w-full max-w-sm p-8 rounded-[2.5rem] neo-flat text-center space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 mx-auto rounded-full neo-pressed flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gradient">Password Updated!</h2>
            <p className="text-xs opacity-70 leading-relaxed mt-1">
              Your account password has been successfully updated. You can now log in with your new credentials.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block w-full py-3.5 neo-btn-green text-xs uppercase tracking-widest font-extrabold rounded-xl"
          >
            Proceed to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)] text-[var(--text-main)] font-sans">
      <div className="w-full max-w-sm p-8 rounded-[2.5rem] neo-flat backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl neo-pressed flex items-center justify-center p-3 mb-4">
            <Image src="/gfg.png" alt="GFG" width={40} height={40} className="object-contain drop-shadow-md" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gradient">Reset Password</h1>
          <p className="text-[10px] font-bold opacity-60 text-center mt-1 uppercase tracking-widest">
            Identity Verification Recovery
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-500 bg-rose-500/10 rounded-xl neo-pressed border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest opacity-70 px-2">
              SRM Mail ID *
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="email"
                required
                value={srmEmail}
                onChange={(e) => setSrmEmail(e.target.value)}
                placeholder="xx1234@srmist.edu.in"
                className="w-full pl-11 pr-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none bg-transparent font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest opacity-70 px-2">
              Verification Code (Last 4 Digits) *
            </label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                required
                maxLength={4}
                pattern="\d{4}"
                title="Exactly 4 digits"
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value)}
                placeholder="XXXX"
                className="w-full pl-11 pr-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none bg-transparent font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest opacity-70 px-2">
              New Password *
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-11 pr-4 py-3 neo-pressed rounded-xl text-xs focus:outline-none bg-transparent font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl neo-btn-green font-extrabold uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-2 cursor-pointer shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password Now"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[10px] font-bold opacity-60 hover:opacity-100 flex items-center justify-center gap-1 hover:text-emerald-500 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}