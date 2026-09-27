import { Notification } from '../models/Notification.js';
import { Types } from 'mongoose';
import { emitToUser } from '../config/socket.js';

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  ticketId?: string;
}) {
  const notification = await Notification.create({
    userId: new Types.ObjectId(input.userId),
    type: input.type,
    title: input.title,
    body: input.body,
    ticketId: input.ticketId ? new Types.ObjectId(input.ticketId) : undefined
  });
  emitToUser(input.userId, 'notification', {
    _id: String(notification._id),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    ticketId: notification.ticketId ? String(notification.ticketId) : undefined
  });
  return notification;
}

/**
 * Bulk fan-out for high-priority alerts: one insertMany instead of
 * N sequential creates, then cheap in-memory socket emits.
 */
export async function createManyNotifications(
  inputs: Array<{ userId: string; type: string; title: string; body: string; ticketId?: string }>
) {
  if (inputs.length === 0) return [];
  const docs = inputs.map((input) => ({
    userId: new Types.ObjectId(input.userId),
    type: input.type,
    title: input.title,
    body: input.body,
    ticketId: input.ticketId ? new Types.ObjectId(input.ticketId) : undefined
  }));
  const created = await Notification.insertMany(docs);
  created.forEach((notification, index) => {
    const input = inputs[index];
    if (!input) return;
    emitToUser(input.userId, 'notification', {
      _id: String(notification._id),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      ticketId: notification.ticketId ? String(notification.ticketId) : undefined
    });
  });
  return created;
}

export async function markNotificationAsRead(notificationId: string) {
  return Notification.findByIdAndUpdate(notificationId, { readAt: new Date() }, { new: true });
}
