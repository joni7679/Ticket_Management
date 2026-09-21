import type { Request, Response } from 'express';
import { Ticket } from '../models/Ticket.js';
import { TicketReply } from '../models/TicketReply.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createNotification } from '../services/notification.service.js';
import { logAudit } from '../services/audit.service.js';
import { addTicketReply, createTicketWithWorkflow } from '../services/ticket.service.js';
import { sendTicketWhatsAppAlert } from '../services/whatsapp.service.js';
import { isValidImageType } from '../middleware/upload.js';

function buildAttachments(files: Express.Multer.File[] | undefined) {
  return (files ?? []).map((file) => {
    // Determine subdirectory based on file type
    let subdir = 'documents';
    if (isValidImageType(file.mimetype)) {
      subdir = 'images';
    }
    
    return {
      name: file.originalname,
      url: `/uploads/${subdir}/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size
    };
  });
}

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, departmentId, assignedAgentId, q, page = '1', limit = '10', sort = '-createdAt', companyName, lineOrStation, ip, currentOperatorPhoneNumber } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { isDeleted: false };

  if (req.user?.roleKey === 'user') {
    filter.createdBy = req.user._id;
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (departmentId) filter.departmentId = departmentId;
  if (assignedAgentId) filter.assignedAgentId = assignedAgentId;
  if (q) {
    filter.$or = [
      { subject: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { ticketId: { $regex: q, $options: 'i' } }
    ];
  }

  if (companyName) filter.companyName = { $regex: companyName, $options: 'i' };
  if (lineOrStation) filter.lineOrStation = { $regex: lineOrStation, $options: 'i' };
  if (ip) filter.ip = { $regex: ip, $options: 'i' };
  if (currentOperatorPhoneNumber) filter.currentOperatorPhoneNumber = { $regex: currentOperatorPhoneNumber, $options: 'i' };

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (pageNumber - 1) * pageSize;

  const [items, total] = await Promise.all([
    Ticket.find(filter).sort(sort).skip(skip).limit(pageSize).populate('departmentId assignedAgentId createdBy'),
    Ticket.countDocuments(filter)
  ]);

  res.json({ items, pagination: { total, page: pageNumber, limit: pageSize } });
});

export const listAssignableUsers = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.query as { departmentId?: string };
  const filter: Record<string, unknown> = {
    status: 'active',
    roleKey: { $in: ['support_agent', 'admin', 'super_admin'] }
  };

  if (departmentId) {
    filter.departmentId = departmentId;
  }

  const items = await User.find(filter)
    .select('fullName email roleKey departmentId')
    .populate('departmentId', 'name slug')
    .sort({ fullName: 1 });

  res.json({ items });
});

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await createTicketWithWorkflow({
    ...req.body,
    companyName: req.user?.companyName ?? req.body.companyName,
    createdBy: req.user!._id.toString(),
    createdByName: req.user?.fullName,
    createdByRole: req.user?.roleKey,
    attachments: buildAttachments(req.files as Express.Multer.File[] | undefined)
  });

  await logAudit({ actorId: req.user?._id.toString(), action: 'create_ticket', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.status(201).json({ ticket });
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id).populate('departmentId assignedAgentId createdBy timeline.by');
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  // Check permissions based on role
  const ticketCreatorId = ticket.createdBy && (ticket.createdBy as any)._id ? String((ticket.createdBy as any)._id) : String(ticket.createdBy);
  const ticketAssignedId = ticket.assignedAgentId && (ticket.assignedAgentId as any)._id ? String((ticket.assignedAgentId as any)._id) : String(ticket.assignedAgentId);
  const isCreator = String(req.user?._id) === ticketCreatorId;
  const isAssigned = String(req.user?._id) === ticketAssignedId;

  // Users can only view tickets they created or are assigned to
  // Agents, admins and super admins can view any ticket
  if (req.user?.roleKey === 'user' && !isCreator && !isAssigned) {
    throw new ApiError(403, 'You do not have permission to view this ticket');
  }

  // Agents can view any ticket
  // Admins can view any ticket
  // Super admins can view any ticket

  const replies = await TicketReply.find({ ticketId: ticket._id }).populate('authorId');
  res.json({ ticket, replies });
});

export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id).populate('createdBy assignedAgentId');
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  const ticketCreatorId = String(ticket.createdBy?._id ?? ticket.createdBy);
  const ticketAssignedId = ticket.assignedAgentId ? String(ticket.assignedAgentId._id ?? ticket.assignedAgentId) : null;
  const isCreator = String(req.user?._id) === ticketCreatorId;
  const isAssigned = ticketAssignedId ? String(req.user?._id) === ticketAssignedId : false;
  const isAdmin = ['admin', 'super_admin'].includes(req.user?.roleKey || '');
  const isAgent = req.user?.roleKey === 'support_agent';

  // Only creator, assigned agent, admin, or support agent can update
  if (!isCreator && !isAssigned && !isAdmin && !isAgent) {
    throw new ApiError(403, 'You do not have permission to update this ticket');
  }

  const previousStatus = ticket.status;
  Object.assign(ticket, req.body);
  ticket.lastActivityAt = new Date();

  // If engineer/agent marks resolved, move to pending user approval instead of closing immediately
  if (req.body.status === 'resolved' && previousStatus !== 'resolved') {
    ticket.status = 'pending_user_approval';
    ticket.timeline.push({ action: 'marked_resolved_pending_approval', note: 'Marked resolved and awaiting user approval', by: req.user?._id.toString(), metadata: {} });
    await ticket.save();

    await createNotification({
      userId: ticketCreatorId,
      type: 'ticket_pending_user_approval',
      title: `Ticket ${ticket.ticketId} resolved — pending your approval`,
      body: `Ticket has been marked resolved. Please review and approve or reject.`,
      ticketId: ticket._id.toString()
    });

    await logAudit({ actorId: req.user?._id.toString(), action: 'mark_resolved_pending_user_approval', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
    res.json({ ticket });
    return;
  }

  // Closed state handling
  if (req.body.status === 'closed' && previousStatus !== 'closed') {
    ticket.closedAt = new Date();
  }

  ticket.timeline.push({ action: 'updated', note: 'Ticket updated', by: req.user?._id.toString(), metadata: req.body });
  await ticket.save();

  if (req.body.status === 'closed' && previousStatus !== 'closed') {
    await createNotification({
      userId: ticketCreatorId,
      type: 'ticket_resolved',
      title: `Ticket ${ticket.ticketId} updated`,
      body: `Status changed to ${req.body.status}`,
      ticketId: ticket._id.toString()
    });

    void sendTicketWhatsAppAlert({
      event: 'closed',
      ticketId: ticket.ticketId,
      companyName: ticket.companyName,
      subject: ticket.subject,
      occurredAt: ticket.closedAt ?? new Date(),
      status: ticket.status,
      priority: ticket.priority,
      actorName: req.user?.fullName,
      actorRole: req.user?.roleKey
    }).catch((error) => {
      console.error('WhatsApp alert failed for ticket close', error);
    });
  }

  await logAudit({ actorId: req.user?._id.toString(), action: 'update_ticket', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ ticket });
});

export const assignTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id).populate('createdBy assignedAgentId');
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  const isAdmin = ['admin', 'super_admin'].includes(req.user?.roleKey || '');
  const isAgent = req.user?.roleKey === 'support_agent';

  // Only admins, super admins, and support agents can assign tickets
  if (!isAdmin && !isAgent) {
    throw new ApiError(403, 'You do not have permission to assign tickets');
  }

  const assignee = await User.findById(req.body.assignedAgentId);
  if (!assignee || assignee.status !== 'active') {
    throw new ApiError(404, 'Assignee not found or inactive');
  }

  if (!['support_agent', 'admin', 'super_admin'].includes(assignee.roleKey)) {
    throw new ApiError(400, 'Selected user cannot be assigned to tickets');
  }

  ticket.assignedAgentId = req.body.assignedAgentId;
  ticket.status = 'assigned';
  ticket.timeline.push({ action: 'assigned', note: `Ticket assigned to ${assignee.fullName}`, by: req.user?._id.toString(), metadata: req.body });
  await ticket.save();
  await createNotification({ userId: req.body.assignedAgentId, type: 'ticket_assigned', title: `Ticket ${ticket.ticketId} assigned`, body: ticket.subject, ticketId: ticket._id.toString() });
  await logAudit({ actorId: req.user?._id.toString(), action: 'assign_ticket', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ ticket });
});

export const changeTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id).populate('createdBy assignedAgentId');
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  const ticketCreatorId = String(ticket.createdBy?._id ?? ticket.createdBy);
  const ticketAssignedId = ticket.assignedAgentId ? String(ticket.assignedAgentId._id ?? ticket.assignedAgentId) : null;
  const isCreator = String(req.user?._id) === ticketCreatorId;
  const isAssigned = ticketAssignedId ? String(req.user?._id) === ticketAssignedId : false;
  const isAdmin = ['admin', 'super_admin'].includes(req.user?.roleKey || '');
  const isAgent = req.user?.roleKey === 'support_agent';

  // Only creator, assigned agent, admin, or support agent can change status
  if (!isCreator && !isAssigned && !isAdmin && !isAgent) {
    throw new ApiError(403, 'You do not have permission to change ticket status');
  }

  const previousStatus = ticket.status;
  // If engineer marks resolved, set to pending user approval
  if (req.body.status === 'resolved') {
    ticket.status = 'pending_user_approval';
    ticket.timeline.push({ action: 'marked_resolved_pending_approval', note: 'Marked resolved and awaiting user approval', by: req.user?._id.toString(), metadata: {} });
    await ticket.save();

    await createNotification({
      userId: ticketCreatorId,
      type: 'ticket_pending_user_approval',
      title: `Ticket ${ticket.ticketId} resolved — pending your approval`,
      body: `Ticket has been marked resolved. Please review and approve or reject.`,
      ticketId: ticket._id.toString()
    });

    await logAudit({ actorId: req.user?._id.toString(), action: 'mark_resolved_pending_user_approval', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
    res.json({ ticket });
    return;
  }

  ticket.status = req.body.status;
  if (req.body.status === 'closed') {
    ticket.closedAt = new Date();
    // Notify ticket creator
    await createNotification({ userId: ticketCreatorId, type: 'ticket_resolved', title: `Ticket ${ticket.ticketId} updated`, body: `Status changed to ${req.body.status}`, ticketId: ticket._id.toString() });
    // Notify admins about high-priority resolved tickets
    if (['high', 'urgent'].includes(ticket.priority)) {
      const admins = await User.find({ roleKey: { $in: ['admin', 'super_admin'] } });
      for (const admin of admins) {
        if (String(admin._id) !== ticketCreatorId) {
          await createNotification({ userId: String(admin._id), type: 'ticket_resolved', title: `High-priority ticket ${ticket.ticketId} ${req.body.status}`, body: ticket.subject, ticketId: ticket._id.toString() });
        }
      }
    }
  }
  if (req.body.status === 'reopened') {
    ticket.reopenedCount += 1;
  }
  ticket.timeline.push({ action: 'status_changed', note: `Status changed to ${req.body.status}`, by: req.user?._id.toString(), metadata: { status: req.body.status } });
  await ticket.save();

  if (req.body.status === 'resolved' || req.body.status === 'closed') {
    if (previousStatus !== req.body.status) {
      void sendTicketWhatsAppAlert({
        event: 'closed',
        ticketId: ticket.ticketId,
        companyName: ticket.companyName,
        subject: ticket.subject,
        occurredAt: ticket.closedAt ?? new Date(),
        status: ticket.status,
        priority: ticket.priority,
        actorName: req.user?.fullName,
        actorRole: req.user?.roleKey
      }).catch((error) => {
        console.error('WhatsApp alert failed for ticket close', error);
      });
    }
  }
  res.json({ ticket });
});

export const userApproval = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  // Only ticket creator can approve/reject
  const creatorId = ticket.createdBy && (ticket.createdBy as any)._id ? String((ticket.createdBy as any)._id) : String(ticket.createdBy);
  if (String(req.user?._id) !== creatorId) {
    throw new ApiError(403, 'Only the ticket creator can approve or reject resolution');
  }

  const { action, feedback } = req.body as { action: 'approve' | 'reject'; feedback?: string };

  if (action === 'approve') {
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.timeline.push({ action: 'user_approved', note: feedback ?? 'Approved by user', by: req.user?._id.toString(), metadata: { feedback } });
    await ticket.save();

    // Notify assigned agent
    if (ticket.assignedAgentId) {
      await createNotification({ userId: String(ticket.assignedAgentId), type: 'ticket_user_approved', title: `Ticket ${ticket.ticketId} approved by user`, body: feedback ?? 'Ticket approved', ticketId: ticket._id.toString() });
    }

    await logAudit({ actorId: req.user?._id.toString(), action: 'user_approved_ticket', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });

    void sendTicketWhatsAppAlert({
      event: 'closed',
      ticketId: ticket.ticketId,
      companyName: ticket.companyName,
      subject: ticket.subject,
      occurredAt: ticket.closedAt ?? new Date(),
      status: ticket.status,
      priority: ticket.priority,
      actorName: req.user?.fullName,
      actorRole: req.user?.roleKey
    }).catch((error) => {
      console.error('WhatsApp alert failed for ticket user approval', error);
    });

    res.json({ ticket });
    return;
  }

  // reject
  if (action === 'reject') {
    if (!feedback || String(feedback).trim().length === 0) {
      throw new ApiError(400, 'Feedback is required when rejecting a resolution');
    }

    ticket.status = 'pending';
    ticket.timeline.push({ action: 'user_rejected', note: feedback, by: req.user?._id.toString(), metadata: { feedback } });
    ticket.lastActivityAt = new Date();
    await ticket.save();

    // Notify assigned agent so it appears on their dashboard
    if (ticket.assignedAgentId) {
      await createNotification({ userId: String(ticket.assignedAgentId), type: 'ticket_rejected_by_user', title: `Ticket ${ticket.ticketId} rejected by user`, body: feedback, ticketId: ticket._id.toString() });
    }

    await logAudit({ actorId: req.user?._id.toString(), action: 'user_rejected_ticket', entityType: 'Ticket', entityId: ticket._id.toString(), after: ticket, ip: req.ip, userAgent: req.get('user-agent') ?? '' });

    res.json({ ticket });
    return;
  }

  throw new ApiError(400, 'Invalid action');
});

export const replyToTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket || ticket.isDeleted) {
    throw new ApiError(404, 'Ticket not found');
  }

  // Check permissions - allow creator, assigned agent, or admin/super_admin
  const isCreator = ticket.createdBy && (ticket.createdBy as any)._id ? String((ticket.createdBy as any)._id) === String(req.user?._id) : String(ticket.createdBy) === String(req.user?._id);
  const isAssigned = ticket.assignedAgentId && (ticket.assignedAgentId as any)._id ? String((ticket.assignedAgentId as any)._id) === String(req.user?._id) : String(ticket.assignedAgentId) === String(req.user?._id);

  // Users can only reply to tickets they created or are assigned to
  // Agents, admins and super admins can reply to any ticket
  if (req.user?.roleKey === 'user' && !isCreator && !isAssigned) {
    throw new ApiError(403, 'You do not have permission to reply to this ticket');
  }

  // Agents can reply to any ticket
  // Admins can reply to any ticket
  // Super admins can reply to any ticket

  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  const attachments = buildAttachments(req.files as Express.Multer.File[] | undefined);
  if (!message && attachments.length === 0) {
    throw new ApiError(400, 'Reply cannot be empty');
  }

  const reply = await addTicketReply({
    ticketId: String(req.params.id),
    authorId: req.user!._id.toString(),
    message,
    isInternal: req.body.isInternal,
    attachments
  });
  const populatedReply = await TicketReply.findById(reply._id).populate('authorId');
  res.status(201).json({ reply: populatedReply });
});

export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }
  res.status(204).send();
});
