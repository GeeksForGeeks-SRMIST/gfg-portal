"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  Loader2, 
  Trash2, 
  UserPlus, 
  Lock,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Globe,
  Hand,
  User,
  Users,
  Bold,
  Italic,
  List,
  Code,
  Link as LinkIcon
} from "lucide-react";

export default function TasksPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic Tab State
  const [activeTab, setActiveTab] = useState<"assigned" | "submissions" | "completed" | "ledger" | "create" | "bonus" | "penalty">("assigned");

  // Filter Sub-tab for Leads: "my_tasks" vs "all_chapter_tasks"
  const [taskViewFilter, setTaskViewFilter] = useState<"my_tasks" | "all_chapter_tasks">("my_tasks");

  // Domain Filter States for Member Dropdowns
  const [taskDomainFilter, setTaskDomainFilter] = useState("all");
  const [bonusDomainFilter, setBonusDomainFilter] = useState("all");
  const [penaltyDomainFilter, setPenaltyDomainFilter] = useState("all");

  // Re-assign Task Modal State
  const [reassignTask, setReassignTask] = useState<any>(null);
  const [reassignDomainFilter, setReassignDomainFilter] = useState("all");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Claim Floating Task State
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  // Submission Form State (Member)
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submittingWork, setSubmittingWork] = useState(false);

  // Review Form State (Lead)
  const [reviewingSubmission, setReviewingSubmission] = useState<any>(null);
  const [processingReview, setProcessingReview] = useState(false);

  // New Task Creation State (Lead)
  const [taskType, setTaskType] = useState<"direct" | "floating">("direct");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [maxClaims, setMaxClaims] = useState<number>(3);
  const [taskPoints, setTaskPoints] = useState(10);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Executive Bonus Points State
  const [bonusMemberId, setBonusMemberId] = useState("");
  const [bonusCategory, setBonusCategory] = useState<string>("leadership");
  const [bonusReason, setBonusReason] = useState("");
  const [awardingBonus, setAwardingBonus] = useState(false);

  // Presidential Penalty State
  const [penaltyMemberId, setPenaltyMemberId] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState(10);
  const [penaltyReason, setPenaltyReason] = useState("");
  const [issuingPenalty, setIssuingPenalty] = useState(false);

  // Custom Modal States
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; taskId: string | null; title: string }>({
    isOpen: false, taskId: null, title: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false, message: ""
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Helper function to trigger push webhook api route
  async function triggerPushNotification(title: string, message: string, targetUserId: string | null = null, link: string = "/dashboard/tasks") {
    try {
      await fetch("/api/webhooks/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "31113426c2b78bb4e69ee212aed1141c7119852c36463ea372b00c2f086fde6b"}`,
        },
        body: JSON.stringify({
          record: {
            title,
            message,
            link,
            target_user_id: targetUserId
          }
        }),
      });
    } catch (err) {
      console.error("Failed to trigger push webhook:", err);
    }
  }

  async function fetchPageData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(pData);

    const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(pData?.role);

    let taskQuery = supabase
      .from("tasks")
      .select("*, assigned_member:profiles!tasks_assigned_to_fkey(full_name, domain, role), assigner:profiles!tasks_assigned_by_fkey(full_name, role)")
      .order("created_at", { ascending: false });

    if (!isLead) {
      taskQuery = taskQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
    }

    const { data: tData } = await taskQuery;
    setTasks(tData || []);

    const { data: subData } = await supabase
      .from("task_submissions")
      .select("*, task:tasks(*), member:profiles!task_submissions_member_id_fkey(id, full_name, domain, role)")
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

  const filterMembersByDomain = (domain: string) => {
    if (domain === "all") return members;
    return members.filter(m => m.domain?.toLowerCase() === domain.toLowerCase());
  };

  const applyFormatting = (formatType: "bold" | "italic" | "list" | "code" | "link") => {
    if (!textareaRef.current) return;
    const input = textareaRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = taskDesc.substring(start, end);

    let formatted = "";
    switch (formatType) {
      case "bold":
        formatted = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        formatted = `*${selectedText || "italic text"}*`;
        break;
      case "list":
        formatted = `\n- ${selectedText || "list item"}`;
        break;
      case "code":
        formatted = `\`${selectedText || "code"}\``;
        break;
      case "link":
        formatted = `[${selectedText || "link title"}](https://)`;
        break;
    }

    const newText = taskDesc.substring(0, start) + formatted + taskDesc.substring(end);
    setTaskDesc(newText);
  };

  const toggleAssignee = (memberId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  async function handleClaimTask(taskId: string) {
    setClaimingTaskId(taskId);
    
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("parent_task_id", taskId);

    const parentTask = tasks.find(t => t.id === taskId);
    if (parentTask?.max_claims && (count || 0) >= parentTask.max_claims) {
      setAlertModal({ isOpen: true, message: "Claim limit reached for this floating task." });
      setClaimingTaskId(null);
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title: parentTask.title,
      description: parentTask.description,
      assigned_to: profile.id,
      assigned_by: parentTask.assigned_by,
      points: parentTask.points,
      deadline: parentTask.deadline,
      status: "pending",
      parent_task_id: taskId
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Failed to claim task: " + error.message });
    } else {
      setAlertModal({ isOpen: true, message: "Task claimed successfully! You can now submit your work." });
      fetchPageData();
    }
    setClaimingTaskId(null);
  }

  async function handleAwardBonus(e: React.FormEvent) {
    e.preventDefault();
    if (!bonusMemberId) return;

    let finalPoints = 10;
    let finalReason = "";

    if (bonusCategory === "leadership") {
      finalPoints = 10;
      finalReason = "Leadership & Team Support";
    } else if (bonusCategory === "crisis") {
      finalPoints = 15;
      finalReason = "Crisis handling";
    } else {
      if (!bonusReason.trim()) {
        setAlertModal({ isOpen: true, message: "Please specify a reason for 'Other' bonus points." });
        return;
      }
      finalPoints = 10;
      finalReason = bonusReason.trim();
    }

    setAwardingBonus(true);

    const { error } = await supabase.from("points_ledger").insert({
      profile_id: bonusMemberId,
      points_awarded: finalPoints,
      reason: `✨ Executive Bonus (${profile?.role?.replace('_', ' ').toUpperCase() || 'Lead'}): ${finalReason}`
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Error awarding bonus points: " + error.message });
      setAwardingBonus(false);
      return;
    }

    const notifTitle = `✨ Executive Bonus Awarded: +${finalPoints} PTS!`;
    const notifMsg = `Reason: "${finalReason}" — Awarded by ${profile?.full_name}`;

    await supabase.from("notifications").insert({
      title: notifTitle,
      message: notifMsg,
      target_user_id: bonusMemberId,
      type: "reminder"
    });

    await triggerPushNotification(notifTitle, notifMsg, bonusMemberId);

    setBonusMemberId("");
    setBonusCategory("leadership");
    setBonusReason("");
    setAwardingBonus(false);
    setActiveTab("assigned");
    setAlertModal({ isOpen: true, message: "Executive bonus points awarded successfully!" });
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
      setAlertModal({ isOpen: true, message: "Error issuing penalty: " + error.message });
      setIssuingPenalty(false);
      return;
    }

    const notifTitle = `⚠️ Points Deducted: ${deductionVal} PTS`;
    const notifMsg = `Reason: "${penaltyReason}" — Issued by President ${profile?.full_name}`;

    await supabase.from("notifications").insert({
      title: notifTitle,
      message: notifMsg,
      target_user_id: penaltyMemberId,
      type: "reminder"
    });

    await triggerPushNotification(notifTitle, notifMsg, penaltyMemberId);

    setPenaltyMemberId("");
    setPenaltyPoints(10);
    setPenaltyReason("");
    setIssuingPenalty(false);
    setActiveTab("assigned");
    setAlertModal({ isOpen: true, message: "Penalty applied and points deducted successfully." });
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle || !taskDeadline) return;
    
    if (taskType === "direct" && selectedAssignees.length === 0) {
      setAlertModal({ isOpen: true, message: "Please select at least one assignee for direct assignment." });
      return;
    }

    setCreatingTask(true);

    if (taskType === "direct") {
      const taskInserts = selectedAssignees.map((assigneeId) => ({
        title: taskTitle,
        description: taskDesc,
        assigned_to: assigneeId,
        assigned_by: profile.id,
        points: taskPoints || 10,
        deadline: taskDeadline,
        status: "pending"
      }));

      const { error } = await supabase.from("tasks").insert(taskInserts);

      if (error) {
        setAlertModal({ isOpen: true, message: "Error creating tasks: " + error.message });
        setCreatingTask(false);
        return;
      }

      const notifTitle = `📋 New Task Assigned: ${taskTitle}`;
      const notifMsg = `You were assigned a deliverable worth ${taskPoints} PTS by ${profile?.full_name}.`;

      for (const assigneeId of selectedAssignees) {
        await supabase.from("notifications").insert({
          title: notifTitle,
          message: notifMsg,
          target_user_id: assigneeId,
          type: "task"
        });

        await triggerPushNotification(notifTitle, notifMsg, assigneeId);
      }
    } else {
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        description: taskDesc,
        assigned_to: null,
        assigned_by: profile.id,
        points: taskPoints || 10,
        deadline: taskDeadline,
        status: "pending",
        max_claims: maxClaims || 3
      });

      if (error) {
        setAlertModal({ isOpen: true, message: "Error creating floating task: " + error.message });
        setCreatingTask(false);
        return;
      }

      const notifTitle = `🌐 New Floating Task Available: ${taskTitle}`;
      const notifMsg = `An open deliverable worth ${taskPoints} PTS was created (Max ${maxClaims} claims). Claim yours now!`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: null,
        type: "notice"
      });

      await triggerPushNotification(notifTitle, notifMsg, null);
    }

    setTaskTitle("");
    setTaskDesc("");
    setSelectedAssignees([]);
    setMaxClaims(3);
    setTaskPoints(10);
    setTaskDeadline("");
    setCreatingTask(false);
    setActiveTab("assigned");
    fetchPageData();
  }

  async function confirmAndDeleteTask() {
    if (!deleteModal.taskId) return;
    setIsDeleting(true);
    await supabase.from("tasks").delete().eq("id", deleteModal.taskId);
    setIsDeleting(false);
    setDeleteModal({ isOpen: false, taskId: null, title: "" });
    fetchPageData();
  }

  async function handleReassignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignTask || !newAssigneeId) return;
    setIsReassigning(true);

    const targetAssignedTo = newAssigneeId === "floating" ? null : newAssigneeId;

    await supabase.from("tasks").update({ assigned_to: targetAssignedTo }).eq("id", reassignTask.id);

    if (targetAssignedTo) {
      const notifTitle = `📋 Task Re-assigned: ${reassignTask.title}`;
      const notifMsg = `A deliverable was re-assigned to you by ${profile?.full_name}.`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: targetAssignedTo,
        type: "task"
      });

      await triggerPushNotification(notifTitle, notifMsg, targetAssignedTo);
    } else {
      const notifTitle = `🌐 Task Made Floating: ${reassignTask.title}`;
      const notifMsg = `A deliverable is now unassigned and available for anyone to claim!`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: null,
        type: "notice"
      });

      await triggerPushNotification(notifTitle, notifMsg, null);
    }

    setReassignTask(null);
    setNewAssigneeId("");
    setIsReassigning(false);
    fetchPageData();
  }

  async function handleSubmitTaskWork(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmittingWork(true);

    const { error } = await supabase.from("task_submissions").insert({
      task_id: selectedTask.id,
      member_id: profile.id,
      submission_link: submissionLink.trim() || null,
      notes: submissionNotes,
      status: "pending_review"
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Submission failed: " + error.message });
      setSubmittingWork(false);
      return;
    }

    setSubmissionLink("");
    setSubmissionNotes("");
    setSelectedTask(null);
    setSubmittingWork(false);
    fetchPageData();
    setAlertModal({ isOpen: true, message: "Task deliverable submitted for review!" });
  }

  async function handleReviewSubmission(submission: any, status: "approved" | "rejected") {
    if (!canReviewSubmission(profile.role, submission.member?.role)) {
      setAlertModal({ isOpen: true, message: `Hierarchy Protection: As a ${profile.role.replace("_", " ")}, you cannot approve deliverables submitted by a ${submission.member?.role?.replace("_", " ")}.` });
      return;
    }

    setProcessingReview(true);

    await supabase.from("task_submissions").update({
      status,
      reviewed_by: profile.id
    }).eq("id", submission.id);

    if (status === "approved") {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", submission.task_id);

      await supabase.from("points_ledger").insert({
        profile_id: submission.member_id,
        points_awarded: submission.task?.points || 10,
        reason: `Completed Task: ${submission.task?.title || 'Deliverable'}`
      });

      const notifTitle = `🎉 Task Approved! +${submission.task?.points || 10} PTS`;
      const notifMsg = `Your deliverable for "${submission.task?.title}" was approved by ${profile.full_name}.`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: submission.member_id,
        type: "task"
      });

      await triggerPushNotification(notifTitle, notifMsg, submission.member_id);
    }

    setReviewingSubmission(null);
    setProcessingReview(false);
    fetchPageData();
  }

  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);
  const isExecutiveLead = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);
  const isPresident = profile?.role === 'president';
  const myTotalPoints = ledger.reduce((acc, item) => acc + item.points_awarded, 0);

  const activePendingTasks = tasks.filter(t => t.status !== "completed");
  const myDirectAndFloatingTasks = activePendingTasks.filter(t => t.assigned_to === profile?.id || t.assigned_to === null);
  const otherMembersTasks = activePendingTasks.filter(t => t.assigned_to !== profile?.id && t.assigned_to !== null);

  const completedTasks = tasks.filter(t => t.status === "completed");
  const pendingSubmissionsCount = submissions.filter(s => s.status === "pending_review").length;

  const currentDisplayTasks = isLead 
    ? (taskViewFilter === "my_tasks" ? myDirectAndFloatingTasks : otherMembersTasks)
    : myDirectAndFloatingTasks;

  return (
    <div className="space-y-6">
      
      {/* 1. Header (Heading and Short Description) */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-12 h-12 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gradient">Tasks & Points Ledger</h2>
          <p className="text-xs font-semibold opacity-60">Deliverable management, proof submissions, and earned contribution points.</p>
        </div>
      </div>

      {/* 2. Navigation Tab Buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-[var(--text-muted)]/10 pb-4 px-2">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "assigned" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
        >
          Tasks ({activePendingTasks.length})
        </button>
        
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "submissions" ? "neo-pressed text-amber-500" : "neo-btn opacity-70"}`}
        >
          Submissions Queue ({pendingSubmissionsCount})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "completed" ? "neo-pressed text-emerald-400" : "neo-btn opacity-70"}`}
        >
          Completed Tasks ({completedTasks.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "ledger" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
        >
          Points History
        </button>

        {isLead && (
          <button
            onClick={() => setActiveTab("create")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Create Task
          </button>
        )}

        {isExecutiveLead && (
          <button
            onClick={() => setActiveTab("bonus")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "bonus" ? "neo-pressed text-amber-500" : "neo-btn text-amber-500"}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Award Bonus
          </button>
        )}

        {isPresident && (
          <button
            onClick={() => setActiveTab("penalty")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "penalty" ? "neo-pressed text-rose-500" : "neo-btn text-rose-500"}`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Deduct Points
          </button>
        )}
      </div>

      {/* TAB 1: Tasks Feed */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          
          {/* Sub-Switch for Executive Leads */}
          {isLead && (
            <div className="flex items-center gap-2 p-1.5 neo-pressed rounded-2xl max-w-md">
              <button
                onClick={() => setTaskViewFilter("my_tasks")}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  taskViewFilter === "my_tasks" ? "neo-flat text-emerald-500" : "opacity-60"
                }`}
              >
                <User className="w-3.5 h-3.5" /> My Direct Tasks ({myDirectAndFloatingTasks.length})
              </button>
              <button
                onClick={() => setTaskViewFilter("all_chapter_tasks")}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  taskViewFilter === "all_chapter_tasks" ? "neo-flat text-amber-500" : "opacity-60"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> All Chapter Tasks ({otherMembersTasks.length})
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : currentDisplayTasks.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">
                {isLead && taskViewFilter === "all_chapter_tasks" 
                  ? "No tasks currently assigned to other team members." 
                  : "No pending tasks assigned to you right now."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDisplayTasks.map((task) => {
                const isFloating = task.assigned_to === null;
                const claimedCount = tasks.filter(t => t.parent_task_id === task.id).length;
                const maxAllowed = task.max_claims || 3;
                const isFullyClaimed = isFloating && claimedCount >= maxAllowed;

                return (
                  <div
                    key={task.id}
                    className={`neo-flat rounded-2xl p-6 flex flex-col justify-between space-y-4 relative overflow-hidden border transition-all ${
                      isFloating 
                        ? "border-teal-500/40 bg-teal-500/5 shadow-lg shadow-teal-500/5" 
                        : "border-white/5"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {isFloating ? (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border bg-teal-500/10 text-teal-400 border-teal-500/30 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Floating ({claimedCount}/{maxAllowed} Claimed)
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {task.status}
                          </span>
                        )}
                        <span className="text-xs font-mono font-extrabold text-emerald-500">
                          +{task.points} PTS
                        </span>
                      </div>

                      <h3 className="text-sm font-bold pt-1">{task.title}</h3>
                      <p className="text-xs opacity-70 leading-relaxed whitespace-pre-wrap line-clamp-4">{task.description}</p>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-[var(--text-muted)]/10">
                      <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Deadline:</span>
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="opacity-50">Assigned To:</span>
                        <span className={isFloating ? "text-teal-400 font-extrabold" : "text-emerald-500"}>
                          {isFloating ? "Floating Task" : task.assigned_member?.full_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="opacity-50">Assigned By:</span>
                        <span className="text-amber-500">{task.assigner?.full_name || "Executive Board"}</span>
                      </div>

                      {isFloating && (
                        <button
                          onClick={() => handleClaimTask(task.id)}
                          disabled={claimingTaskId === task.id || isFullyClaimed}
                          className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 mt-2 transition-all cursor-pointer shadow-lg ${
                            isFullyClaimed
                              ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                              : "neo-btn-green"
                          }`}
                        >
                          {claimingTaskId === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isFullyClaimed ? (
                            "Claim Limit Reached"
                          ) : (
                            <><Hand className="w-3.5 h-3.5" /> Claim Task ({claimedCount}/{maxAllowed})</>
                          )}
                        </button>
                      )}

                      {!isFloating && task.assigned_to === profile?.id && task.status === 'pending' && (
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="w-full py-2.5 neo-btn-green rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Submit Deliverable
                        </button>
                      )}

                      {isLead && (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => { setReassignTask(task); setNewAssigneeId(task.assigned_to || "floating"); }}
                            className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-1 hover:scale-105 transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" /> Re-assign
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, taskId: task.id, title: task.title })}
                            className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center justify-center gap-1 hover:scale-105 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submissions Queue */}
      {activeTab === "submissions" && (
        <div className="neo-flat rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Deliverables & Proof Logs</h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 neo-pressed rounded-xl text-amber-500">
              Pending: {pendingSubmissionsCount}
            </span>
          </div>
          
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-8">No submissions in queue.</p>
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
                      
                      <p className="text-[10px] opacity-60">Submitted by <span className="text-emerald-500 font-bold">{sub.member?.full_name}</span> ({sub.member?.domain})</p>
                      {sub.notes && <p className="text-xs opacity-80 italic pt-1">"{sub.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {sub.submission_link ? (
                        <a
                          href={sub.submission_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 neo-btn rounded-xl text-xs font-bold text-emerald-500 flex items-center gap-1 hover:scale-105 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Deliverable
                        </a>
                      ) : (
                        <span className="text-[10px] opacity-50 font-mono italic">No link attached</span>
                      )}

                      {isLead && sub.status === 'pending_review' && (
                        canReview ? (
                          <button
                            onClick={() => setReviewingSubmission(sub)}
                            className="px-4 py-2 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
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

      {/* TAB 3: Completed Tasks */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : completedTasks.length === 0 ? (
            <div className="neo-flat rounded-2xl p-12 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No completed tasks recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasks.map((task) => (
                <div key={task.id} className="neo-flat rounded-2xl p-6 flex flex-col justify-between space-y-4 relative overflow-hidden border border-emerald-500/20 bg-emerald-500/5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-500">
                        +{task.points} PTS
                      </span>
                    </div>

                    <h3 className="text-sm font-bold pt-1">{task.title}</h3>
                    <p className="text-xs opacity-70 leading-relaxed line-clamp-3">{task.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-[var(--text-muted)]/10 text-[10px] font-bold">
                    <div className="flex items-center justify-between">
                      <span className="opacity-50">Completed By:</span>
                      <span className="text-emerald-500">{task.assigned_member?.full_name || "Team Member"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Points History Ledger */}
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

      {/* TAB 5: Create Task Form */}
      {activeTab === "create" && isLead && (
        <form onSubmit={handleCreateTask} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Create Deliverable / Task</h3>
          
          <div className="flex gap-2 p-1 neo-pressed rounded-xl">
            <button
              type="button"
              onClick={() => setTaskType("direct")}
              className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all ${taskType === "direct" ? "neo-flat text-emerald-500" : "opacity-60"}`}
            >
              Direct Member Assign
            </button>
            <button
              type="button"
              onClick={() => setTaskType("floating")}
              className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${taskType === "floating" ? "neo-flat text-teal-400" : "opacity-60"}`}
            >
              <Globe className="w-3 h-3" /> Floating Task
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="Task Title (e.g. Design Recruitment Posters, API Route Fix)"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />

          {taskType === "direct" && (
            <div className="space-y-2 border-l-2 border-emerald-500/40 pl-3">
              <label className="text-[9px] font-extrabold uppercase opacity-60">1. Filter Domain</label>
              <select
                value={taskDomainFilter}
                onChange={(e) => { setTaskDomainFilter(e.target.value); setSelectedAssignees([]); }}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold cursor-pointer"
              >
                <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
                <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
                <option value="events" className="bg-[var(--bg-surface)]">Events</option>
                <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
                <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
              </select>

              <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">
                2. Select Assignees ({selectedAssignees.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto neo-pressed rounded-xl p-2 space-y-1 custom-scrollbar">
                {filterMembersByDomain(taskDomainFilter).map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 cursor-pointer text-xs font-medium transition-colors"
                  >
                    <span>{m.full_name} <span className="opacity-50 text-[10px]">({m.domain})</span></span>
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(m.id)}
                      onChange={() => toggleAssignee(m.id)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {taskType === "floating" && (
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Max Claim Limit (Capacity)</label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={maxClaims}
                onChange={(e) => setMaxClaims(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-400 font-bold text-teal-400"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Reward Points</label>
              <select
                required
                value={taskPoints}
                onChange={(e) => setTaskPoints(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value={5} className="bg-[var(--bg-surface)]">5 Points</option>
                <option value={10} className="bg-[var(--bg-surface)]">10 Points</option>
                <option value={15} className="bg-[var(--bg-surface)]">15 Points</option>
                <option value={20} className="bg-[var(--bg-surface)]">20 Points</option>
                <option value={25} className="bg-[var(--bg-surface)]">25 Points</option>
              </select>
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

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 p-1.5 neo-pressed rounded-xl border border-white/5">
              <button type="button" onClick={() => applyFormatting("bold")} className="p-1.5 neo-btn rounded-lg hover:text-emerald-500 text-xs font-bold" title="Bold">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => applyFormatting("italic")} className="p-1.5 neo-btn rounded-lg hover:text-emerald-500 text-xs font-bold" title="Italic">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => applyFormatting("list")} className="p-1.5 neo-btn rounded-lg hover:text-emerald-500 text-xs font-bold" title="List">
                <List className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => applyFormatting("code")} className="p-1.5 neo-btn rounded-lg hover:text-emerald-500 text-xs font-bold" title="Code">
                <Code className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => applyFormatting("link")} className="p-1.5 neo-btn rounded-lg hover:text-emerald-500 text-xs font-bold" title="Link">
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              placeholder="Task requirements, Drive links, or formatted instructions..."
              rows={4}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium custom-scrollbar resize-none"
            />
          </div>

          <button type="submit" disabled={creatingTask} className="w-full py-3.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
            {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckSquare className="w-4 h-4" /> {taskType === "floating" ? `Publish Floating Task (${maxClaims} Claims)` : `Assign Task to ${selectedAssignees.length} Member(s)`}</>}
          </button>
        </form>
      )}

      {/* TAB 6: Award Executive Bonus Points */}
      {activeTab === "bonus" && isExecutiveLead && (
        <form onSubmit={handleAwardBonus} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Award Executive Bonus Points</h3>
          </div>
          <p className="text-[10px] opacity-60">Grant extra points to any core member for exceptional initiative or standout contributions.</p>

          <div className="space-y-2 border-l-2 border-amber-500/40 pl-3">
            <label className="text-[9px] font-extrabold uppercase opacity-60">1. Filter Domain</label>
            <select
              value={bonusDomainFilter}
              onChange={(e) => { setBonusDomainFilter(e.target.value); setBonusMemberId(""); }}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
              <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
              <option value="events" className="bg-[var(--bg-surface)]">Events</option>
              <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
              <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
            </select>

            <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">2. Select Member</label>
            <select
              required
              value={bonusMemberId}
              onChange={(e) => setBonusMemberId(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Select Member for Bonus --</option>
              {filterMembersByDomain(bonusDomainFilter).map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                  {m.full_name} ({m.domain} - {m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Bonus Category & Points</label>
            <select
              required
              value={bonusCategory}
              onChange={(e) => setBonusCategory(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer"
            >
              <option value="leadership" className="bg-[var(--bg-surface)]">Leadership & Team Support - 10 Points</option>
              <option value="crisis" className="bg-[var(--bg-surface)]">Crisis handling - 15 Points</option>
              <option value="other" className="bg-[var(--bg-surface)]">Other - 10 Points (Reason Required)</option>
            </select>
          </div>

          {bonusCategory === "other" && (
            <textarea
              required
              placeholder="Specify reason for bonus points..."
              rows={3}
              value={bonusReason}
              onChange={(e) => setBonusReason(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium custom-scrollbar resize-none"
            />
          )}

          <button type="submit" disabled={awardingBonus} className="w-full py-3.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2 border border-amber-500/30 cursor-pointer">
            {awardingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Award Bonus Points & Notify Member</>}
          </button>
        </form>
      )}

      {/* TAB 7: Presidential Penalty / Point Deduction */}
      {activeTab === "penalty" && isPresident && (
        <form onSubmit={handleIssuePenalty} className="neo-flat rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-500">
            <TrendingDown className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Presidential Point Penalty & Deduction</h3>
          </div>
          <p className="text-[10px] opacity-60">Deduct points from any member's ledger score for inactivity, policy violations, or unfulfilled responsibilities.</p>

          <div className="space-y-2 border-l-2 border-rose-500/40 pl-3">
            <label className="text-[9px] font-extrabold uppercase opacity-60">1. Filter Domain</label>
            <select
              value={penaltyDomainFilter}
              onChange={(e) => { setPenaltyDomainFilter(e.target.value); setPenaltyMemberId(""); }}
              className="w-full px-4 py-2.5 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
              <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
              <option value="events" className="bg-[var(--bg-surface)]">Events</option>
              <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
              <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
            </select>

            <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">2. Select Member</label>
            <select
              required
              value={penaltyMemberId}
              onChange={(e) => setPenaltyMemberId(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Select Member for Deduction --</option>
              {filterMembersByDomain(penaltyDomainFilter).map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                  {m.full_name} ({m.domain} - {m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60 px-1">Points to Deduct</label>
            <input
              type="number"
              required
              min={5}
              max={100}
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

          <button type="submit" disabled={issuingPenalty} className="w-full py-3.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 border border-rose-500/30 cursor-pointer">
            {issuingPenalty ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TrendingDown className="w-4 h-4" /> Issue Penalty & Deduct Points</>}
          </button>
        </form>
      )}

      {/* Re-assign Task Modal */}
      {reassignTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReassignTask} className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95 bg-[var(--bg-base)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Re-assign Deliverable</h3>
            <p className="text-xs font-bold">{reassignTask.title}</p>

            <div className="space-y-2 border-l-2 border-amber-500/40 pl-3">
              <label className="text-[9px] font-extrabold uppercase opacity-60">1. Filter Domain</label>
              <select
                value={reassignDomainFilter}
                onChange={(e) => { setReassignDomainFilter(e.target.value); setNewAssigneeId(""); }}
                className="w-full px-4 py-2 neo-pressed rounded-xl text-xs bg-transparent font-bold cursor-pointer"
              >
                <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
                <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
                <option value="events" className="bg-[var(--bg-surface)]">Events</option>
                <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
                <option value="executive" className="bg-[var(--bg-surface)]">Executive</option>
              </select>

              <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">2. Select Member or Make Floating</label>
              <select
                required
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="" className="bg-[var(--bg-surface)]">-- Select New Member --</option>
                <option value="floating" className="bg-[var(--bg-surface)] font-bold text-teal-400">🌐 Make Floating Task (Unassigned)</option>
                {filterMembersByDomain(reassignDomainFilter).map(m => (
                  <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                    {m.full_name} ({m.domain})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignTask(null)}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReassigning}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-amber-500 flex justify-center items-center gap-2 border border-amber-500/30 cursor-pointer"
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
          <form onSubmit={handleSubmitTaskWork} className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95 bg-[var(--bg-base)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Submit Work: {selectedTask.title}</h3>
            
            <input
              type="url"
              placeholder="Submission Link (Optional - GitHub, Drive, Figma...)"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <textarea
              required
              placeholder="Notes or description of completed work for your lead..."
              rows={3}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full px-4 py-3 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none custom-scrollbar"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingWork}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold flex justify-center items-center gap-2 cursor-pointer"
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
          <div className="w-full max-w-md neo-flat rounded-2xl p-6 space-y-4 animate-in zoom-in-95 bg-[var(--bg-base)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Review Deliverable</h3>
            
            <p className="text-xs font-bold">{reviewingSubmission.task?.title}</p>
            <p className="text-[10px] opacity-60">Submitted by {reviewingSubmission.member?.full_name}</p>

            {reviewingSubmission.submission_link ? (
              <a
                href={reviewingSubmission.submission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 neo-pressed rounded-xl text-xs text-emerald-500 font-bold truncate flex items-center justify-between"
              >
                <span className="truncate">{reviewingSubmission.submission_link}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-[11px] opacity-50 italic p-2 neo-pressed rounded-xl">No external link attached. Review notes below.</p>
            )}

            {reviewingSubmission.notes && (
              <div className="p-3 neo-pressed rounded-xl text-xs opacity-90 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Submission Notes:</p>
                <p className="italic">"{reviewingSubmission.notes}"</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "rejected")}
                disabled={processingReview}
                className="w-1/2 py-3 neo-btn text-rose-500 rounded-xl text-xs font-bold cursor-pointer"
              >
                Request Revision
              </button>
              
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "approved")}
                disabled={processingReview}
                className="w-1/2 py-3 neo-btn-green rounded-xl text-xs font-bold cursor-pointer"
              >
                Approve & Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
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
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Task to Delete:</p>
              <p className="text-xs font-bold truncate text-[var(--text-main)]">"{deleteModal.title}"</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, taskId: null, title: "" })}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmAndDeleteTask}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
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