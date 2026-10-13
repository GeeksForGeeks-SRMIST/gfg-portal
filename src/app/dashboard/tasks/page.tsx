"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Link as LinkIcon,
  Edit3,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Layers,
  UserCheck,
  UserX,
  Hash
} from "lucide-react";

// Robust Helper function to format DB timestamp / Date string to YYYY-MM-DDTHH:mm for datetime-local input
const formatForDateTimeLocal = (dateString: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to display short clean Task ID
const formatTaskId = (id: string) => {
  if (!id) return "#0000";
  return `#${id.slice(0, 8).toUpperCase()}`;
};

// Safe converter from input value to ISO string preserving accurate timestamp
const localDateTimeToISO = (localDateTimeStr: string) => {
  if (!localDateTimeStr) return new Date().toISOString();
  const d = new Date(localDateTimeStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

// Live Countdown Timer Component
function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (isNaN(target) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isOverdue: false });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft.isOverdue) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
        <AlertTriangle className="w-3 h-3 animate-pulse" /> Expired / Overdue
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 font-mono text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
      <Clock className="w-3 h-3" />
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
    </div>
  );
}

// Expandable Task Description Component
function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 140;

  return (
    <div className="space-y-0.5">
      <p className={`text-xs opacity-80 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-bold text-emerald-500 hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          {expanded ? <>Show Less <ChevronUp className="w-3 h-3" /></> : <>Show More <ChevronDown className="w-3 h-3" /></>}
        </button>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Set to store processed overdue penalties during execution to prevent duplicate logging
  const processedPenaltiesRef = useRef<Set<string>>(new Set());

  // Dynamic Tab State
  const [activeTab, setActiveTab] = useState<"assigned" | "submissions" | "completed" | "ledger" | "create" | "bonus" | "penalty">("assigned");

  // Sub-tab filter for Leads
  const [taskViewFilter, setTaskViewFilter] = useState<"my_tasks" | "all_chapter_tasks">("my_tasks");

  // Domain Filter States
  const [taskDomainFilter, setTaskDomainFilter] = useState("all");
  const [bonusDomainFilter, setBonusDomainFilter] = useState("all");
  const [penaltyDomainFilter, setPenaltyDomainFilter] = useState("all");

  // Re-assign Modal State
  const [reassignTask, setReassignTask] = useState<any>(null);
  const [reassignDomainFilter, setReassignDomainFilter] = useState("all");
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPoints, setEditPoints] = useState(10);
  const [editDeadline, setEditDeadline] = useState("");
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Manual Completion Override State
  const [manualCompleteState, setManualCompleteState] = useState<{ taskId: string; assignmentId: string; userId: string; userName: string; isReverting?: boolean } | null>(null);
  const [isCompletingManually, setIsCompletingManually] = useState(false);

  // Claim Floating Task State
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  // Submission Form State (Member)
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submittingWork, setSubmittingWork] = useState(false);

  // Review Form State (Lead)
  const [reviewingSubmission, setReviewingSubmission] = useState<any>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
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

  // Type-to-Confirm Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; taskId: string | null; title: string }>({
    isOpen: false, taskId: null, title: ""
  });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; isError?: boolean }>({
    isOpen: false, message: "", isError: false
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editAreaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(pData);

    const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(pData?.role);

    let taskQuery = supabase
      .from("tasks")
      .select(`
        *,
        assigner:profiles!tasks_assigned_by_fkey(full_name, role),
        assignments:task_assignments(
          id,
          user_id,
          status,
          user:profiles!task_assignments_user_id_fkey(id, full_name, domain, role)
        )
      `)
      .order("created_at", { ascending: false });

    const { data: tData } = await taskQuery;
    let fetchedTasks = tData || [];

    if (!isLead) {
      fetchedTasks = fetchedTasks.filter((t) => 
        t.assigned_to === null || t.assignments?.some((a: any) => a.user_id === user.id)
      );
    }

    // Strict Server-side Overdue Check with Deduplication Protection
    const now = new Date();
    for (const task of fetchedTasks) {
      if (new Date(task.deadline) < now) {
        for (const assign of task.assignments || []) {
          if (assign.status === "pending") {
            const key = `${assign.user_id}_${task.id}`;
            if (processedPenaltiesRef.current.has(key)) continue;

            const { data: existingPenalty } = await supabase
              .from("points_ledger")
              .select("id")
              .eq("profile_id", assign.user_id)
              .eq("task_id", task.id)
              .eq("points_awarded", -5);

            if (!existingPenalty || existingPenalty.length === 0) {
              processedPenaltiesRef.current.add(key);

              await supabase
                .from("task_assignments")
                .update({ status: "overdue" })
                .eq("id", assign.id);

              await supabase.from("points_ledger").insert({
                profile_id: assign.user_id,
                task_id: task.id,
                points_awarded: -5,
                reason: `⚠️ Non-completion Penalty (-5 PTS) [${formatTaskId(task.id)}]: "${task.title}"`
              });

              const notifTitle = `⚠️ Task Overdue Penalty: -5 PTS`;
              const notifMsg = `You missed deadline for Task ${formatTaskId(task.id)} "${task.title}". -5 PTS deducted.`;
              await supabase.from("notifications").insert({
                title: notifTitle,
                message: notifMsg,
                target_user_id: assign.user_id,
                type: "reminder"
              });
            } else {
              processedPenaltiesRef.current.add(key);
            }

            assign.status = "overdue";
          }
        }
      }
    }

    setTasks(fetchedTasks);

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
  }, [supabase]);

  useEffect(() => {
    fetchPageData();

    const channel = supabase
      .channel("tasks_realtime_board_v33")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchPageData())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => fetchPageData())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => fetchPageData())
      .on("postgres_changes", { event: "*", schema: "public", table: "points_ledger" }, () => fetchPageData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPageData, supabase]);

  const getRoleRank = (roleStr: string) => {
    const ranks: Record<string, number> = {
      president: 1,
      secretary: 2,
      joint_secretary: 3,
      domain_director: 4,
      associate_lead: 5,
      member: 6
    };
    return ranks[roleStr?.toLowerCase()] || 6;
  };

  const canReviewSubmission = (reviewerRole: string, submitterRole: string) => {
    if (!reviewerRole) return false;
    if (reviewerRole === "president") return true;
    if (!submitterRole) return true;
    return getRoleRank(reviewerRole) < getRoleRank(submitterRole);
  };

  async function triggerPushNotification(title: string, message: string, targetUserId: string | null = null, link: string = "/dashboard/tasks") {
    try {
      await fetch("/api/webhooks/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record: { title, message, link, target_user_id: targetUserId }
        }),
      });
    } catch (err) {
      console.error("Failed to trigger push webhook:", err);
    }
  }

  const filterMembersByDomain = (domain: string) => {
    if (domain === "all") return members;
    return members.filter(m => m.domain?.toLowerCase() === domain.toLowerCase());
  };

  const applyFormatting = (formatType: "bold" | "italic" | "list" | "code" | "link", isEdit = false) => {
    const ref = isEdit ? editAreaRef : textareaRef;
    const value = isEdit ? editDesc : taskDesc;
    const setValue = isEdit ? setEditDesc : setTaskDesc;

    if (!ref.current) return;
    const input = ref.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = value.substring(start, end);

    let formatted = "";
    switch (formatType) {
      case "bold": formatted = `**${selectedText || "bold text"}**`; break;
      case "italic": formatted = `*${selectedText || "italic text"}*`; break;
      case "list": formatted = `\n- ${selectedText || "list item"}`; break;
      case "code": formatted = `\`${selectedText || "code"}\``; break;
      case "link": formatted = `[${selectedText || "link title"}](https://)`; break;
    }

    const newText = value.substring(0, start) + formatted + value.substring(end);
    setValue(newText);
  };

  const toggleAssignee = (memberId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  async function handleClaimTask(taskId: string) {
    setClaimingTaskId(taskId);
    
    const task = tasks.find(t => t.id === taskId);
    const currentClaims = task?.assignments?.length || 0;
    const maxAllowed = task?.max_claims || 3;

    if (currentClaims >= maxAllowed) {
      setAlertModal({ isOpen: true, message: "Claim capacity reached for this floating task.", isError: true });
      setClaimingTaskId(null);
      return;
    }

    const alreadyClaimed = task?.assignments?.some((a: any) => a.user_id === profile.id);
    if (alreadyClaimed) {
      setAlertModal({ isOpen: true, message: "You have already claimed this floating task.", isError: true });
      setClaimingTaskId(null);
      return;
    }

    const { error } = await supabase.from("task_assignments").insert({
      task_id: taskId,
      user_id: profile.id,
      status: "pending"
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Failed to claim task: " + error.message, isError: true });
    } else {
      setAlertModal({ isOpen: true, message: "Floating task claimed successfully! You can now submit deliverables." });
      fetchPageData();
    }
    setClaimingTaskId(null);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle || !taskDeadline) return;
    
    if (taskType === "direct" && selectedAssignees.length === 0) {
      setAlertModal({ isOpen: true, message: "Please select at least one assignee for direct assignment.", isError: true });
      return;
    }

    setCreatingTask(true);

    const formattedDeadlineIso = localDateTimeToISO(taskDeadline);
    const isSelfAssigned = taskType === "direct" && selectedAssignees.includes(profile.id);

    const { data: newTasks, error } = await supabase.from("tasks").insert({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assigned_to: taskType === "direct" ? selectedAssignees[0] : null,
      assigned_by: profile.id,
      points: taskPoints || 10,
      deadline: formattedDeadlineIso,
      status: "pending",
      max_claims: taskType === "floating" ? maxClaims : null,
      assigner_rewarded: isSelfAssigned
    }).select();

    if (error || !newTasks || newTasks.length === 0) {
      setAlertModal({ isOpen: true, message: "Error creating task: " + error?.message, isError: true });
      setCreatingTask(false);
      return;
    }

    const taskId = newTasks[0].id;

    if (taskType === "direct") {
      const assignmentInserts = selectedAssignees.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        status: "pending"
      }));

      await supabase.from("task_assignments").insert(assignmentInserts);

      const notifTitle = `📋 New Task Assigned [${formatTaskId(taskId)}]: ${taskTitle}`;
      const notifMsg = `You were assigned a deliverable worth ${taskPoints} PTS by ${profile?.full_name}.`;

      for (const assigneeId of selectedAssignees) {
        if (assigneeId !== profile.id) {
          await supabase.from("notifications").insert({
            title: notifTitle,
            message: notifMsg,
            target_user_id: assigneeId,
            type: "task"
          });
          await triggerPushNotification(notifTitle, notifMsg, assigneeId);
        }
      }
    } else {
      const notifTitle = `🌐 New Floating Task [${formatTaskId(taskId)}]: ${taskTitle}`;
      const notifMsg = `An open deliverable worth ${taskPoints} PTS was created (${maxClaims} claims max). Claim yours now!`;

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

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask || !editTitle || !editDeadline) return;
    setIsUpdatingTask(true);

    const formattedDeadlineIso = localDateTimeToISO(editDeadline);

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        description: editDesc.trim(),
        points: editPoints,
        deadline: formattedDeadlineIso
      })
      .eq("id", editingTask.id);

    if (error) {
      setAlertModal({ isOpen: true, message: "Failed to update task: " + error.message, isError: true });
    } else {
      setAlertModal({ isOpen: true, message: "Task updated successfully!" });
      setEditingTask(null);
      fetchPageData();
    }
    setIsUpdatingTask(false);
  }

  // Lead Manual Completion & Revert Override
  async function handleConfirmManualCompletion() {
    if (!manualCompleteState) return;
    setIsCompletingManually(true);

    const { taskId, assignmentId, userId, userName, isReverting } = manualCompleteState;
    const task = tasks.find(t => t.id === taskId);

    if (isReverting) {
      await supabase
        .from("task_assignments")
        .update({ status: "pending" })
        .eq("id", assignmentId);

      await supabase
        .from("points_ledger")
        .delete()
        .eq("task_id", taskId)
        .eq("profile_id", userId);

      await supabase.from("tasks").update({ status: "pending" }).eq("id", taskId);

      setIsCompletingManually(false);
      setManualCompleteState(null);
      fetchPageData();
      setAlertModal({ isOpen: true, message: `Reverted task status to pending for ${userName}. Earned points were revoked.` });
      return;
    }

    const earnedPoints = task?.points || 10;

    // Clear any previous overdue penalty (-5 PTS)
    await supabase
      .from("points_ledger")
      .delete()
      .eq("task_id", taskId)
      .eq("profile_id", userId)
      .eq("points_awarded", -5);

    await supabase
      .from("task_assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId);

    await supabase.from("points_ledger").insert({
      profile_id: userId,
      task_id: taskId,
      points_awarded: earnedPoints,
      reason: `Task Deliverable Approved (Lead Override) [${formatTaskId(taskId)}]: "${task?.title}"`
    });

    const isSelfAssigned = task?.assignments?.some((a: any) => a.user_id === task.assigned_by);
    if (task && !task.assigner_rewarded && task.assigned_by && !isSelfAssigned) {
      await supabase.from("tasks").update({ assigner_rewarded: true }).eq("id", task.id);

      await supabase.from("points_ledger").insert({
        profile_id: task.assigned_by,
        task_id: task.id,
        points_awarded: earnedPoints,
        reason: `✨ Task Leadership Reward (+${earnedPoints} PTS) [${formatTaskId(taskId)}]: Assigned task "${task.title}" was completed.`
      });
    }

    const { data: currentAssignments } = await supabase
      .from("task_assignments")
      .select("status")
      .eq("task_id", taskId);

    const allCompleted = currentAssignments?.every(a => a.status === "completed");
    if (allCompleted) {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", taskId);
    }

    const notifTitle = `🎉 Task Marked Completed! +${earnedPoints} PTS [${formatTaskId(taskId)}]`;
    const notifMsg = `Your task "${task?.title}" was marked completed by ${profile?.full_name}. +${earnedPoints} PTS added!`;

    await supabase.from("notifications").insert({
      title: notifTitle,
      message: notifMsg,
      target_user_id: userId,
      type: "task"
    });
    await triggerPushNotification(notifTitle, notifMsg, userId);

    setIsCompletingManually(false);
    setManualCompleteState(null);
    fetchPageData();
    setAlertModal({ isOpen: true, message: `Successfully marked task completed for ${userName}. Earned +${earnedPoints} PTS!` });
  }

  // Permanent Task Deletion & Complete Ledger Cleanup
  async function confirmAndDeleteTask() {
    if (!deleteModal.taskId || deleteConfirmInput.trim().toUpperCase() !== "DELETE") return;
    setIsDeleting(true);

    const taskId = deleteModal.taskId;

    await supabase.from("points_ledger").delete().eq("task_id", taskId);
    await supabase.from("task_submissions").delete().eq("task_id", taskId);
    await supabase.from("task_assignments").delete().eq("task_id", taskId);
    await supabase.from("tasks").delete().eq("id", taskId);

    setIsDeleting(false);
    setDeleteModal({ isOpen: false, taskId: null, title: "" });
    setDeleteConfirmInput("");
    fetchPageData();
    setAlertModal({ isOpen: true, message: "Task permanently deleted. All associated points, rewards, and penalties were automatically wiped from members' history." });
  }

  async function handleReassignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignTask || newAssigneeIds.length === 0) return;
    setIsReassigning(true);

    const isSelfAssigned = newAssigneeIds.includes(profile.id);

    if (isSelfAssigned) {
      await supabase.from("tasks").update({ assigner_rewarded: true }).eq("id", reassignTask.id);
    }

    await supabase.from("task_assignments").delete().eq("task_id", reassignTask.id);

    const assignmentInserts = newAssigneeIds.map((userId) => ({
      task_id: reassignTask.id,
      user_id: userId,
      status: "pending"
    }));

    await supabase.from("task_assignments").insert(assignmentInserts);

    setReassignTask(null);
    setNewAssigneeIds([]);
    setIsReassigning(false);
    fetchPageData();
    setAlertModal({ isOpen: true, message: "Task re-assigned successfully!" });
  }

  async function handleSubmitTaskWork(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmittingWork(true);

    const { error } = await supabase.from("task_submissions").insert({
      task_id: selectedTask.id,
      member_id: profile.id,
      submission_link: submissionLink.trim() || null,
      notes: submissionNotes.trim(),
      status: "pending_review"
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Submission failed: " + error.message, isError: true });
      setSubmittingWork(false);
      return;
    }

    await supabase
      .from("task_assignments")
      .update({ status: "submitted" })
      .eq("task_id", selectedTask.id)
      .eq("user_id", profile.id);

    setSubmissionLink("");
    setSubmissionNotes("");
    setSelectedTask(null);
    setSubmittingWork(false);
    fetchPageData();
    setAlertModal({ isOpen: true, message: "Task deliverable submitted for review!" });
  }

  async function handleReviewSubmission(submission: any, status: "approved" | "rejected") {
    if (!canReviewSubmission(profile?.role, submission.member?.role)) {
      setAlertModal({ isOpen: true, message: `Hierarchy Protection: As a ${profile?.role?.replace("_", " ")}, you cannot approve deliverables submitted by a ${submission.member?.role?.replace("_", " ")}.`, isError: true });
      return;
    }

    if (status === "rejected" && !revisionFeedback.trim()) {
      setAlertModal({ isOpen: true, message: "Please provide revision notes explaining what needs correction.", isError: true });
      return;
    }

    setProcessingReview(true);

    await supabase.from("task_submissions").update({
      status,
      reviewed_by: profile.id,
      notes: status === "rejected" ? `Revision Request: ${revisionFeedback.trim()}` : submission.notes
    }).eq("id", submission.id);

    if (status === "approved") {
      // Clear overdue penalty (-5 PTS)
      await supabase
        .from("points_ledger")
        .delete()
        .eq("task_id", submission.task_id)
        .eq("profile_id", submission.member_id)
        .eq("points_awarded", -5);

      await supabase
        .from("task_assignments")
        .update({ status: "completed" })
        .eq("task_id", submission.task_id)
        .eq("user_id", submission.member_id);

      await supabase.from("points_ledger").insert({
        profile_id: submission.member_id,
        task_id: submission.task_id,
        points_awarded: submission.task?.points || 10,
        reason: `Completed Task [${formatTaskId(submission.task_id)}]: ${submission.task?.title || 'Deliverable'}`
      });

      const task = tasks.find(t => t.id === submission.task_id);
      const isSelfAssigned = task?.assignments?.some((a: any) => a.user_id === task.assigned_by);

      if (task && !task.assigner_rewarded && task.assigned_by && !isSelfAssigned) {
        await supabase.from("tasks").update({ assigner_rewarded: true }).eq("id", task.id);

        await supabase.from("points_ledger").insert({
          profile_id: task.assigned_by,
          task_id: task.id,
          points_awarded: task.points || 10,
          reason: `✨ Task Leadership Reward (+${task.points} PTS) [${formatTaskId(task.id)}]: Assigned task "${task.title}" was completed by a member.`
        });

        const leadNotifTitle = `✨ Task Leadership Reward: +${task.points} PTS! [${formatTaskId(task.id)}]`;
        const leadNotifMsg = `Your assigned task "${task.title}" was completed by ${submission.member?.full_name}. You earned ${task.points} PTS!`;
        
        await supabase.from("notifications").insert({
          title: leadNotifTitle,
          message: leadNotifMsg,
          target_user_id: task.assigned_by,
          type: "task"
        });
        await triggerPushNotification(leadNotifTitle, leadNotifMsg, task.assigned_by);
      }

      const { data: currentAssignments } = await supabase
        .from("task_assignments")
        .select("status")
        .eq("task_id", submission.task_id);

      const allCompleted = currentAssignments?.every(a => a.status === "completed");
      if (allCompleted) {
        await supabase.from("tasks").update({ status: "completed" }).eq("id", submission.task_id);
      }

      const notifTitle = `🎉 Task Approved! +${submission.task?.points || 10} PTS [${formatTaskId(submission.task_id)}]`;
      const notifMsg = `Your deliverable for "${submission.task?.title}" was approved by ${profile.full_name}.`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: submission.member_id,
        type: "task"
      });

      await triggerPushNotification(notifTitle, notifMsg, submission.member_id);
    } else {
      await supabase
        .from("task_assignments")
        .update({ status: "pending" })
        .eq("task_id", submission.task_id)
        .eq("user_id", submission.member_id);

      const notifTitle = `🔄 Revision Requested [${formatTaskId(submission.task_id)}]: ${submission.task?.title}`;
      const notifMsg = `Notes: "${revisionFeedback.trim()}" — Requested by ${profile?.full_name}`;

      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        target_user_id: submission.member_id,
        type: "task"
      });
      await triggerPushNotification(notifTitle, notifMsg, submission.member_id);
    }

    setReviewingSubmission(null);
    setRevisionFeedback("");
    setProcessingReview(false);
    fetchPageData();
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
        setAlertModal({ isOpen: true, message: "Please specify a reason for 'Other' bonus points.", isError: true });
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
      setAlertModal({ isOpen: true, message: "Error awarding bonus points: " + error.message, isError: true });
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
      reason: `⚠️ Presidential Penalty: ${penaltyReason.trim()}`
    });

    if (error) {
      setAlertModal({ isOpen: true, message: "Error issuing penalty: " + error.message, isError: true });
      setIssuingPenalty(false);
      return;
    }

    const notifTitle = `⚠️ Points Deducted: ${deductionVal} PTS`;
    const notifMsg = `Reason: "${penaltyReason.trim()}" — Issued by President ${profile?.full_name}`;

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

  const isLead = ['president', 'secretary', 'joint_secretary', 'domain_director'].includes(profile?.role);
  const isExecutiveLead = ['president', 'secretary', 'joint_secretary'].includes(profile?.role);
  const isPresident = profile?.role === 'president';
  const myTotalPoints = ledger.reduce((acc, item) => acc + item.points_awarded, 0);

  const nowTime = new Date().getTime();

  // Tasks Filter Routing Logic (Active vs Expired/Completed)
  const activePendingTasks = tasks.filter(t => t.status !== "completed" && new Date(t.deadline).getTime() > nowTime);
  
  const myDirectAndFloatingTasks = activePendingTasks.filter(t => 
    t.assigned_to === null || t.assignments?.some((a: any) => a.user_id === profile?.id)
  );
  
  const allChapterTasks = activePendingTasks;

  // Auto-move expired tasks or manually completed tasks into Completed / Expired Feed
  const completedOrExpiredTasks = tasks.filter(t => 
    t.status === "completed" || 
    new Date(t.deadline).getTime() <= nowTime || 
    t.assignments?.every((a: any) => a.status === "completed" || a.status === "overdue")
  );

  const pendingSubmissionsCount = submissions.filter(s => s.status === "pending_review").length;

  const currentDisplayTasks = isLead 
    ? (taskViewFilter === "my_tasks" ? myDirectAndFloatingTasks : allChapterTasks)
    : myDirectAndFloatingTasks;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header with Sticky Ledger Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gradient">Tasks & Points Ledger</h2>
            <p className="text-[11px] font-semibold opacity-60">Deliverable management, proof submissions, and earned contribution points.</p>
          </div>
        </div>

        <div className="neo-pressed px-4 py-2 rounded-xl flex items-center gap-2.5 shrink-0 self-start sm:self-auto border border-emerald-500/20">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <div>
            <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">My Ledger Points</p>
            <p className="text-base font-black text-gradient font-mono">{myTotalPoints} PTS</p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tab Buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-b border-[var(--text-muted)]/10 pb-3 px-2">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "assigned" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
        >
          Active Tasks ({activePendingTasks.length})
        </button>
        
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "submissions" ? "neo-pressed text-amber-500" : "neo-btn opacity-70"}`}
        >
          Submissions ({pendingSubmissionsCount})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "completed" ? "neo-pressed text-emerald-400" : "neo-btn opacity-70"}`}
        >
          Completed & Expired ({completedOrExpiredTasks.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "ledger" ? "neo-pressed text-emerald-500" : "neo-btn opacity-70"}`}
        >
          Points History
        </button>

        {isLead && (
          <button
            onClick={() => setActiveTab("create")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${activeTab === "create" ? "neo-pressed text-emerald-500" : "neo-btn text-emerald-500"}`}
          >
            <Plus className="w-3.5 h-3.5" /> Create Task
          </button>
        )}

        {isExecutiveLead && (
          <button
            onClick={() => setActiveTab("bonus")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${activeTab === "bonus" ? "neo-pressed text-amber-500" : "neo-btn text-amber-500"}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Bonus
          </button>
        )}

        {isPresident && (
          <button
            onClick={() => setActiveTab("penalty")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${activeTab === "penalty" ? "neo-pressed text-rose-500" : "neo-btn text-rose-500"}`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Deduct
          </button>
        )}
      </div>

      {/* TAB 1: Tasks Feed */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          
          {/* Sub-Switch for Executive Leads */}
          {isLead && (
            <div className="flex items-center gap-1.5 p-1 neo-pressed rounded-xl max-w-sm">
              <button
                onClick={() => setTaskViewFilter("my_tasks")}
                className={`w-1/2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  taskViewFilter === "my_tasks" ? "neo-flat text-emerald-500" : "opacity-60"
                }`}
              >
                <User className="w-3 h-3" /> Direct Tasks ({myDirectAndFloatingTasks.length})
              </button>
              <button
                onClick={() => setTaskViewFilter("all_chapter_tasks")}
                className={`w-1/2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  taskViewFilter === "all_chapter_tasks" ? "neo-flat text-amber-500" : "opacity-60"
                }`}
              >
                <Users className="w-3 h-3" /> All Tasks ({allChapterTasks.length})
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : currentDisplayTasks.length === 0 ? (
            <div className="neo-flat rounded-2xl p-8 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">
                {isLead && taskViewFilter === "all_chapter_tasks" 
                  ? "No active tasks in chapter." 
                  : "No active pending tasks assigned to you right now."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentDisplayTasks.map((task) => {
                const isFloating = task.assigned_to === null;
                const assignments = task.assignments || [];
                const maxAllowed = task.max_claims || 3;
                const claimRatio = Math.min(100, Math.round((assignments.length / maxAllowed) * 100));
                const isFullyClaimed = isFloating && assignments.length >= maxAllowed;

                const myAssignment = assignments.find((a: any) => a.user_id === profile?.id);
                const hasMySubmitted = myAssignment?.status === "submitted";
                const hasMyCompleted = myAssignment?.status === "completed";

                const formattedDeadline = new Date(task.deadline).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short"
                });

                return (
                  <div
                    key={task.id}
                    className={`neo-flat rounded-2xl p-4 flex flex-col justify-between space-y-3 relative border transition-all ${
                      isFloating 
                        ? "border-teal-500/40 bg-teal-500/5 shadow-sm" 
                        : "border-white/5"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" /> {formatTaskId(task.id)}
                          </span>
                          {isFloating ? (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border bg-teal-500/10 text-teal-400 border-teal-500/30 flex items-center gap-0.5">
                              <Globe className="w-2 h-2" /> Floating
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-500 border-amber-500/20">
                              {task.status}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono font-black text-emerald-500 neo-pressed px-2 py-0.5 rounded">
                          +{task.points} PTS
                        </span>
                      </div>

                      <h3 className="text-xs font-extrabold tracking-tight leading-snug">{task.title}</h3>
                      
                      {/* Segmented Capacity Meter for Floating Tasks */}
                      {isFloating && (
                        <div className="space-y-0.5 pt-0.5">
                          <div className="flex justify-between text-[8px] font-extrabold uppercase">
                            <span className="text-teal-400">Claims:</span>
                            <span className="font-mono">{assignments.length} / {maxAllowed}</span>
                          </div>
                          <div className="w-full h-1.5 neo-pressed rounded-full overflow-hidden p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isFullyClaimed ? 'bg-rose-500' : 'bg-teal-400'}`} 
                              style={{ width: `${claimRatio}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      <ExpandableText text={task.description} />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--text-muted)]/10">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                        <div className="flex items-center gap-1 opacity-70">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">{formattedDeadline}</span>
                        </div>
                        <CountdownTimer deadline={task.deadline} />
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="opacity-50">By:</span>
                        <span className="text-amber-500">{task.assigner?.full_name || "Board"}</span>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-[var(--text-muted)]/10">
                        <p className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-500">
                          Assignees ({assignments.length}):
                        </p>
                        
                        {assignments.length === 0 ? (
                          <p className="text-[9px] opacity-50 italic">Open Floating Task</p>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1 neo-pressed rounded-lg p-1.5 custom-scrollbar">
                            {assignments.map((a: any) => (
                              <div key={a.id} className="flex items-center justify-between text-[9px] py-0.5 border-b border-white/5 last:border-0 gap-1.5">
                                <span className="font-bold truncate opacity-90">{a.user?.full_name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`font-black uppercase text-[7px] px-1.5 py-0.5 rounded ${
                                    a.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                    a.status === 'submitted' ? 'bg-amber-500/20 text-amber-400' :
                                    a.status === 'overdue' ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {a.status}
                                  </span>

                                  {isLead && (
                                    a.status !== 'completed' ? (
                                      <button
                                        type="button"
                                        onClick={() => setManualCompleteState({ taskId: task.id, assignmentId: a.id, userId: a.user_id, userName: a.user?.full_name, isReverting: false })}
                                        className="px-1.5 py-0.5 neo-btn text-emerald-500 hover:bg-emerald-500/10 rounded text-[7px] font-extrabold uppercase flex items-center gap-0.5 transition-all cursor-pointer"
                                      >
                                        <Check className="w-2 h-2" /> Done
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setManualCompleteState({ taskId: task.id, assignmentId: a.id, userId: a.user_id, userName: a.user?.full_name, isReverting: true })}
                                        className="px-1.5 py-0.5 neo-btn text-amber-500 hover:bg-amber-500/10 rounded text-[7px] font-extrabold uppercase flex items-center gap-0.5 transition-all cursor-pointer"
                                      >
                                        <RotateCcw className="w-2 h-2" /> Undo
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Member Primary Action */}
                      {isFloating && !myAssignment && (
                        <button
                          onClick={() => handleClaimTask(task.id)}
                          disabled={claimingTaskId === task.id || isFullyClaimed}
                          className={`w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 mt-1 transition-all cursor-pointer shadow ${
                            isFullyClaimed
                              ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                              : "neo-btn-green"
                          }`}
                        >
                          {claimingTaskId === task.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isFullyClaimed ? (
                            "Capacity Full"
                          ) : (
                            <><Hand className="w-3 h-3" /> Claim Task ({assignments.length}/{maxAllowed})</>
                          )}
                        </button>
                      )}

                      {myAssignment && myAssignment.status === 'pending' && (
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="w-full py-2 neo-btn-green rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 mt-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Submit Work
                        </button>
                      )}

                      {hasMySubmitted && (
                        <div className="w-full py-1.5 neo-pressed rounded-lg text-[9px] font-bold text-amber-500 text-center uppercase tracking-wider">
                          Pending Review
                        </div>
                      )}

                      {hasMyCompleted && (
                        <div className="w-full py-1.5 neo-pressed rounded-lg text-[9px] font-bold text-emerald-500 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </div>
                      )}

                      {/* Lead Utility Action Tray */}
                      {isLead && (
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setEditTitle(task.title);
                              setEditDesc(task.description || "");
                              setEditPoints(task.points || 10);
                              setEditDeadline(formatForDateTimeLocal(task.deadline));
                            }}
                            className="py-1.5 neo-btn rounded-lg text-[8px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-0.5 hover:scale-105 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Edit
                          </button>
                          <button
                            onClick={() => { 
                              setReassignTask(task); 
                              setNewAssigneeIds(assignments.map((a: any) => a.user_id)); 
                            }}
                            className="py-1.5 neo-btn rounded-lg text-[8px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-0.5 hover:scale-105 transition-all cursor-pointer"
                          >
                            <UserPlus className="w-2.5 h-2.5" /> Reassign
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, taskId: task.id, title: task.title })}
                            className="py-1.5 neo-btn rounded-lg text-[8px] font-extrabold uppercase tracking-wider text-rose-500 flex items-center justify-center gap-0.5 hover:scale-105 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Delete
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
        <div className="neo-flat rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Deliverables Queue</h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 neo-pressed rounded-lg text-amber-500">
              Pending: {pendingSubmissionsCount}
            </span>
          </div>
          
          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-6">No submissions in queue.</p>
            ) : (
              submissions.map((sub) => {
                const canReview = isLead && canReviewSubmission(profile?.role, sub.member?.role);
                return (
                  <div key={sub.id} className="neo-pressed rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-amber-400 border border-amber-500/20">
                          {formatTaskId(sub.task_id)}
                        </span>
                        <span className="text-xs font-bold">{sub.task?.title || "Deliverable"}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          sub.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          sub.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {sub.status.replace("_", " ")}
                        </span>
                      </div>
                      
                      <p className="text-[10px] opacity-60">Submitted by <span className="text-emerald-500 font-bold">{sub.member?.full_name}</span> ({sub.member?.domain})</p>
                      {sub.notes && <p className="text-xs opacity-80 italic pt-0.5">"{sub.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {sub.submission_link ? (
                        <a
                          href={sub.submission_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 neo-btn rounded-lg text-xs font-bold text-emerald-500 flex items-center gap-1 hover:scale-105 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Link
                        </a>
                      ) : (
                        <span className="text-[9px] opacity-50 font-mono italic">No link</span>
                      )}

                      {isLead && sub.status === 'pending_review' && (
                        canReview ? (
                          <button
                            onClick={() => {
                              setReviewingSubmission(sub);
                              setRevisionFeedback("");
                            }}
                            className="px-3 py-1.5 neo-btn-green rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Review
                          </button>
                        ) : (
                          <div className="px-2 py-1 neo-pressed rounded-lg text-[9px] font-bold text-amber-500 flex items-center gap-1 border border-amber-500/30">
                            <Lock className="w-2.5 h-2.5" /> Senior Review
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

      {/* TAB 3: Completed & Expired Tasks Feed */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>
          ) : completedOrExpiredTasks.length === 0 ? (
            <div className="neo-flat rounded-2xl p-8 text-center opacity-50 space-y-2">
              <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
              <p className="text-xs font-bold">No completed or expired tasks recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedOrExpiredTasks.map((task) => {
                const assignments = task.assignments || [];
                const completedMembers = assignments.filter((a: any) => a.status === "completed");
                const uncompletedMembers = assignments.filter((a: any) => a.status !== "completed");
                const isPastDeadline = new Date(task.deadline).getTime() <= nowTime;

                return (
                  <div key={task.id} className={`neo-flat rounded-2xl p-4 flex flex-col justify-between space-y-3 relative border ${isPastDeadline ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-amber-400 border border-amber-500/20">
                            {formatTaskId(task.id)}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                            isPastDeadline ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5" /> {isPastDeadline ? 'Expired Task' : 'Completed Task'}
                          </span>
                        </div>

                        <span className="text-xs font-mono font-extrabold text-emerald-500">
                          +{task.points} PTS
                        </span>
                      </div>

                      <h3 className="text-xs font-extrabold tracking-tight pt-0.5">{task.title}</h3>
                      <ExpandableText text={task.description} />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--text-muted)]/10 text-[9px]">
                      
                      <div className="flex items-center justify-between font-mono font-bold text-[8px] uppercase px-2 py-0.5 neo-pressed rounded">
                        <span className="opacity-60">Status:</span>
                        <span className={isPastDeadline ? 'text-rose-400' : 'text-emerald-400'}>
                          {completedMembers.length} / {assignments.length} Done
                        </span>
                      </div>

                      {/* 1. Members Completed */}
                      <div>
                        <p className="font-extrabold uppercase text-emerald-400 flex items-center gap-1 mb-1">
                          <UserCheck className="w-3 h-3" /> Done ({completedMembers.length}):
                        </p>
                        {completedMembers.length === 0 ? (
                          <p className="opacity-40 italic pl-1 text-[8px]">None marked completed</p>
                        ) : (
                          <div className="space-y-1">
                            {completedMembers.map((m: any) => (
                              <div key={m.id} className="p-1.5 rounded-lg neo-pressed text-emerald-400 font-bold flex items-center justify-between gap-1 border border-emerald-500/20">
                                <span className="truncate">{m.user?.full_name} <span className="opacity-50 text-[8px]">({m.user?.domain})</span></span>
                                {isLead && (
                                  <button
                                    type="button"
                                    onClick={() => setManualCompleteState({ taskId: task.id, assignmentId: m.id, userId: m.user_id, userName: m.user?.full_name, isReverting: true })}
                                    className="px-1.5 py-0.5 neo-btn text-amber-400 hover:bg-amber-500/10 rounded text-[7px] font-extrabold uppercase flex items-center gap-0.5 cursor-pointer shrink-0"
                                  >
                                    <RotateCcw className="w-2 h-2" /> Undo
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Members Pending/Overdue */}
                      <div>
                        <p className="font-extrabold uppercase text-rose-400 flex items-center gap-1 mb-1">
                          <UserX className="w-3 h-3" /> Unfinished ({uncompletedMembers.length}):
                        </p>
                        {uncompletedMembers.length === 0 ? (
                          <p className="opacity-40 italic pl-1 text-[8px]">All assignees completed!</p>
                        ) : (
                          <div className="space-y-1">
                            {uncompletedMembers.map((m: any) => (
                              <div key={m.id} className="p-1.5 rounded-lg neo-pressed text-rose-300 font-bold flex items-center justify-between gap-1 border border-rose-500/20">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="truncate">{m.user?.full_name}</span>
                                  <span className={`text-[7px] uppercase font-black px-1 py-0.2 rounded ${
                                    m.status === 'overdue' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {m.status}
                                  </span>
                                </div>
                                {isLead && (
                                  <button
                                    type="button"
                                    onClick={() => setManualCompleteState({ taskId: task.id, assignmentId: m.id, userId: m.user_id, userName: m.user?.full_name, isReverting: false })}
                                    className="px-1.5 py-0.5 neo-btn text-emerald-400 hover:bg-emerald-500/10 rounded text-[7px] font-extrabold uppercase flex items-center gap-0.5 cursor-pointer shrink-0"
                                  >
                                    <Check className="w-2 h-2" /> Pass
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete option */}
                      {isLead && (
                        <div className="pt-1.5 border-t border-[var(--text-muted)]/10 flex justify-end">
                          <button
                            onClick={() => {
                              setDeleteModal({ isOpen: true, taskId: task.id, title: task.title });
                              setDeleteConfirmInput("");
                            }}
                            className="px-2.5 py-1 neo-btn rounded-lg text-[8px] font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-0.5 hover:scale-105 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Delete Task
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

      {/* TAB 4: Points History Ledger */}
      {activeTab === "ledger" && (
        <div className="neo-flat rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--text-muted)]/10 pb-3 px-1">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Points History Ledger</h3>
              <p className="text-[10px] opacity-60">Credits awarded for task completions, executive bonuses, and penalties.</p>
            </div>
            <div className="neo-pressed px-4 py-2 rounded-xl text-right">
              <p className="text-[8px] font-bold uppercase tracking-widest opacity-50">Total Ledger</p>
              <p className="text-lg font-black text-gradient font-mono">{myTotalPoints} PTS</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {ledger.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-6">No ledger records found.</p>
            ) : (
              ledger.map((item) => {
                const isNegative = item.points_awarded < 0;
                return (
                  <div key={item.id} className="neo-pressed rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {item.task_id && (
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-amber-400 border border-amber-500/20">
                            {formatTaskId(item.task_id)}
                          </span>
                        )}
                        <p className="text-xs font-bold">{item.reason}</p>
                      </div>
                      <p className="text-[8px] opacity-40 uppercase tracking-widest font-mono">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-mono font-black shrink-0 ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isNegative ? `${item.points_awarded} PTS` : `+${item.points_awarded} PTS`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Redesigned Compact Executive Task Creator Form */}
      {activeTab === "create" && isLead && (
        <div className="neo-flat rounded-2xl p-5 max-w-2xl mx-auto space-y-4 border border-emerald-500/20 bg-emerald-500/5 shadow-lg">
          
          <div className="flex items-center justify-between border-b border-[var(--text-muted)]/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg neo-pressed flex items-center justify-center text-emerald-500 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Create Deliverable Task</h3>
                <p className="text-[10px] opacity-60">Compact executive task configuration form.</p>
              </div>
            </div>

            <span className="text-[8px] font-mono font-black text-emerald-400 neo-pressed px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest">
              Executive Mode
            </span>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            
            {/* Step 1: Compact Distribution Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType("direct")}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between ${
                  taskType === "direct"
                    ? "neo-pressed border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : "neo-btn border-white/5 opacity-70 hover:opacity-100"
                }`}
              >
                <div>
                  <p className="text-xs font-extrabold">Direct Assignment</p>
                  <p className="text-[8px] opacity-60">Specific domain members</p>
                </div>
                {taskType === "direct" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setTaskType("floating")}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between ${
                  taskType === "floating"
                    ? "neo-pressed border-teal-400 text-teal-300 bg-teal-500/10"
                    : "neo-btn border-white/5 opacity-70 hover:opacity-100"
                }`}
              >
                <div>
                  <p className="text-xs font-extrabold text-teal-300">Public Floating</p>
                  <p className="text-[8px] opacity-60">Open claim pool</p>
                </div>
                {taskType === "floating" && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
              </button>
            </div>

            {/* Step 2: Task Title */}
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">Task Title *</label>
              <input
                type="text"
                required
                placeholder="Title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </div>

            {/* Step 3: Member Selection / Claims */}
            {taskType === "direct" ? (
              <div className="space-y-2 neo-pressed rounded-xl p-3 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Assignees ({selectedAssignees.length})
                  </label>
                  
                  {/* Domain Filters */}
                  <div className="flex gap-1">
                    {["all", "technical", "events", "creatives"].map((dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => { setTaskDomainFilter(dom); setSelectedAssignees([]); }}
                        className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          taskDomainFilter === dom ? "bg-emerald-500 text-black" : "neo-btn opacity-60"
                        }`}
                      >
                        {dom}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {filterMembersByDomain(taskDomainFilter).map((m) => {
                    const isChecked = selectedAssignees.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-[11px] font-bold transition-all ${
                          isChecked ? "bg-emerald-500/20 text-emerald-300" : "hover:bg-white/5 opacity-80"
                        }`}
                      >
                        <span>{m.full_name} <span className="text-[8px] opacity-50">({m.domain})</span></span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAssignee(m.id)}
                          className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1 neo-pressed rounded-xl p-3 border border-teal-500/20">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-teal-300">
                  Max Claim Capacity Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 neo-pressed rounded-lg text-xs bg-transparent focus:outline-none text-teal-300 font-mono font-bold"
                />
              </div>
            )}

            {/* Step 4: Compact Grid for Points & Deadline */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">Points *</label>
                <select
                  required
                  value={taskPoints}
                  onChange={(e) => setTaskPoints(parseInt(e.target.value))}
                  className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-bold text-emerald-400 font-mono cursor-pointer"
                >
                  <option value={5} className="bg-[var(--bg-surface)]">5 PTS — Quick</option>
                  <option value={10} className="bg-[var(--bg-surface)]">10 PTS — Standard</option>
                  <option value={15} className="bg-[var(--bg-surface)]">15 PTS — Priority</option>
                  <option value={20} className="bg-[var(--bg-surface)]">20 PTS — Major</option>
                  <option value={25} className="bg-[var(--bg-surface)]">25 PTS — Core</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">Deadline *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* Step 5: Text Formatting & Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">Guidelines</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => applyFormatting("bold")} className="p-1 neo-btn rounded hover:text-emerald-500 text-[10px]" title="Bold"><Bold className="w-3 h-3" /></button>
                  <button type="button" onClick={() => applyFormatting("italic")} className="p-1 neo-btn rounded hover:text-emerald-500 text-[10px]" title="Italic"><Italic className="w-3 h-3" /></button>
                  <button type="button" onClick={() => applyFormatting("list")} className="p-1 neo-btn rounded hover:text-emerald-500 text-[10px]" title="List"><List className="w-3 h-3" /></button>
                  <button type="button" onClick={() => applyFormatting("code")} className="p-1 neo-btn rounded hover:text-emerald-500 text-[10px]" title="Code"><Code className="w-3 h-3" /></button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                placeholder="Enter deliverable description & links..."
                rows={3}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none custom-scrollbar resize-none font-medium"
              />
            </div>

            {/* Step 6: Publish Action Button */}
            <button
              type="submit"
              disabled={creatingTask}
              className="w-full py-3 neo-btn-green rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {creatingTask ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" /> Publish Task
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: Executive Bonus Points Form */}
      {activeTab === "bonus" && isExecutiveLead && (
        <form onSubmit={handleAwardBonus} className="neo-flat rounded-2xl p-5 max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Award Executive Bonus</h3>
          </div>

          <div className="space-y-2 border-l-2 border-amber-500/40 pl-2.5">
            <label className="text-[9px] font-extrabold uppercase opacity-60">1. Filter Domain</label>
            <select
              value={bonusDomainFilter}
              onChange={(e) => { setBonusDomainFilter(e.target.value); setBonusMemberId(""); }}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-bold cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
              <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
              <option value="events" className="bg-[var(--bg-surface)]">Events</option>
              <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            </select>

            <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">2. Member</label>
            <select
              required
              value={bonusMemberId}
              onChange={(e) => setBonusMemberId(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-medium cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Select Member --</option>
              {filterMembersByDomain(bonusDomainFilter).map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                  {m.full_name} ({m.domain})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60">Category</label>
            <select
              required
              value={bonusCategory}
              onChange={(e) => setBonusCategory(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-medium cursor-pointer"
            >
              <option value="leadership" className="bg-[var(--bg-surface)]">Leadership — 10 PTS</option>
              <option value="crisis" className="bg-[var(--bg-surface)]">Crisis Handling — 15 PTS</option>
              <option value="other" className="bg-[var(--bg-surface)]">Other — 10 PTS</option>
            </select>
          </div>

          {bonusCategory === "other" && (
            <textarea
              required
              placeholder="Specify bonus reason..."
              rows={2}
              value={bonusReason}
              onChange={(e) => setBonusReason(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent custom-scrollbar resize-none"
            />
          )}

          <button type="submit" disabled={awardingBonus} className="w-full py-2.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5 border border-amber-500/30 cursor-pointer">
            {awardingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Award Bonus Points</>}
          </button>
        </form>
      )}

      {/* TAB 7: Presidential Penalty Form */}
      {activeTab === "penalty" && isPresident && (
        <form onSubmit={handleIssuePenalty} className="neo-flat rounded-2xl p-5 max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-2 text-rose-500">
            <TrendingDown className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Presidential Penalty</h3>
          </div>

          <div className="space-y-2 border-l-2 border-rose-500/40 pl-2.5">
            <label className="text-[9px] font-extrabold uppercase opacity-60">1. Domain</label>
            <select
              value={penaltyDomainFilter}
              onChange={(e) => { setPenaltyDomainFilter(e.target.value); setPenaltyMemberId(""); }}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-bold cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
              <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
              <option value="events" className="bg-[var(--bg-surface)]">Events</option>
              <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
            </select>

            <label className="text-[9px] font-extrabold uppercase opacity-60 pt-1 block">2. Member</label>
            <select
              required
              value={penaltyMemberId}
              onChange={(e) => setPenaltyMemberId(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-medium cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Select Member --</option>
              {filterMembersByDomain(penaltyDomainFilter).map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">
                  {m.full_name} ({m.domain})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase opacity-60">Deduction Points</label>
            <input
              type="number"
              required
              min={5}
              max={100}
              value={penaltyPoints}
              onChange={(e) => setPenaltyPoints(parseInt(e.target.value))}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-mono text-rose-500 font-bold"
            />
          </div>

          <textarea
            required
            placeholder="Deduction reason..."
            rows={3}
            value={penaltyReason}
            onChange={(e) => setPenaltyReason(e.target.value)}
            className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent custom-scrollbar resize-none font-medium"
          />

          <button type="submit" disabled={issuingPenalty} className="w-full py-2.5 neo-btn rounded-xl text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer">
            {issuingPenalty ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TrendingDown className="w-3.5 h-3.5" /> Issue Penalty</>}
          </button>
        </form>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateTask} className="w-full max-w-md neo-flat rounded-2xl p-5 space-y-3 bg-[var(--bg-base)] border border-white/10 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Edit Task</h3>

            <div>
              <label className="text-[9px] font-extrabold uppercase opacity-60">Task Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-extrabold uppercase opacity-60">Points</label>
                <select
                  required
                  value={editPoints}
                  onChange={(e) => setEditPoints(parseInt(e.target.value))}
                  className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-medium cursor-pointer"
                >
                  <option value={5} className="bg-[var(--bg-surface)]">5 Points</option>
                  <option value={10} className="bg-[var(--bg-surface)]">10 Points</option>
                  <option value={15} className="bg-[var(--bg-surface)]">15 Points</option>
                  <option value={20} className="bg-[var(--bg-surface)]">20 Points</option>
                  <option value={25} className="bg-[var(--bg-surface)]">25 Points</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase opacity-60">Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60">Description</label>
              <textarea
                ref={editAreaRef}
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent custom-scrollbar resize-none font-medium"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingTask}
                className="w-1/2 py-2.5 neo-btn-green rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 cursor-pointer"
              >
                {isUpdatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Completion Modal */}
      {manualCompleteState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm neo-flat rounded-2xl p-5 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg neo-pressed flex items-center justify-center shrink-0 ${manualCompleteState.isReverting ? 'text-amber-500' : 'text-emerald-500'}`}>
                {manualCompleteState.isReverting ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <h3 className={`text-xs font-black uppercase tracking-widest ${manualCompleteState.isReverting ? 'text-amber-500' : 'text-emerald-500'}`}>
                {manualCompleteState.isReverting ? 'Revert Status' : 'Lead Override'}
              </h3>
            </div>

            <div className="neo-pressed rounded-xl p-3 space-y-1 text-xs">
              <p className="text-[9px] font-bold opacity-50 uppercase">Assignee:</p>
              <p className="font-bold text-emerald-400">{manualCompleteState.userName}</p>
              <p className="text-[10px] opacity-70 pt-1 leading-normal">
                {manualCompleteState.isReverting 
                  ? `Reverting to pending revokes awarded reward points from ${manualCompleteState.userName}.`
                  : `Marking complete awards full points to ${manualCompleteState.userName} and clears previous overdue penalties.`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualCompleteState(null)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCompletingManually}
                onClick={handleConfirmManualCompletion}
                className={`w-1/2 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  manualCompleteState.isReverting ? 'neo-btn text-amber-500' : 'neo-btn-green'
                }`}
              >
                {isCompletingManually ? <Loader2 className="w-4 h-4 animate-spin" /> : (manualCompleteState.isReverting ? "Revert" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Task Modal */}
      {reassignTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReassignTask} className="w-full max-w-md neo-flat rounded-2xl p-5 space-y-3 bg-[var(--bg-base)] border border-white/10 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Reassign Deliverable</h3>
            <p className="text-xs font-bold truncate">{reassignTask.title}</p>

            <div className="space-y-2 border-l-2 border-amber-500/40 pl-2.5">
              <label className="text-[9px] font-extrabold uppercase opacity-60">1. Domain</label>
              <select
                value={reassignDomainFilter}
                onChange={(e) => { setReassignDomainFilter(e.target.value); setNewAssigneeIds([]); }}
                className="w-full px-3 py-1.5 neo-pressed rounded-xl text-xs bg-transparent font-bold cursor-pointer"
              >
                <option value="all" className="bg-[var(--bg-surface)]">All Domains</option>
                <option value="technical" className="bg-[var(--bg-surface)]">Technical</option>
                <option value="events" className="bg-[var(--bg-surface)]">Events</option>
                <option value="creatives" className="bg-[var(--bg-surface)]">Creatives</option>
              </select>

              <label className="text-[9px] font-extrabold uppercase opacity-60 pt-0.5 block">2. New Assignees</label>
              <div className="max-h-36 overflow-y-auto neo-pressed rounded-xl p-2 space-y-1 custom-scrollbar">
                {filterMembersByDomain(reassignDomainFilter).map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-amber-500/10 cursor-pointer text-xs font-medium"
                  >
                    <span>{m.full_name} <span className="opacity-50 text-[9px]">({m.domain})</span></span>
                    <input
                      type="checkbox"
                      checked={newAssigneeIds.includes(m.id)}
                      onChange={() => {
                        setNewAssigneeIds(prev => 
                          prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReassignTask(null)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReassigning || newAssigneeIds.length === 0}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold text-amber-500 flex justify-center items-center gap-1 border border-amber-500/30 cursor-pointer"
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
          <form onSubmit={handleSubmitTaskWork} className="w-full max-w-md neo-flat rounded-2xl p-5 space-y-3 bg-[var(--bg-base)] border border-white/10 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Submit Work: {selectedTask.title}</h3>
            
            <input
              type="url"
              placeholder="Submission Link (Drive, GitHub, Figma...)"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />

            <textarea
              required
              placeholder="Submission notes..."
              rows={3}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none custom-scrollbar font-medium"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingWork}
                className="w-1/2 py-2.5 neo-btn-green rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 cursor-pointer"
              >
                {submittingWork ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Work"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lead Review Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md neo-flat rounded-2xl p-5 space-y-3 bg-[var(--bg-base)] border border-white/10 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Review Deliverable</h3>
            
            <p className="text-xs font-bold">{reviewingSubmission.task?.title}</p>
            <p className="text-[10px] opacity-60">Submitted by {reviewingSubmission.member?.full_name}</p>

            {reviewingSubmission.submission_link ? (
              <a
                href={reviewingSubmission.submission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 neo-pressed rounded-xl text-xs text-emerald-500 font-bold truncate flex items-center justify-between"
              >
                <span className="truncate">{reviewingSubmission.submission_link}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-[10px] opacity-50 italic p-2 neo-pressed rounded-xl">No external link attached.</p>
            )}

            {reviewingSubmission.notes && (
              <div className="p-2.5 neo-pressed rounded-xl text-xs opacity-90 space-y-0.5">
                <p className="text-[8px] font-black uppercase opacity-50">Notes:</p>
                <p className="italic">"{reviewingSubmission.notes}"</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 flex items-center gap-1 text-amber-500">
                <MessageSquare className="w-3 h-3" /> Feedback / Instructions
              </label>
              <textarea
                placeholder="Instructions for revision..."
                rows={2}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 custom-scrollbar resize-none font-medium"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "rejected")}
                disabled={processingReview}
                className="w-1/2 py-2.5 neo-btn text-rose-500 rounded-xl text-xs font-bold cursor-pointer"
              >
                Request Revision
              </button>
              
              <button
                type="button"
                onClick={() => handleReviewSubmission(reviewingSubmission, "approved")}
                disabled={processingReview}
                className="w-1/2 py-2.5 neo-btn-green rounded-xl text-xs font-bold cursor-pointer"
              >
                Approve & Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Deletion Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm neo-flat rounded-2xl p-5 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10">
            <div className="flex items-center gap-2 text-rose-500">
              <div className="w-8 h-8 rounded-lg neo-pressed flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Confirm Delete</h3>
            </div>

            <div className="neo-pressed rounded-xl p-3 space-y-0.5">
              <p className="text-[9px] font-bold opacity-50 uppercase">Task:</p>
              <p className="text-xs font-bold truncate">"{deleteModal.title}"</p>
              <p className="text-[9px] text-rose-400 pt-1 font-semibold leading-normal">
                ⚠️ Deleting revokes and wipes all reward points and overdue penalties from history.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase opacity-60 text-rose-500">Type "DELETE" *</label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                className="w-full px-3 py-2 neo-pressed rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-rose-500 font-extrabold uppercase text-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModal({ isOpen: false, taskId: null, title: "" });
                  setDeleteConfirmInput("");
                }}
                className="w-1/2 py-2.5 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmInput.trim().toUpperCase() !== "DELETE"}
                onClick={confirmAndDeleteTask}
                className={`w-1/2 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  deleteConfirmInput.trim().toUpperCase() === "DELETE"
                    ? "bg-rose-500 text-white shadow hover:scale-105"
                    : "neo-pressed text-rose-500/50 cursor-not-allowed"
                }`}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Status Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm neo-flat rounded-2xl p-5 space-y-3 bg-[var(--bg-base)] shadow-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg neo-pressed flex items-center justify-center shrink-0 ${alertModal.isError ? 'text-rose-500' : 'text-emerald-500'}`}>
                {alertModal.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Notification</h3>
            </div>

            <p className="text-xs opacity-80 leading-relaxed px-1 text-[var(--text-main)]">{alertModal.message}</p>

            <button
              onClick={() => setAlertModal({ isOpen: false, message: "", isError: false })}
              className="w-full py-2.5 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
}