// ============================================================
// MONDEGA DIGITAL — Push Notifications (Firebase FCM)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);
  private readonly messaging: admin.messaging.Messaging;

  constructor(private readonly config: ConfigService) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.getOrThrow('FIREBASE_PROJECT_ID'),
          privateKey: config.getOrThrow<string>('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
          clientEmail: config.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        }),
      });
    }
    this.messaging = admin.messaging();
  }

  async sendToDevice(token: string, notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }): Promise<string> {
    try {
      const messageId = await this.messaging.send({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'mondega-transactions',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: { title: notification.title, body: notification.body },
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      this.logger.log(`Push sent: ${messageId}`);
      return messageId;

    } catch (err) {
      this.logger.error(`Push failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendToTopic(topic: string, notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<string> {
    const messageId = await this.messaging.send({
      topic,
      notification: { title: notification.title, body: notification.body },
      data: notification.data,
    });
    return messageId;
  }

  async sendBatch(tokens: string[], notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<{ successCount: number; failureCount: number }> {
    const response = await this.messaging.sendEachForMulticast({
      tokens,
      notification: { title: notification.title, body: notification.body },
      data: notification.data,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
}
