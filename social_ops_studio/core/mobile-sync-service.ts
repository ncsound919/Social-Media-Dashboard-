/**
 * Mobile Sync Service
 * Platform-Specific Fidelity: Hybrid manual publishing with mobile companion
 */

import { v4 as uuidv4 } from 'uuid';
import { ScheduledPost, PostDraft, Platform } from '../data/models';

export interface MobileSyncNotification {
  id: string;
  postDraftId: string;
  scheduledPostId: string;
  platform: Platform;
  mediaUrls: string[];
  caption: string;
  scheduledFor: Date;
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  createdAt: Date;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
}

export interface MobileDevice {
  id: string;
  deviceToken: string;
  deviceName: string;
  platform: 'ios' | 'android';
  lastSyncAt: Date;
  isActive: boolean;
}

export class MobileSyncService {
  private readonly notificationsKey = 'mobile_sync_notifications';
  private readonly devicesKey = 'mobile_devices';

  /**
   * Register a mobile device
   */
  registerDevice(
    deviceToken: string,
    deviceName: string,
    platform: 'ios' | 'android'
  ): MobileDevice {
    const device: MobileDevice = {
      id: uuidv4(),
      deviceToken,
      deviceName,
      platform,
      lastSyncAt: new Date(),
      isActive: true,
    };

    const devices = this.getAllDevices();
    
    // Check if device already exists
    const existingIndex = devices.findIndex(d => d.deviceToken === deviceToken);
    if (existingIndex >= 0) {
      devices[existingIndex] = device;
    } else {
      devices.push(device);
    }

    this.saveAllDevices(devices);
    return device;
  }

  /**
   * Create a mobile sync notification for hybrid publishing
   */
  createMobileSyncNotification(
    postDraft: PostDraft,
    scheduledPost: ScheduledPost,
    platform: Platform
  ): MobileSyncNotification {
    const platformVariant = postDraft.platformVariants[platform];
    
    const notification: MobileSyncNotification = {
      id: uuidv4(),
      postDraftId: postDraft.id,
      scheduledPostId: scheduledPost.id,
      platform,
      mediaUrls: this.getMediaUrls(platformVariant?.mediaIds || []),
      caption: platformVariant?.body || postDraft.bodyRich,
      scheduledFor: scheduledPost.scheduledFor,
      status: 'pending',
      createdAt: new Date(),
      acknowledgedAt: null,
      completedAt: null,
    };

    const notifications = this.getAllNotifications();
    notifications.push(notification);
    this.saveAllNotifications(notifications);

    // Send push notification to registered devices
    this.sendPushNotification(notification);

    return notification;
  }

  /**
   * Acknowledge a mobile sync notification
   */
  acknowledgeNotification(notificationId: string): MobileSyncNotification | null {
    const notifications = this.getAllNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) return null;

    notification.status = 'acknowledged';
    notification.acknowledgedAt = new Date();
    this.saveAllNotifications(notifications);

    return notification;
  }

  /**
   * Mark a notification as completed
   */
  completeNotification(notificationId: string): MobileSyncNotification | null {
    const notifications = this.getAllNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) return null;

    notification.status = 'completed';
    notification.completedAt = new Date();
    this.saveAllNotifications(notifications);

    return notification;
  }

  /**
   * Cancel a mobile sync notification
   */
  cancelNotification(notificationId: string): MobileSyncNotification | null {
    const notifications = this.getAllNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) return null;

    notification.status = 'cancelled';
    this.saveAllNotifications(notifications);

    return notification;
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): MobileSyncNotification[] {
    return this.getAllNotifications().filter(n => n.status === 'pending');
  }

  /**
   * Get notifications for a specific post
   */
  getPostNotifications(postDraftId: string): MobileSyncNotification[] {
    return this.getAllNotifications().filter(n => n.postDraftId === postDraftId);
  }

  /**
   * Generate a shareable link for mobile publishing
   */
  generateMobilePublishLink(notification: MobileSyncNotification): string {
    // In a real implementation, this would generate a deep link
    // that opens the mobile app with pre-filled content
    const baseUrl = 'socialops://publish';
    const params = new URLSearchParams({
      id: notification.id,
      platform: notification.platform,
      caption: notification.caption,
      scheduled: notification.scheduledFor.toISOString(),
    });

    // Add media URLs
    notification.mediaUrls.forEach((url, index) => {
      params.append(`media${index}`, url);
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get notification payload for push notification
   */
  getNotificationPayload(notification: MobileSyncNotification): {
    title: string;
    body: string;
    data: Record<string, string>;
  } {
    const timeUntil = this.getTimeUntilScheduled(notification.scheduledFor);
    
    return {
      title: `Time to publish on ${notification.platform}`,
      body: `${notification.caption.substring(0, 100)}... - Publishing in ${timeUntil}`,
      data: {
        notificationId: notification.id,
        postDraftId: notification.postDraftId,
        platform: notification.platform,
        deepLink: this.generateMobilePublishLink(notification),
      },
    };
  }

  /**
   * Check if platform should use mobile publishing
   */
  shouldUseMobilePublishing(platform: Platform): boolean {
    // Platforms where native mobile features are critical
    return ['tiktok', 'instagram_business', 'threads'].includes(platform);
  }

  /**
   * Get time until scheduled in human-readable format
   */
  private getTimeUntilScheduled(scheduledFor: Date): string {
    const now = new Date();
    const diff = new Date(scheduledFor).getTime() - now.getTime();
    
    if (diff < 0) return 'now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'now';
  }

  /**
   * Get media URLs from media IDs
   * In a real implementation, this would fetch actual URLs from storage
   */
  private getMediaUrls(mediaIds: string[]): string[] {
    // Placeholder - in real implementation, fetch from media storage
    return mediaIds.map(id => `/media/${id}`);
  }

  /**
   * Send push notification to registered devices
   * In a real implementation, this would use a push notification service
   */
  private sendPushNotification(notification: MobileSyncNotification): void {
    const devices = this.getAllDevices().filter(d => d.isActive);
    const payload = this.getNotificationPayload(notification);

    // Log for debugging (in production, this would send to push service)
    console.log('Sending push notification to', devices.length, 'devices:', payload);
    
    // In a real implementation:
    // - Use Firebase Cloud Messaging (FCM) for Android
    // - Use Apple Push Notification service (APNs) for iOS
    // - Send the payload with the device tokens
  }

  /**
   * Get all mobile devices
   */
  private getAllDevices(): MobileDevice[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.devicesKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((device: any) => ({
        ...device,
        lastSyncAt: new Date(device.lastSyncAt),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all mobile devices
   */
  private saveAllDevices(devices: MobileDevice[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.devicesKey, JSON.stringify(devices));
  }

  /**
   * Get all notifications
   */
  private getAllNotifications(): MobileSyncNotification[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.notificationsKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((notification: any) => ({
        ...notification,
        scheduledFor: new Date(notification.scheduledFor),
        createdAt: new Date(notification.createdAt),
        acknowledgedAt: notification.acknowledgedAt ? new Date(notification.acknowledgedAt) : null,
        completedAt: notification.completedAt ? new Date(notification.completedAt) : null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all notifications
   */
  private saveAllNotifications(notifications: MobileSyncNotification[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.notificationsKey, JSON.stringify(notifications));
  }
}
