"use client";

import { api } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  news_enabled: boolean;
  chat_enabled: boolean;
  calls_enabled: boolean;
}

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_count: number;
}

// ---------------------------------------------------------------------------
// VAPID helper
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ---------------------------------------------------------------------------
// Push permission & subscription
// ---------------------------------------------------------------------------

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPermissionState(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

/**
 * Subscribe to Web Push notifications.
 * Requests notification permission, subscribes via PushManager,
 * and registers the subscription on the backend.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    const supported = await isPushSupported();
    if (!supported) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await getRegistration();
    if (!registration) return false;

    // Fetch VAPID public key from backend
    const { vapid_public_key } = await api.get<{ vapid_public_key: string }>(
      "/api/v1/users/notifications/vapid-key",
    );
    if (!vapid_public_key) return false;

    const applicationServerKey = urlBase64ToUint8Array(vapid_public_key);

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    const subJson = subscription.toJSON();
    const keys = subJson.keys || {};

    // Register on backend
    await api.post("/api/v1/users/notifications/subscribe", {
      endpoint: subJson.endpoint,
      p256dh: keys.p256dh || "",
      auth_key: keys.auth || "",
    });

    return true;
  } catch (err) {
    console.error("[Notifications] Subscribe failed:", err);
    return false;
  }
}

/**
 * Unsubscribe from Web Push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await getRegistration();
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const subJson = subscription.toJSON();
    const keys = subJson.keys || {};

    // Unregister on backend
    await api.post("/api/v1/users/notifications/unsubscribe", {
      endpoint: subJson.endpoint,
      p256dh: keys.p256dh || "",
      auth_key: keys.auth || "",
    });

    await subscription.unsubscribe();
    return true;
  } catch (err) {
    console.error("[Notifications] Unsubscribe failed:", err);
    return false;
  }
}

/**
 * Check if the user is currently subscribed on this device.
 */
export async function isSubscribedOnDevice(): Promise<boolean> {
  try {
    const registration = await getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>("/api/v1/users/notifications/preferences");
}

export async function updateNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  return api.put<NotificationPreferences>("/api/v1/users/notifications/preferences", prefs);
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return api.get<SubscriptionStatus>("/api/v1/users/notifications/status");
}
