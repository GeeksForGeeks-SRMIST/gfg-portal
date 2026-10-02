import { createClient } from '@supabase/supabase-js';
import { Search, Github, Instagram, Linkedin, Mail } from 'lucide-react';

// Use server-side client with Service Role or Anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Member {
  full_name: string;
  email: string;
  reg_number: string;
  role: string;
  domain: string;
  phone?: string;
  personal_email?: string;
  department?: string;
  linkedin_link?: string;
  github_link?: string;
  instagram_link?: string;
  batch?: string;
  avatar_path?: string;
  tagline?: string;
  total_points: number;
}

async function getMembers(): Promise<Member[]> {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables!');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('club_members')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Supabase fetch error:', error.message);
    return [];
  }

  return data || [];
}

export default async function MembersPage() {
  const members = await getMembers();

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'president':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'secretary':
      case 'joint_secretary':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'domain_director':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'associate_lead':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              GeeksforGeeks <span className="text-emerald-500">SRMIST</span> Directory
            </h1>
            <p className="text-zinc-400 mt-1">
              Explore the brilliant minds, leaders, and creators driving our community forward.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm font-medium text-zinc-300">
            Total Members: <span className="text-emerald-400 font-bold">{members.length}</span>
          </div>
        </div>

        {/* Members Grid */}
        {members.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl">
            <p className="text-zinc-400 text-lg">No members found or failed to load from database. Check your terminal for errors.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member, index) => (
              <div
                key={index}
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Avatar & Role */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="relative">
                      <img
                        src={member.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={member.full_name}
                        className="w-16 h-16 rounded-2xl object-cover border border-zinc-700 bg-zinc-800 group-hover:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRoleBadgeColor(member.role)}`}>
                        {member.role?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2.5 py-0.5 rounded-md border border-zinc-700/50">
                        {member.domain}
                      </span>
                    </div>
                  </div>

                  {/* Name & Department */}
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {member.full_name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">{member.reg_number}</p>
                    <p className="text-xs text-zinc-300 mt-1 font-medium line-clamp-1">{member.department}</p>
                  </div>

                  {/* Tagline */}
                  {member.tagline && (
                    <blockquote className="mt-3 text-xs text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
                      &ldquo;{member.tagline}&rdquo;
                    </blockquote>
                  )}
                </div>

                {/* Footer Links & Points */}
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-400">
                    {member.linkedin_link && member.linkedin_link.startsWith('http') && (
                      <a href={member.linkedin_link} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {member.github_link && member.github_link.startsWith('http') && (
                      <a href={member.github_link} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {member.instagram_link && member.instagram_link.startsWith('http') && (
                      <a href={member.instagram_link} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    <a href={`mailto:${member.email}`} className="hover:text-emerald-400 transition-colors">
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Batch {member.batch || '1'}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}