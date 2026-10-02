"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Upload, ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const TIME_SLOTS = [
  "8:00 - 8:50", "8:50 - 9:40", "9:45 - 10:35", "10:40 - 11:30", "11:35 - 12:25", 
  "12:30 - 1:20", "1:25 - 2:15", "2:20 - 3:10", "3:10 - 4:00", "4:00 - 4:50"
];

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields State
  const [fullName, setFullName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [srmEmail, setSrmEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [domain, setDomain] = useState("technical");
  const [position, setPosition] = useState("member");
  const [batch, setBatch] = useState("1");
  const [tagline, setTagline] = useState("");

  // Faculty Advisor Details
  const [faName, setFaName] = useState("");
  const [faEmail, setFaEmail] = useState("");
  const [faPhone, setFaPhone] = useState("");

  // Social Links
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Timetable State: Map of Day Order (1-5) -> Array of selected slots
  const [timetable, setTimetable] = useState<Record<number, string[]>>({
    1: [], 2: [], 3: [], 4: [], 5: []
  });

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const toggleTimeSlot = (dayOrder: number, slot: string) => {
    setTimetable((prev) => {
      const currentSlots = prev[dayOrder] || [];
      const updatedSlots = currentSlots.includes(slot)
        ? currentSlots.filter((s) => s !== slot)
        : [...currentSlots, slot];
      return { ...prev, [dayOrder]: updatedSlots };
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Sign up user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: srmEmail,
      password: password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create authentication user. Please try again.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;
    let avatarPath = "";

    // 2. Upload Profile Picture to Supabase Storage (if selected)
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `avatars/${userId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photoFile, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarPath = publicUrlData.publicUrl;
      }
    }

    // 3. Insert Public Profile Entry (Status = 'pending')
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      reg_number: regNumber,
      srm_email: srmEmail,
      department: department,
      batch: parseInt(batch),
      role: position.toLowerCase().replace(" ", "_"),
      domain: domain.toLowerCase(),
      linkedin_url: linkedinUrl,
      instagram_url: instagramUrl,
      github_url: githubUrl,
      tagline: tagline,
      avatar_path: avatarPath,
      status: "pending",
      must_change_password: false,
    });

    if (profileError) {
      setError("Account created, but profile setup failed: " + profileError.message);
      setLoading(false);
      return;
    }

    // 4. Insert Sensitive Private Profile Entry
    await supabase.from("profile_private").insert({
      profile_id: userId,
      phone: phone,
      personal_email: personalEmail,
      fa_name: faName,
      fa_phone: faPhone,
      fa_email: faEmail,
    });

    // 5. Insert Timetable Free Slots Entries
    const timetableInserts = Object.entries(timetable).map(([dayOrder, slots]) => ({
      profile_id: userId,
      day_order: parseInt(dayOrder),
      free_slots: slots,
    }));

    await supabase.from("timetable_slots").insert(timetableInserts);

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="w-full max-w-sm p-8 neo-flat rounded-[2.5rem] text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 mx-auto rounded-full neo-pressed flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Application Received</h2>
            <p className="text-xs font-medium opacity-70 mt-2 leading-relaxed">
              Your onboarding request is pending approval by the President or Secretary. You can sign in once approved.
            </p>
          </div>
          <Link href="/" className="inline-block w-full py-3 neo-btn-green text-xs uppercase tracking-widest font-extrabold rounded-xl">
            Return to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col p-2 md:p-4 overflow-hidden bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-4 pb-2 shrink-0 z-20 border-b border-[var(--text-muted)]/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 neo-pressed rounded-xl flex items-center justify-center p-1.5">
            <Image src="/gfg.png" alt="GFG" width={24} height={24} className="object-contain" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-gradient">GeeksforGeeks SRMIST</h1>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Core Team Onboarding Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-bold opacity-60 hover:opacity-100 hover:text-emerald-500 transition-colors">Cancel</Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Bento Grid Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-4">
        {error && (
          <div className="w-full max-w-7xl mx-auto mt-3 p-3 text-xs text-rose-500 bg-rose-500/10 rounded-xl neo-pressed border border-rose-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="w-full max-w-7xl mx-auto mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in slide-in-from-bottom-3 duration-300">
          
          {/* Column 1: Personal & Account Credentials */}
          <div className="lg:col-span-4 neo-flat rounded-[2rem] p-5 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-1">1. Member Credentials</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <InputBlock label="Full Name *" type="text" value={fullName} onChange={setFullName} placeholder="John Doe" className="col-span-2" />
              <InputBlock label="Reg Number *" type="text" value={regNumber} onChange={setRegNumber} placeholder="RA2311003010xxx" />
              <InputBlock label="Department *" type="text" value={department} onChange={setDepartment} placeholder="CSE (Core)" />
              <InputBlock label="SRM Mail ID *" type="email" value={srmEmail} onChange={setSrmEmail} placeholder="xx1234@srmist.edu.in" className="col-span-2" />
              <InputBlock label="Password *" type="password" value={password} onChange={setPassword} placeholder="••••••••" className="col-span-2" />
              <InputBlock label="Personal Email *" type="email" value={personalEmail} onChange={setPersonalEmail} placeholder="john@gmail.com" />
              <InputBlock label="Phone Number *" type="tel" value={phone} onChange={setPhone} placeholder="+91 9876543210" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <SelectBlock label="Domain *" value={domain} onChange={setDomain} options={["Technical", "Events", "Creatives"]} />
              <SelectBlock label="Position *" value={position} onChange={setPosition} options={["President", "Secretary", "Joint Secretary", "Domain Director", "Associate Lead", "Member"]} />
              <SelectBlock label="Batch *" value={batch} onChange={setBatch} options={["1", "2"]} className="col-span-2" />
            </div>
            <InputBlock label="One-line Tagline *" type="text" value={tagline} onChange={setTagline} placeholder="Building real-world software." className="pt-1" />
          </div>

          {/* Column 2: Photo Upload, FA & Social Profiles */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Photo Card */}
            <div className="neo-flat rounded-[2rem] p-4 flex gap-4 items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 shrink-0 neo-pressed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:ring-2 ring-emerald-500/50 transition-all overflow-hidden relative group"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">Change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-emerald-500 mb-1" />
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Upload</span>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" />
              </div>
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Profile Image</h3>
                <p className="text-[10px] opacity-60 mt-1 leading-snug">Professional headshot.<br/>PNG/JPEG format.<br/>Max 5MB.</p>
              </div>
            </div>

            {/* FA & Social Profiles Card */}
            <div className="neo-flat rounded-[2rem] p-5 space-y-3 flex-1">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-1">2. FA & Social Handles</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <InputBlock label="Faculty Advisor Name *" type="text" value={faName} onChange={setFaName} placeholder="Dr. Jane Smith" className="col-span-2" />
                <InputBlock label="FA Email *" type="email" value={faEmail} onChange={setFaEmail} placeholder="fa@srmist.edu.in" />
                <InputBlock label="FA Phone *" type="tel" value={faPhone} onChange={setFaPhone} placeholder="+91..." />
                <InputBlock label="LinkedIn Profile *" type="url" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/..." className="col-span-2 pt-1" />
                <InputBlock label="GitHub Profile" type="url" value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/..." required={false} />
                <InputBlock label="Instagram Profile *" type="url" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </div>

          {/* Column 3: Timetable Free Slot Matrix */}
          <div className="lg:col-span-4 neo-flat rounded-[2rem] p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-1">3. Timetable Free Slots</h3>
              <p className="text-[10px] opacity-60 mt-0.5 px-1">Select all slots where you have no classes.</p>
              
              <div className="mt-3 overflow-y-auto max-h-[380px] custom-scrollbar pr-1 space-y-2.5">
                {[1, 2, 3, 4, 5].map((dayOrder) => (
                  <div key={dayOrder} className="neo-pressed rounded-xl p-2.5 border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block mb-1.5">Day Order {dayOrder}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOTS.map((slot) => {
                        const isSelected = timetable[dayOrder]?.includes(slot);
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => toggleTimeSlot(dayOrder, slot)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all select-none ${
                              isSelected
                                ? "neo-pressed text-emerald-500 border border-emerald-500/30"
                                : "neo-btn opacity-60 hover:opacity-100"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 neo-btn-green rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Onboarding <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}

function InputBlock({ label, type, value, onChange, placeholder, required = true, className = "" }: any) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 px-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent transition-all font-medium placeholder:opacity-30"
      />
    </div>
  );
}

function SelectBlock({ label, value, onChange, options, className = "" }: any) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <label className="text-[9px] font-bold uppercase tracking-widest opacity-60 px-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 neo-pressed rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent transition-all font-medium appearance-none"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt.toLowerCase()} className="bg-[var(--bg-surface)] text-[var(--text-main)]">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}