"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Award, 
  Send, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  Trash2, 
  UserPlus, 
  ShieldAlert,
  Lock,
  Sparkles,
  TrendingDown,
  User
} from "lucide-react";

export default function TasksPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"assigned" | "submissions" | "ledger" | "create" | "bonus" | "penalty">("assigned");

  // Re-assign Task Modal State
  const [reassignTask, setReassignTask] = useState<any>(null);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Submission Form State (Member)
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submittingWork, setSubmittingWork] = useState(false);

  // Review Form State (Lead)
  const [reviewingSubmission, setReviewingSubmission] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [processingReview, setProcessingReview] = useState(false);

  // New Task Creation State (Lead)
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPoints, setTaskPoints] = useState(100);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Executive Bonus Points State
  const [bonusMemberId, setBonusMemberId] = useState("");
  const [bonusPoints, setBonusPoints] = useState(50);
  const [bonusReason, setBonusReason] = useState("");
  const [awardingBonus, setAwardingBonus] = useState(false);

  // Presidential Penalty State
  const [penaltyMemberId, setPenaltyMemberId] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState(50);
  const [penaltyReason, setPenaltyReason] = useState("");
  const [issuingPenalty, setIssuingPenalty] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("tasks_realtime_full")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchPageData())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => fetchPageData())
      .on("postgres_changes", { event: "*", schema: "public", table: "points_ledger" }, () => fetchPageData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRoleRank = (roleStr: string) => {
    const ranks: Record<string, number> = {
      president: 1,
      secretary: 2,
      joint_secretary: 3,
      domain_director: 4,
      associate_lead: 5,
      member: 6
    };
    return ranks[roleStr] || 6;
  };

  const canReviewSubmission = (reviewerRole: string, submitterRole: string) => {
    return getRoleRank(reviewerRole) < getRoleRank(submitterRole);
  };

  async function fetchPageData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(pData);

    const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(pData?.role);

    let taskQuery = supabase.from("tasks").select("*, assigned_member:profiles!tasks_assigned_to_fkey(full_name, domain, role), assigner:profiles!tasks_assigned_by_fkey(full_name, role)").order("created_at", { ascending: false });
    if (!isLead) {
      taskQuery = taskQuery.eq("assigned_to", user.id);
    }
    const { data: tData } = await taskQuery;
    setTasks(tData || []);

    const { data: subData } = await supabase
      .from("task_submissions")
      .select("*, task:tasks(*), member:profiles!task_submissions_member_id_fkey(full_name, domain, role)")
      .order("created_at", { ascending: false });
    setSubmissions(subData || []);

    const { data: lData } = await supabase
      .from("points_ledger")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });
    setLedger(lData || []);

    const { data: mData } = await supabase.from("profiles").select("id, full_name, domain, role").eq("status", "approved");
    setMembers(mData || []);

    setLoading(false);
  }

  async function handleAwardBonus(e: React.FormEvent) {
    e.preventDefault();
    if (!bonusMemberId || !bonusPoints || !bonusReason) return;
    setAwardingBonus(true);

    const { error } = await supabase.from("points_ledger").insert({
      profile_id: bonusMemberId,
      points_awarded: parseInt(bonusPoints.toString()),
      reason: `✨ Executive Bonus (${profile?.role?.replace('_', ' ').toUpperCase() || 'Lead'}): ${bonusReason}`
    });

    if (error) {
      alert("Error awarding bonus points: " + error.message);
      setAwardingBonus(false);
      return;
    }

    await supabase.from("notifications").insert({
      title: `✨ Executive Bonus Awarded: +${bonusPoints} PTS!`,
      message: `Reason: "${bonusReason}" — Awarded by ${profile?.full_name}`,
      target_user_id: bonusMemberId,
      type: "reminder"
    });

    setBonusMemberId("");
    setBonusPoints(50);
    setBonusReason("");
    setAwardingBonus(false);
    setActiveTab("assigned");
    alert("Executive bonus points awarded successfully!");
  }

  async function handleIssuePenalty(e: React.FormEvent) {
    e.preventDefault();
    if (!penaltyMemberId || !penaltyPoints || !penaltyReason) return;
    setIssuingPenalty(true);

    const deductionVal = -Math.abs(parseInt(penaltyPoints.toString()));

    const { error } = await supabase.from("points_ledger").insert({
      profile_id: penaltyMemberId,
      points_awarded: deductionVal,
      reason: `⚠️ Presidential Penalty: ${penaltyReason}`
    });

    if (error) {
      alert("Error issuing penalty: " + error.message);
      setIssuingPenalty(false);
      return;
    }

    await supabase.from("notifications").insert({
      title: `⚠️ Points Deducted: ${deductionVal} PTS`,
      message: `Reason: "${penaltyReason}" — Issued by President ${profile?.full_name}`,
      target_user_id: penaltyMemberId,
      type: "reminder"
    });

    setPenaltyMemberId("");
    setPenaltyPoints(50);
    setPenaltyReason("");
    setIssuingPenalty(false);
    setActiveTab("assigned");
    alert("Penalty applied and points deducted successfully.");
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle || !taskAssignee || !taskDeadline) return;
    setCreatingTask(true);

    const targetMember = members.find(m => m.id === taskAssignee);
    if (targetMember && !canReviewSubmission(profile.role, targetMember.role)) {
      alert(`Hierarchy Restriction: You cannot assign tasks to a member with an equal or higher rank (${targetMember.role}).`);
      setCreatingTask(false);
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title: taskTitle,
      description: taskDesc,
      assigned_to: taskAssignee,
      assigned_by: profile.id,
      points: taskPoints || 100,
      deadline: taskDeadline,
      status: "pending"
    });

    if (error) {
      alert("Error creating task: " + error.message);
      setCreatingTask(false);
      return;
    }

    await supabase.from("notifications").insert({
      title: `📋 New Task Assigned: ${taskTitle}`,
      message: `You were assigned a deliverable worth ${taskPoints} PTS by ${profile?.full_name}.`,
      target_user_id: taskAssignee,
      type: "task"
    });

    setTaskTitle("");
    setTaskDesc("");
    setTaskAssignee("");
    setTaskPoints(100);
    setTaskDeadline("");
    setCreatingTask(false);
    setActiveTab("assigned");
    fetchPageData();
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchPageData();
  }

  async function handleReassignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignTask || !newAssigneeId) return;
    setIsReassigning(true);

    await supabase.from("tasks").update({ assigned_to: newAssigneeId }).eq("id", reassignTask.id);

    await supabase.from("notifications").insert({
      title: `📋 Task Re-assigned: ${reassignTask.title}`,
      message: `A deliverable was re-assigned to you by ${profile?.full_name}.`,
      target_user_id: newAssigneeId,
      type: "task"
    });

    setReassignTask(null);
    setNewAssigneeId("");
    setIsReassigning(false);
    fetchPageData();
  }

  async function handleSubmitTaskWork(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask || !submissionLink) return;
    setSubmittingWork(true);

    await supabase.from("task_submissions").insert({
      task_id: selectedTask.id,
      member_id: profile.id,
      submission_link: submissionLink,
      notes: submissionNotes,
      status: "pending_review"
    });

    setSubmissionLink("");
    setSubmissionNotes("");
    setSelectedTask(null);
    setSubmittingWork(false);
    fetchPageData();
    alert("Task deliverable submitted for review!");
  }

  async function handleReviewSubmission(submission: any, status: "approved" | "rejected") {
    if (!canReviewSubmission(profile.role, submission.member?.role)) {
      alert(`Hierarchy Protection: As a ${profile.role.replace("_", " ")}, you cannot approve deliverables submitted by a ${submission.member?.role?.replace("_", " ")}.`);
      return;
    }

    setProcessingReview(true);

    await supabase.from("task_submissions").update({
      status,
      reviewed_by: profile.id,
      review_comment: reviewComment
    }).eq("id", submission.id);

    if (status === "approved") {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", submission.task_id);

      await supabase.from("points_ledger").insert({
        profile_id: submission.member_id,
        points_awarded: submission.task?.points || 100,
        reason: `Completed Task: ${submission.task?.title || 'Deliverable'}`
      });

      await supabase.from("notifications").insert({
        title: `🎉 Task Approved! +${submission.task?.points || 100} PTS`,
        message: `Your deliverable for "${submission.task?.title}" was approved by ${profile.full_name}.`,
        target_user_id: submission.member_id,
        type: "task"
      });
    }

    setReviewingSubmission(null);
    setReviewComment("");
    setProcessingReview(false);
    fetchPageData();
  }

  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);
  const isExecutiveLead = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);
  const isPresident = profile?.role === 'president';
  const myTotalPoints = ledger.reduce((acc, item) => acc + item.points_awarded, 0);

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gradient">Tasks & Points Ledger</h2>
            <p className="text-xs font-semibold opacity-60">Deliverable management, proof submissions, and earned contribution points.</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("assigned")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "assigned" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Tasks ({tasks.length})
          </button>
          
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "submissions" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Submissions Queue
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "ledger" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
          >
            Points History
          </button>

          {isLead && (
            <button
              onClick={() => setActiveTab("create")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
            >
              <Plus className="w-3.5 h-3.5" /> Assign Task
            </button>
          )}

          {isExecutiveLead && (
            <button
              onClick={() => setActiveTab("bonus")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "bonus" ? "neo-pressed text-amber-500" : "neo-btn text-amber-500"}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Award Bonus
            </button>
          )}

          {isPresident && (
            <button
              onClick={() => setActiveTab("penalty")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "penalty" ? "neo-pressed text-rose-500" : "neo-btn text-rose-500"}`}
            >
              <TrendingDown className="w-3.5 h-3.5" /> Deduct Points
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Task Directory */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : tasks.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No active tasks found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div key={task.id} className="neo-flat rounded-2xl p-6 flex flex-col justify-between space-y-4 relative overflow-hidden border border-white/5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-500">
                        +{task.points} PTS
                      </span>
                    </div>

                    <h3 className="text-sm font-bold pt-1">{task.title}</h3>
                    <p className="text-xs opacity-70 leading-relaxed line-clamp-3">{task.description}</p>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-[var(--text-muted)]/10">
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Deadline:</span>
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="opacity-50">Assigned To:</span>
                      <span className="text-emerald-500">{task.assigned_member?.full_name || "Unassigned"}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="opacity-50">Assigned By:</span>
                      <span className="text-amber-500">{task.assigner?.full_name || "Executive Board"}</span>
                    </div>

                    {!isLead && task.status === 'pending' && (
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="w-full py-2.5 neo-btn-green rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 mt-2"
                      >
                        <Send className="w-3 h-3" /> Submit Deliverable
                      </button>
                    )}

                    {isLead && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => { setReassignTask(task); setNewAssigneeId(task.assigned_to); }}
                          className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-1 hover:scale-105 transition-all"
                        >
                          <UserPlus className="w-3 h-3" /> Re-assign
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center justify-center gap-1 hover:scale-105 transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submissions Queue */}
      {activeTab === "submissions" && (
        <div className="neo-flat rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 px-1">Deliverables & Proof Logs</h3>
          
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-8">No submissions pending review.</p>
            ) : (
              submissions.map((sub) => {
                const canReview = isLead && canReviewSubmission(profile.role, sub.member?.role);
                return (
                  <div key={sub.id} className="neo-pressed rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{sub.task?.title || "Deliverable"}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          sub.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          sub.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {sub.status.replace("_", " ")}
                        </span>
                      </div>
                      
                      <p className="text-[10px] opacity-60">Submitted by <span className="text-emerald-500 font-bold">{sub.member?.full_name}</span></p>
                      {sub.notes && <p className="text-xs opacity-80 italic pt-1">"{sub.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={sub.submission_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 neo-btn rounded-xl text-xs font-bold text-emerald-500 flex items-center gap-1 hover:scale-105 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Deliverable
                      </a>

                      {isLead && sub.status === 'pending_review' && (
                        canReview ? (
                          <button
                            onClick={() => setReviewingSubmission(sub)}
                            className="px-4 py-2 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-wider"
                          >
                            Review Work
                          </button>
                        ) : (
                          <div className="px-3 py-2 neo-pressed rounded-xl text-[10px] font-bold text-amber-500 flex items-center gap-1 border border-amber-500/30">
                            <Lock className="w-3 h-3" /> Senior Approval Needed
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Points History Ledger */}
      {activeTab === "ledger" && (
        <div className="neo-flat rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--text-muted)]/10 pb-4 px-1">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Points History Ledger</h3>
              <p className="text-[10px] opacity-60">Credits awarded for task completions, executive bonuses, and penalties.</p>
            </div>
            <div className="neo-pressed px-5 py-3 rounded-2xl text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Total Ledger Points</p>
              <p className="text-xl font-black text-gradient">{myTotalPoints} PTS</p>
            </div>
          </div>

          <div className="space-y-2">
            {ledger.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-8">No ledger points recorded yet.</p>
            ) : (
              ledger.map((item) => {
                const isNegative = item.points_awarded < 0;
                return (
                  <div key={item.id} className="neo-pressed rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">{item.reason}</p>
                      <p className="text-[9px] opacity-40 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-mono font-black shrink-0 ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isNegative ? `${item.points_awarded} PTS` : `+${item.points_awarded} PTS`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Assign Task Form */}
      {activeTab === "create" && isLead && (
        <form onSubmit={handleCreateTask} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Assign Member Deliverable</h3>
          
          <input
            type="text"
            required
            placeholder="Task Title (e.g. Design Recruitment Posters, API Route Fix)"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />

          <select
            required
            value={taskAssignee}
            onChange={(e) => setTaskAssignee(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="" className="bg-[var(--bg-surface)]">-- Select Assignee Member --</option>
            {members.map(m => (
              <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                {m.full_name} ({m.domain} - {m.role})
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Reward Points</label>
              <input
                type="number"
                required
                value={taskPoints}
                onChange={(e) => setTaskPoints(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Deadline</label>
              <input
                type="datetime-local"
                required
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <textarea
            placeholder="Task requirements, Drive links, or instructions..."
            rows={4}
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
          />

          <button type="submit" disabled={creatingTask} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckSquare className="w-4 h-4" /> Assign Task & Send Alert</>}
          </button>
        </form>
      )}

      {/* TAB 5: Award Executive Bonus Points */}
      {activeTab === "bonus" && isExecutiveLead && (
        <form onSubmit={handleAwardBonus} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Award Executive Bonus Points</h3>
          </div>
          <p className="text-[10px] opacity-60">Grant extra points to any core member for exceptional initiative or standout contributions.</p>

          <select
            required
            value={bonusMemberId}
            onChange={(e) => setBonusMemberId(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
          >
            <option value="" className="bg-[var(--bg-surface)]">-- Select Member for Bonus --</option>
            {members.map(m => (
              <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                {m.full_name} ({m.domain} - {m.role})
              </option>
            ))}
          </select>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Bonus Points Value</label>
            <input
              type="number"
              required
              min={10}
              max={500}
              value={bonusPoints}
              onChange={(e) => setBonusPoints(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          <textarea
            required
            placeholder="Reason for bonus points..."
            rows={4}
            value={bonusReason}
            onChange={(e) => setBonusReason(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium custom-scrollbar resize-none"
          />

          <button type="submit" disabled={awardingBonus} className="w-full py-3.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2 border border-amber-500/30">
            {awardingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Award Bonus Points & Notify Member</>}
          </button>
        </form>
      )}

      {/* TAB 6: Presidential Penalty / Point Deduction */}
      {activeTab === "penalty" && isPresident && (
        <form onSubmit={handleIssuePenalty} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-500">
            <TrendingDown className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Presidential Point Penalty & Deduction</h3>
          </div>
          <p className="text-[10px] opacity-60">Deduct points from any member's ledger score for inactivity, policy violations, or unfulfilled responsibilities.</p>

          <select
            required
            value={penaltyMemberId}
            onChange={(e) => setPenaltyMemberId(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
          >
            <option value="" className="bg-[var(--bg-surface)]">-- Select Member for Deduction --</option>
            {members.map(m => (
              <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                {m.full_name} ({m.domain} - {m.role})
              </option>
            ))}
          </select>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Points to Deduct</label>
            <input
              type="number"
              required
              min={10}
              max={500}
              value={penaltyPoints}
              onChange={(e) => setPenaltyPoints(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium text-rose-500"
            />
          </div>

          <textarea
            required
            placeholder="Reason for point deduction (e.g. Unexcused absence from mandatory meeting)..."
            rows={4}
            value={penaltyReason}
            onChange={(e) => setPenaltyReason(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium custom-scrollbar resize-none"
          />

          <button type="submit" disabled={issuingPenalty} className="w-full py-3.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 border border-rose-500/30">
            {issuingPenalty ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TrendingDown className="w-4 h-4" /> Issue Penalty & Deduct Points</>}
          </button>
        </form>
      )}

      {/* Re-assign Task Modal */}
      {reassignTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReassignTask} className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Re-assign Deliverable</h3>
            <p className="text-xs font-bold">{reassignTask.title}</p>

            <select
              required
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Select New Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                  {m.full_name} ({m.domain})
                </option>
              ))}
            </select>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignTask(null)}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReassigning}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-amber-500 flex justify-center items-center gap-2 border border-amber-500/30"
              >
                {isReassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member Work Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitTaskWork} className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Submit Work: {selectedTask.title}</h3>
            
            <input
              type="url"
              required
              placeholder="Submission Link (GitHub PR, Google Drive, Figma...)"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <textarea
              placeholder="Notes for your lead..."
              rows={3}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingWork}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold flex justify-center items-center gap-2"
              >
                {submittingWork ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Work"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lead Review & Grade Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Review Deliverable</h3>
            
            <p className="text-xs font-bold">{reviewingSubmission.task?.title}</p>
            <p className="text-[10px] opacity-60">Submitted by {reviewingSubmission.member?.full_name}</p>

            <a
              href={reviewingSubmission.submission_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 neo-pressed rounded-xl text-xs text-emerald-500 font-bold truncate flex items-center justify-between"
            >
              <span className="truncate">{reviewingSubmission.submission_link}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "rejected")}
                disabled={processingReview}
                className="w-1/2 py-3 neo-btn text-rose-500 rounded-xl text-xs font-bold"
              >
                Request Revision
              </button>
              
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "approved")}
                disabled={processingReview}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold"
              >
                Approve & Award
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}