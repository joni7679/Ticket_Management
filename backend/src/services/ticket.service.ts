import { Department } from '../models/Department.js';
import { Ticket } from '../models/Ticket.js';
import { TicketReply } from '../models/TicketReply.js';
import { User } from '../models/User.js';
import { Types } from 'mongoose';
import { ApiError } from '../utils/api-error.js';
import { createNotification } from './notification.service.js';
import { sendTicketWhatsAppAlert } from './whatsapp.service.js';

export function generateTicketId() {
  const uniquePart = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `TCK-${Date.now().toString().slice(-6)}-${uniquePart}`;
}

export async function calculateSlaDueAt(departmentId: string, priority: string) {
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  const hours = department.slaHoursByPriority?.[priority as 'low' | 'medium' | 'high' | 'urgent'] ?? 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function autoAssignAgent(departmentId: string) {
  // Least-loaded assignment: prefer the active agent with fewest open tickets.
  const matchStage = (deptId?: string) => ({
    roleKey: 'support_agent',
    status: 'active',
    ...(deptId ? { departmentId: new Types.ObjectId(deptId) } : {})
  });

  for (const scope of [departmentId, undefined]) {
    const agents = await User.find(matchStage(scope)).select('_id').lean();
    if (agents.length === 0) continue;
    const agentIds = agents.map((a) => a._id);
    const load = await Ticket.aggregate([
      { $match: { assignedAgentId: { $in: agentIds }, status: { $nin: ['closed', 'resolved'] }, isDeleted: { $ne: true } } },
      { $group: { _id: '$assignedAgentId', count: { $sum: 1 } } }
    ]);
    const loadMap = new Map(load.map((row) => [String(row._id), row.count as number]));
    agents.sort((a, b) => (loadMap.get(String(a._id)) ?? 0) - (loadMap.get(String(b._id)) ?? 0));
    const chosen = agents[0];
    if (chosen) return String(chosen._id);
  }
  return undefined;
}

export async function createTicketWithWorkflow(input: {
  companyName?: string;
  lineOrStation: string;
  ip: string;
  currentOperatorPhoneNumber: string;
  subject: string;
  description: string;
  category: string;
  departmentId: string;
  priority: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
  assignedAgentId?: string;
}) {
  const user = await User.findById(input.createdBy).select('companyName');
  const resolvedCompanyName = input.companyName?.trim() || user?.companyName?.trim();
  if (!resolvedCompanyName) {
    throw new ApiError(400, 'Company name is missing from the user profile');
  }

  const slaDueAt = await calculateSlaDueAt(input.departmentId, input.priority);
  const assignedAgentId = input.assignedAgentId ?? (await autoAssignAgent(input.departmentId));
  const ticket = await Ticket.create({
    ticketId: generateTicketId(),
    ...input,
    companyName: resolvedCompanyName,
    assignedAgentId,
    slaDueAt,
    status: assignedAgentId ? 'assigned' : 'open',
    timeline: [
      { action: 'created', note: 'Ticket created', by: input.createdBy, metadata: { priority: input.priority } },
      ...(assignedAgentId ? [{ action: 'assigned', note: 'Auto-assigned to agent', by: assignedAgentId }] : [])
    ]
  });

  // Notify assigned agent
  if (assignedAgentId) {
    await createNotification({
      userId: assignedAgentId,
      type: 'ticket_assigned',
      title: `New ticket ${ticket.ticketId} assigned to you`,
      body: ticket.subject,
      ticketId: ticket._id.toString()
    });
  }

  // Notify admins about high-priority tickets
  if (['high', 'urgent'].includes(input.priority)) {
    const admins = await User.find({ roleKey: { $in: ['admin', 'super_admin'] } });
    for (const admin of admins) {
      if (String(admin._id) !== assignedAgentId) {
        // Don't duplicate notification to assigned agent
        await createNotification({
          userId: String(admin._id),
          type: 'ticket_created',
          title: `High-priority ticket ${ticket.ticketId} created`,
          body: ticket.subject,
          ticketId: ticket._id.toString()
        });
      }
    }
  }

  void sendTicketWhatsAppAlert({
    event: 'created',
    ticketId: ticket.ticketId,
    companyName: ticket.companyName,
    subject: ticket.subject,
    occurredAt: ticket.createdAt,
    priority: ticket.priority,
    status: ticket.status,
    actorName: input.createdByName,
    actorRole: input.createdByRole
  }).catch((error) => {
    console.error('WhatsApp alert failed for ticket creation', error);
  });

  return ticket;
}

export async function addTicketReply(input: {
  ticketId: string;
  authorId: string;
  message: string;
  isInternal?: boolean;
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
}) {
  const reply = await TicketReply.create(input);
  const messageText = input.message.trim();
  const attachmentCount = input.attachments?.length ?? 0;
  const replySummary =
    messageText ||
    (attachmentCount > 0
      ? `${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'} sent`
      : 'New reply');

  await Ticket.findByIdAndUpdate(input.ticketId, {
    lastActivityAt: new Date(),
    $push: { timeline: { action: input.isInternal ? 'internal_note' : 'reply', note: replySummary, by: input.authorId } }
  });

  const ticket = await Ticket.findById(input.ticketId).populate('assignedAgentId');
  if (ticket && !input.isInternal) {
    // For internal notes, don't send notifications
    // For public replies: notify the OTHER party (if user replies, notify agent; if agent replies, notify user)
    const authorId = input.authorId;
    const creatorId = String(ticket.createdBy);
    const agentId = ticket.assignedAgentId ? String((ticket.assignedAgentId as any)._id || ticket.assignedAgentId) : null;

    if (authorId === creatorId && agentId) {
      // User replied, notify the assigned agent
      await createNotification({
        userId: agentId,
        type: 'ticket_reply',
        title: `Reply on ticket ${ticket.ticketId}`,
        body: replySummary.substring(0, 100),
        ticketId: ticket._id.toString()
      });
    } else if (authorId !== creatorId) {
      // Agent/Admin replied, notify the ticket creator
      await createNotification({
        userId: creatorId,
        type: 'ticket_reply',
        title: `Update on ticket ${ticket.ticketId}`,
        body: replySummary.substring(0, 100),
        ticketId: ticket._id.toString()
      });
    }

    // Notify admins about high-priority ticket replies
    if (['high', 'urgent'].includes(ticket.priority)) {
      const admins = await User.find({ roleKey: { $in: ['admin', 'super_admin'] } });
      for (const admin of admins) {
        const adminId = String(admin._id);
        // Don't duplicate: skip if admin is creator, assigned agent, or the author of the reply
        if (adminId !== creatorId && adminId !== agentId && adminId !== authorId) {
          await createNotification({
            userId: adminId,
            type: 'ticket_reply',
            title: `High-priority update on ticket ${ticket.ticketId}`,
            body: replySummary.substring(0, 100),
            ticketId: ticket._id.toString()
          });
        }
      }
    }
  }

  return reply;
}
