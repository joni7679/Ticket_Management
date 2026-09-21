import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  MessageSquare,
  Paperclip,
  Send,
  Smile,
  Tag,
  TimerReset,
  User,
  UserCheck,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { PageHeader } from "../components/layout/PageHeader";
import { api } from "../services/api";
import { assignTicketToUser, changeTicketStatus, listAssignableUsers, userApproval } from "../services/tickets";
import { useAppSelector } from "../hooks/useAppSelector";
import type { TicketAttachment } from "../types/ticket";
import { formatDateTime } from "../utils/date";

const replySchema = z.object({
  message: z.string().optional(),
});

type ReplyValues = z.infer<typeof replySchema>;

export function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsOnMobile, setShowDetailsOnMobile] = useState(false);
  const [showAttachmentsOnMobile, setShowAttachmentsOnMobile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; fullName: string; email: string; roleKey: string }>>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastReplyIdRef = useRef<string | null>(null);
  const repliesLengthRef = useRef(0);
  const quickEmojis = ["😀", "👍", "🙏", "✅", "🎯", "🚨", "📌", "💡"];
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<ReplyValues>({ resolver: zodResolver(replySchema) });
  const messageValue = watch("message");

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const stopCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const openCamera = () => {
    setCameraError(null);
    setIsCameraOpen(true);
  };

  const appendEmoji = (emoji: string) => {
    const currentMessage = getValues("message") ?? "";
    const nextMessage = `${currentMessage}${currentMessage ? " " : ""}${emoji}`;
    setValue("message", nextMessage, { shouldDirty: true, shouldValidate: true });
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!isCameraOpen) {
      stopCameraStream();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;

        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }

        setIsCameraReady(true);
      } catch (error) {
        console.error("Failed to open camera:", error);
        if (isMounted) {
          setCameraError("Camera access is blocked or unavailable on this device.");
          setIsCameraReady(false);
        }
      }
    };

    void startCamera();

    return () => {
      isMounted = false;
      stopCameraStream();
    };
  }, [isCameraOpen]);

  const closeCamera = () => {
    setIsCameraOpen(false);
    setCameraError(null);
    setIsCapturingPhoto(false);
  };

  const blobToFile = (blob: Blob, fileName: string) =>
    new File([blob], fileName, { type: blob.type || "image/jpeg" });

  const captureCameraPhoto = async () => {
    if (!cameraVideoRef.current || !cameraCanvasRef.current || !cameraStreamRef.current) {
      toast.error("Camera is not ready yet");
      return;
    }

    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      toast.error("Camera is not ready yet");
      return;
    }

    setIsCapturingPhoto(true);

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      setIsCapturingPhoto(false);
      toast.error("Could not capture image");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsCapturingPhoto(false);
        toast.error("Could not capture image");
        return;
      }

      const message = (getValues("message") ?? "").trim();
      const photoFile = blobToFile(blob, `camera-${Date.now()}.jpg`);
      const filesToSend = [...pendingFiles.slice(0, 4), photoFile];

      if (!message && filesToSend.length === 0) {
        setIsCapturingPhoto(false);
        toast.error("Reply cannot be empty");
        return;
      }

      try {
        const response = await postReply(message, filesToSend);
        toast.success("Reply sent successfully");
        reset();
        setPendingFiles([]);
        setReplies((current) => [...current, response.data.reply]);
        repliesLengthRef.current += 1;
        if (response.data.reply?._id) {
          lastReplyIdRef.current = response.data.reply._id;
        }
        closeCamera();
      } catch (error: any) {
        console.error("Failed to send reply:", error);
        toast.error(error?.response?.data?.message || "Failed to send reply");
      } finally {
        setIsCapturingPhoto(false);
      }
    }, "image/jpeg", 0.92);
  };

  const validateSelectedFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    // Validate file sizes (max 10MB each for documents, 5MB for images)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    return validFiles;
  };

  const postReply = async (message: string, files: File[]) => {
    if (!id) {
      throw new Error("Ticket ID not found");
    }

    const formData = new FormData();
    formData.append("message", message);
    files.forEach((file) => formData.append("attachments", file));

    return api.post(`/api/tickets/${id}/replies`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const validFiles = validateSelectedFiles(selectedFiles);
    if (!validFiles || validFiles.length === 0) return;

    // Limit to 5 files total
    const currentCount = pendingFiles.length;
    const remaining = 5 - currentCount;
    
    if (remaining <= 0) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    setPendingFiles((current) => [...current, ...validFiles].slice(0, 5));
    
    if (validFiles.length > remaining) {
      toast.warning(`Only ${remaining} more file(s) can be added`);
    }
    
    event.target.value = "";
  };

  const removePendingFile = (fileToRemove: File) => {
    setPendingFiles((current) =>
      current.filter(
        (file) =>
          file.name !== fileToRemove.name ||
          file.size !== fileToRemove.size ||
          file.lastModified !== fileToRemove.lastModified,
      ),
    );
  };

  const formatFileSize = (size?: number) => {
    if (!size || Number.isNaN(size)) return "Unknown size";
    if (size < 1024) return `${size} B`;
    const units = ["KB", "MB", "GB"];
    let current = size / 1024;
    let unitIndex = 0;
    while (current >= 1024 && unitIndex < units.length - 1) {
      current /= 1024;
      unitIndex += 1;
    }
    return `${current.toFixed(current >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const resolveAttachmentUrl = (url?: string) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;

    const baseURL = api.defaults.baseURL ?? window.location.origin;
    const apiOrigin = new URL(baseURL, window.location.origin).origin;
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiOrigin}${normalizedPath}`;
  };

  const openAttachmentInNewTab = (url?: string) => {
    const resolvedUrl = resolveAttachmentUrl(url);
    if (!resolvedUrl) return;
    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  const isImageAttachment = (attachment: TicketAttachment) => {
    const mimeType = attachment.mimeType?.toLowerCase() || "";
    return (
      mimeType.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.url)
    );
  };

  const getConversationDateLabel = (value: string) => {
    const date = new Date(value);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMM d");
  };

  const getConversationTimestampLabel = (value: string) => {
    const date = new Date(value);
    if (isToday(date)) {
      return format(date, "p");
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, "p")}`;
    }
    return format(date, "MMM d, yyyy p");
  };

  const getFileKey = (file: File) =>
    `${file.name}-${file.size}-${file.lastModified}`;

  const getInitials = (value?: string) => {
    if (!value) return "U";
    const parts = value.trim().split(/\s+/).slice(0, 2);
    const initials = parts.map((part) => part[0]?.toUpperCase()).join("");
    return initials || "U";
  };

  const handleComposerKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(onSubmit)();
    }
  };

  const renderAttachments = (
    attachments?: TicketAttachment[],
    isOwnMessage = false,
  ) => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div
        className={`mt-4 space-y-2 border-t border-dashed pt-3 ${
          isOwnMessage
            ? "border-blue-300/70"
            : "border-slate-200 dark:border-slate-700"
        }`}
      >
        {/* <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            isOwnMessage ? "text-blue-100" : "text-slate-500"
          }`}
        >
          Attachments
        </p> */}
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.url} className="space-y-2">
              {isImageAttachment(attachment) ? (
                <div
                  className={`overflow-hidden rounded-2xl border ${
                    isOwnMessage
                      ? "border-blue-300/70 bg-blue-400/10"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openAttachmentInNewTab(attachment.url)}
                    className="block w-full text-left"
                    aria-label={`Preview ${attachment.name}`}
                  >
                    {/* <div
                      className={`flex items-center justify-between border-b px-3 py-2 text-xs ${
                        isOwnMessage
                          ? "border-blue-300/60 text-blue-100"
                          : "border-slate-200 text-slate-500 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            isOwnMessage
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                          }`}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </span>
                        <span
                          className={`truncate font-medium ${
                            isOwnMessage
                              ? "text-white"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {attachment.name}
                        </span>
                      </div>
                      <span className="shrink-0">
                        {formatFileSize(attachment.size)}
                      </span>
                    </div> */}
                    <div
                      className={`p-2 ${
                        isOwnMessage
                          ? "bg-blue-500/10"
                          : "bg-slate-50 dark:bg-slate-900"
                      }`}
                    >
                      <img
                        src={resolveAttachmentUrl(attachment.url)}
                        alt={attachment.name}
                        className="max-h-72 w-full rounded-lg object-contain"
                      />
                    </div>
                  </button>
                  <div
                    className={`flex items-center justify-between border-t px-3 py-2 text-xs ${
                      isOwnMessage
                        ? "border-blue-300/60"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span
                      className={isOwnMessage ? "text-blue-100" : "text-slate-500"}
                    >
                      Tap image to open in new tab
                    </span>
                    {/* <a
                      href={resolveAttachmentUrl(attachment.url)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${
                        isOwnMessage
                          ? "bg-white/15 text-white hover:bg-white/25"
                          : "text-blue-600 hover:underline"
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a> */}
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                    isOwnMessage
                      ? "border-blue-300/70 bg-blue-400/10 text-white"
                      : "border-slate-200 text-blue-600 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isOwnMessage
                          ? "bg-white/20 text-white"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`truncate font-medium ${
                          isOwnMessage
                            ? "text-white"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {attachment.name}
                      </p>
                      <p
                        className={`text-xs ${
                          isOwnMessage ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAttachmentInNewTab(attachment.url)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        isOwnMessage
                          ? "bg-white/15 text-white hover:bg-white/25"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Preview
                    </button>
                    <a
                      href={resolveAttachmentUrl(attachment.url)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        isOwnMessage
                          ? "bg-white/15 text-white hover:bg-white/25"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                      }`}
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetailRow = (icon: any, label: string, value: any): any => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
            {value ?? "Not set"}
          </p>
        </div>
      </div>
    </div>
  );

  const loadTicket = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/tickets/${id}`);
      setTicket(response.data.ticket);
      setReplies(response.data.replies ?? []);
      if (response.data.replies?.length > 0) {
        lastReplyIdRef.current =
          response.data.replies[response.data.replies.length - 1]._id;
      }
    } catch (error: any) {
      console.error("Failed to load ticket:", error);
      let errorMsg = "Failed to load ticket";
      if (error?.response?.status === 403) {
        errorMsg = "You do not have permission to view this ticket";
      } else if (error?.response?.status === 404) {
        errorMsg = "Ticket not found";
      } else {
        errorMsg = error?.response?.data?.message || errorMsg;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
  }, [id]);

  const checkForNewReplies = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/tickets/${id}`);
      const newReplies = response.data.replies ?? [];
      if (newReplies.length > 0) {
        const currentLastId = lastReplyIdRef.current;
        const hasNewReplies =
          !currentLastId ||
          newReplies.some((r: any) => r._id === currentLastId) === false ||
          newReplies.length > repliesLengthRef.current;
        if (hasNewReplies) {
          setReplies(newReplies);
          repliesLengthRef.current = newReplies.length;
          if (newReplies.length > 0) {
            lastReplyIdRef.current = newReplies[newReplies.length - 1]._id;
          }
        }
      }
      setTicket(response.data.ticket);
    } catch (err) {
      console.error("Failed to check for updates:", err);
    }
  };

  // Poll for updates to ticket/replies so both participants see new messages without refresh
  useEffect(() => {
    const interval = setInterval(() => {
      void checkForNewReplies();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    repliesLengthRef.current = replies.length;
  }, [replies.length]);

  useEffect(() => {
    const departmentId =
      ticket?.departmentId && typeof ticket.departmentId === "object"
        ? ticket.departmentId._id
        : undefined;

    if (!id || !departmentId) {
      setAssignableUsers([]);
      return;
    }

    const canAssign =
      currentUser?.permissions?.includes("ticket:assign") ||
      currentUser?.roleKey === "super_admin";

    if (!canAssign) {
      setAssignableUsers([]);
      return;
    }

    void listAssignableUsers(String(departmentId))
      .then((items) => {
        setAssignableUsers(items ?? []);
      })
      .catch(() => {
        setAssignableUsers([]);
      });
  }, [id, ticket?.departmentId, currentUser?.permissions, currentUser?.roleKey]);

  useEffect(() => {
    const assignedId =
      ticket?.assignedAgentId && typeof ticket.assignedAgentId === "object"
        ? ticket.assignedAgentId._id
        : "";
    setSelectedAssigneeId(assignedId || "");
  }, [ticket?.assignedAgentId]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const isChatClosed = ["resolved", "closed"].includes(ticket.status);
  const canAssignTickets =
    currentUser?.permissions?.includes("ticket:assign") ||
    currentUser?.roleKey === "super_admin";

  const onSubmit = async (values: ReplyValues) => {
    if (!id) {
      toast.error("Ticket ID not found");
      return;
    }
    if (isChatClosed) {
      toast.info("This ticket is closed. Chat is disabled.");
      return;
    }

    const message = (values.message ?? "").trim();
    if (!message && pendingFiles.length === 0) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      const response = await postReply(message, pendingFiles);
      toast.success("Reply sent successfully");
      reset();
      setPendingFiles([]);
      setReplies((current) => [...current, response.data.reply]);
      repliesLengthRef.current += 1;
      if (response.data.reply?._id) {
        lastReplyIdRef.current = response.data.reply._id;
      }
    } catch (error: any) {
      console.error("Failed to send reply:", error);
      toast.error(error?.response?.data?.message || "Failed to send reply");
    }
  };

  const handleAssignTicket = async () => {
    if (!id) {
      return;
    }

    if (!selectedAssigneeId) {
      toast.error("Please select a user to assign this ticket");
      return;
    }

    try {
      setIsAssigning(true);
      await assignTicketToUser(id, selectedAssigneeId);
      toast.success("Ticket assigned successfully");
      await loadTicket();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign ticket");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-950/80">
        Loading ticket...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ticket Not Available"
          description="Unable to load the requested ticket"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-3">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {error}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {error.includes("permission")
                  ? "This ticket belongs to another user or agent. You can only view tickets you created or are assigned to."
                  : "The ticket you requested could not be found. It may have been deleted or the ID may be incorrect."}
              </p>
              <Button onClick={() => (window.location.href = "/tickets")}>
                Back to Tickets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-950/80">
        Ticket not found
      </div>
    );
  }

  const creatorId = ticket.createdBy && typeof ticket.createdBy === 'object' ? ticket.createdBy._id : ticket.createdBy;
  const isCurrentUserCreator = String(currentUser?._id) === String(creatorId);

  const conversationItems = [
    {
      id: ticket._id,
      createdAt: ticket.createdAt,
      message: ticket.description,
      attachments: ticket.attachments ?? [],
      isOwn: isCurrentUserCreator,
      side: isCurrentUserCreator ? "right" : "left",
      label: isCurrentUserCreator ? "You" : "Ticket Creator",
    },
    ...replies.map((reply: any) => {
      const replyAuthor = reply.authorId && typeof reply.authorId === "object" ? reply.authorId : null;
      const isOwn = replyAuthor ? String(currentUser?._id) === String(replyAuthor._id) : false;
      const isAgent = replyAuthor ? ["support_agent", "admin", "super_admin"].includes(replyAuthor.roleKey) : false;

      return {
        id: reply._id,
        createdAt: reply.createdAt,
        message: reply.message,
        attachments: reply.attachments ?? [],
        isOwn,
        side: isOwn ? "right" : "left",
        label: isOwn
          ? "You"
          : isAgent
            ? "Support Team"
            : replyAuthor?.fullName || "Unknown",
      };
    }),
  ];

  const detailsPanelContent = (
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {renderDetailRow(
          <Info className="h-4 w-4" />,
          "Company name",
          ticket.companyName,
        )}
        {renderDetailRow(
          <Info className="h-4 w-4" />,
          "Line / Station",
          ticket.lineOrStation,
        )}
        {renderDetailRow(<Info className="h-4 w-4" />, "IP", ticket.ip)}
        {renderDetailRow(
          <Info className="h-4 w-4" />,
          "Current operator phone",
          ticket.currentOperatorPhoneNumber,
        )}
        {renderDetailRow(
          <Info className="h-4 w-4" />,
          "Priority",
          (<Badge className="mt-1">{ticket.priority}</Badge>) as any,
        )}
        {renderDetailRow(
          <Info className="h-4 w-4" />,
          "Status",
          (<Badge className="mt-1">{ticket.status}</Badge>) as any,
        )}
        {renderDetailRow(
          <Tag className="h-4 w-4" />,
          "Category",
          ticket.category || "Not set",
        )}
        {renderDetailRow(
          <Paperclip className="h-4 w-4" />,
          "Department",
          ticket.departmentId?.name || "Not set",
        )}
        {renderDetailRow(
          <User className="h-4 w-4" />,
          "Created by",
          ticket.createdBy?.fullName || "Unknown",
        )}
        {currentUser?.roleKey !== "user"
          ? renderDetailRow(
              <UserCheck className="h-4 w-4" />,
              "Assigned to",
              ticket.assignedAgentId?.fullName || "Unassigned",
            )
          : null}
        {renderDetailRow(
          <CalendarDays className="h-4 w-4" />,
          "Created",
          formatDateTime(ticket.createdAt),
        )}
        {renderDetailRow(
          <Clock3 className="h-4 w-4" />,
          "Updated",
          formatDateTime(ticket.updatedAt),
        )}
        {currentUser?.roleKey !== "user"
          ? renderDetailRow(
              <TimerReset className="h-4 w-4" />,
              "SLA due",
              ticket.slaDueAt
                ? formatDateTime(ticket.slaDueAt)
                : "Not set",
            )
          : null}
        {renderDetailRow(
          <MessageSquare className="h-4 w-4" />,
          "Description",
          ticket.description,
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {ticket.tags?.length ? (
          ticket.tags.map((tagValue: string) => (
            <Badge key={tagValue} variant="outline">
              {tagValue}
            </Badge>
          ))
        ) : (
          <span className="text-slate-500 dark:text-slate-400">No tags</span>
        )}
      </div>

      {currentUser?.roleKey !== "user" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Assign ticket
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reassign this ticket to a support user
              </p>
            </div>
            <Badge variant="outline">{canAssignTickets ? "Enabled" : "Locked"}</Badge>
          </div>
          {canAssignTickets ? (
            <div className="space-y-3">
              <Select
                value={selectedAssigneeId}
                onChange={(event) => setSelectedAssigneeId((event.target as HTMLSelectElement).value)}
              >
                <option value="">Select user</option>
                {assignableUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                onClick={handleAssignTicket}
                disabled={isAssigning || !selectedAssigneeId}
                className="w-full"
              >
                {isAssigning ? "Assigning..." : "Assign ticket"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You do not have permission to assign this ticket.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {/** Regular users should see only the fields relevant to them. */}
      <PageHeader
        title={ticket.ticketId}
        description={ticket.subject}
        actions={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/tickets") }>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {currentUser && currentUser.roleKey !== "user" && !isChatClosed && (
                  <Button
                    onClick={() => changeTicketStatus(ticket._id, "resolved").then(loadTicket)}
                  >
                    Mark resolved
                  </Button>
                )}

                {/* User approval actions - visible to ticket creator when pending user approval */}
                {ticket.status === "pending_user_approval" && isCurrentUserCreator && (
                  <>
                    <Button
                      onClick={async () => {
                        try {
                          await userApproval(ticket._id, 'approve');
                          toast.success('Ticket approved');
                          await loadTicket();
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || 'Failed to approve ticket');
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const feedback = window.prompt('Please provide a reason for rejecting the resolution');
                        if (feedback === null) return; // cancelled
                        if (String(feedback).trim().length === 0) {
                          toast.error('Feedback is required to reject the resolution');
                          return;
                        }
                        try {
                          await userApproval(ticket._id, 'reject', feedback);
                          toast.success('Ticket rejected and returned to pending');
                          await loadTicket();
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || 'Failed to reject ticket');
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
        }
      />
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setShowDetailsOnMobile(true)}
          className="w-full"
        >
          Show details
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 p-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    Company:{" "}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {ticket.companyName || "Not set"}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Subject:{" "}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ticket.subject}</span>
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Created by{" "}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {ticket.creatorId?.fullName || "Unknown User"}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Priority:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {ticket.priority}
                    </span>
                  </p>
                </div>
                <Badge
                  className={
                    isChatClosed
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                  }
                >
                  {isChatClosed ? "Closed" : "Live"}
                </Badge>
              </div>

              {isChatClosed ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  This ticket is closed. Chat is locked and new replies are disabled.
                </div>
              ) : null}

              <div className="space-y-5">
                {conversationItems.map((item, index) => {
                  const previousItem = conversationItems[index - 1];
                  const showSeparator =
                    !previousItem ||
                    getConversationDateLabel(previousItem.createdAt) !==
                      getConversationDateLabel(item.createdAt);
                  const isRight = item.side === "right";

                  return (
                    <div key={item.id} className="space-y-4">
                      {showSeparator ? (
                        <div className="flex items-center gap-3 py-1">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                            {getConversationDateLabel(item.createdAt)}
                          </span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>
                      ) : null}

                      <div
                        className={`flex items-end gap-2 ${isRight ? "justify-end" : "justify-start"}`}
                      >
                        {!isRight ? (
                          <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            {getInitials(item.label)}
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                            isRight
                              ? "rounded-br-md bg-blue-500 text-white"
                              : "rounded-bl-md border border-blue-100 bg-blue-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] opacity-90">
                            <span className="font-semibold uppercase tracking-wide">
                              {item.label}
                            </span>
                            <span>
                              {getConversationTimestampLabel(item.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${isRight ? "text-white" : "text-slate-700 dark:text-slate-200"}`}
                          >
                            {item.message}
                          </p>
                          {renderAttachments(item.attachments, isRight)}
                        </div>
                        {isRight ? (
                          <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow-sm">
                            {getInitials(currentUser?.fullName || "You")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={conversationEndRef} />

              <form
                className="mt-5 space-y-3"
                onSubmit={handleSubmit(onSubmit)}
              >
                {messageValue?.trim() ? (
                  <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    Typing...
                  </div>
                ) : null}

                {pendingFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((file) => (
                      <div
                        key={getFileKey(file)}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                        <span className="max-w-36 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePendingFile(file)}
                          className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-end gap-3">
                    <Textarea
                      placeholder="Write something..."
                      className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
                      disabled={isChatClosed}
                      {...register("message")}
                      onKeyDown={handleComposerKeyDown}
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting || isChatClosed}
                      className="h-12 w-12 rounded-full p-0"
                    >
                      {isSubmitting ? (
                        <span className="inline-block animate-spin">⏳</span>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {errors.message && (
                    <p className="mt-2 px-2 text-xs text-red-500">
                      {errors.message.message}
                    </p>
                  )}
                  {showEmojiPicker ? (
                    <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendEmoji(emoji)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-base hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                          aria-label={`Add emoji ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500">
                      <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={isChatClosed}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                        aria-label="Attach files"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={openCamera}
                        disabled={isChatClosed}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                        aria-label="Open camera"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((current) => !current)}
                        disabled={isChatClosed}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                        aria-label="Emoji picker"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">
                      Enter to send, Shift+Enter for new line
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </div>
              </form>
            </div>

            {isCameraOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Camera</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Capture a photo and send it directly</p>
                    </div>
                    <Button type="button" variant="outline" onClick={closeCamera}>
                      Close
                    </Button>
                  </div>
                  <div className="space-y-4 p-4">
                    {cameraError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                        {cameraError}
                      </div>
                    ) : null}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                      <video
                        ref={cameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                    <canvas ref={cameraCanvasRef} className="hidden" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isCameraReady ? "Camera is ready." : "Waiting for camera permission..."}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={closeCamera}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={captureCameraPhoto}
                          disabled={!isCameraReady || isCapturingPhoto}
                        >
                          {isCapturingPhoto ? "Sending..." : "Capture & Send"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            ) : null}

            {showDetailsOnMobile ? (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm lg:hidden"
                onClick={() => setShowDetailsOnMobile(false)}
              >
                <div
                  className="w-full max-h-[88vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Details</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ticket information and assignment</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setShowDetailsOnMobile(false)}>
                      Close
                    </Button>
                  </div>
                  <div className="max-h-[calc(88vh-64px)] overflow-y-auto p-4">
                    {detailsPanelContent}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(ticket.tags?.length ?? 0) > 0 ? (
                  ticket.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No tags added</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attachments
                </p>
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs lg:hidden"
                  onClick={() =>
                    setShowAttachmentsOnMobile((current) => !current)
                  }
                >
                  {showAttachmentsOnMobile ? "Hide files" : "Show files"}
                </Button>
                <span className="hidden items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300 lg:inline-flex">
                  <Download className="h-3.5 w-3.5" /> Files
                </span>
              </div>
              <div
                className={`${showAttachmentsOnMobile ? "mt-2" : "mt-2 hidden lg:block"} space-y-2`}
              >
                {(ticket.attachments?.length ?? 0) > 0 ? (
                  ticket.attachments.map((attachment: any) => (
                    <a
                      key={attachment.url}
                      href={resolveAttachmentUrl(attachment.url)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {attachment.mimeType || "File"} •{" "}
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                        <Download className="h-4 w-4" /> Download
                      </span>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No files attached</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
