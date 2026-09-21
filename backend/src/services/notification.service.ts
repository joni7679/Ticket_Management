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

export async function markNotificationAsRead(notificationId: string) {
  return Notification.findByIdAndUpdate(notificationId, { readAt: new Date() }, { new: true });
}
