import type { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/async-handler.js';
import { markNotificationAsRead } from '../services/notification.service.js';
import { ApiError } from '../utils/api-error.js';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await Notification.find({ userId: req.user?._id }).sort({ createdAt: -1 });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ items: notifications });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user?._id });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  const updated = await markNotificationAsRead(String(notification._id));
  res.json({ notification: updated });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user?._id });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  res.json({ message: 'Notification deleted' });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ userId: req.user?._id, readAt: null }, { readAt: new Date() });
  res.json({ message: 'All notifications marked as read' });
});

export const deleteAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  await Notification.deleteMany({ userId: req.user?._id });
  res.json({ message: 'All notifications deleted' });
});
