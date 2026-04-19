"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, BellRing, SendHorizontal, Smartphone } from "lucide-react";

type NotificationPermissionState = "default" | "denied" | "granted";

function parseApiError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/fc-push-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
  const isConfigured = publicKey.length > 0;
  const browserDetails = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        isSupported: false,
        initialPermission: "default" as NotificationPermissionState,
        showIosInstallHint: false,
      };
    }

    const isSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const initialPermission = isSupported
      ? (Notification.permission as NotificationPermissionState)
      : ("default" as NotificationPermissionState);
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    return {
      isSupported,
      initialPermission,
      showIosInstallHint: isIosDevice && !isStandalone,
    };
  }, []);
  const [permission, setPermission] = useState<NotificationPermissionState>(
    browserDetails.initialPermission,
  );
  const isSupported = browserDetails.isSupported;
  const showIosInstallHint = browserDetails.showIosInstallHint;

  const permissionLabel = useMemo(() => {
    if (permission === "granted") {
      return "Permission granted";
    }

    if (permission === "denied") {
      return "Permission denied";
    }

    return "Permission not requested";
  }, [permission]);

  useEffect(() => {
    if (!isSupported || !isConfigured) {
      return;
    }

    const initializePushState = async () => {
      try {
        const registration = await registerServiceWorker();
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      } catch {
        setError("Could not initialize push notifications on this browser.");
      }
    };

    void initializePushState();
  }, [isConfigured, isSupported]);

  const saveSubscription = async (subscription: PushSubscription) => {
    const payload = subscription.toJSON();
    const response = await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const parsed = await parseJson(response);
      throw new Error(parseApiError(parsed));
    }
  };

  const removeSubscription = async (endpoint: string) => {
    const response = await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
      }),
    });

    if (!response.ok) {
      const parsed = await parseJson(response);
      throw new Error(parseApiError(parsed));
    }
  };

  const handleEnable = async () => {
    if (!isConfigured) {
      setError("Web push is not configured yet.");
      return;
    }

    if (!isSupported) {
      setError("Push notifications are not supported on this browser.");
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsBusy(true);

    try {
      const requestedPermission =
        permission === "granted"
          ? "granted"
          : (await Notification.requestPermission()) as NotificationPermissionState;
      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        setStatusMessage(
          "Notifications were not enabled. Browser permission is required.",
        );
        return;
      }

      const registration = await registerServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await saveSubscription(subscription);
      setIsSubscribed(true);
      setStatusMessage("Notifications enabled for this device.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not enable notifications.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!isSupported) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsBusy(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await removeSubscription(endpoint);
      }

      setIsSubscribed(false);
      setStatusMessage("Notifications disabled for this device.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not disable notifications.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendTest = async () => {
    setError(null);
    setStatusMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        setError(parseApiError(payload));
        return;
      }

      setStatusMessage("Test notification sent.");
    } catch {
      setError("Could not send a test notification right now.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <article className="fc-card rounded-xl border border-[#d6c8b2] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="fc-pill">
            <BellRing className="h-4 w-4 text-sage" />
            Mobile alerts
          </p>
          <h2 className="mt-3 font-display text-2xl tracking-tight text-[#23362f]">
            Push notifications
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 fc-text-muted">
            Get alerts when family activity changes, including shopping list and
            communication updates.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#d2c3ad] bg-[#f5ead9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#5d6d64]">
          {permissionLabel}
        </div>
      </div>

      {!isConfigured ? (
        <p className="mt-3 rounded-md border border-[#d4c4ae] bg-[#fff8ef] px-3 py-2 text-sm fc-text-muted">
          Server push keys are not configured yet. Add web push env keys to enable
          this feature.
        </p>
      ) : null}

      {isConfigured && !isSupported ? (
        <p className="mt-3 rounded-md border border-[#d4c4ae] bg-[#fff8ef] px-3 py-2 text-sm fc-text-muted">
          This browser does not support web push notifications.
        </p>
      ) : null}

      {showIosInstallHint ? (
        <p className="mt-3 rounded-md border border-[#d4c4ae] bg-[#fff8ef] px-3 py-2 text-sm fc-text-muted">
          iPhone/iPad tip: add Family Cloud to your Home Screen first, then enable
          notifications.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-[#d9b6a1] bg-[#fff0e7] px-3 py-2 text-xs font-semibold text-[#8f4325]">
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="mt-3 rounded-md border border-[#c7d7c8] bg-[#edf7ee] px-3 py-2 text-xs font-semibold text-[#34563f]">
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={isBusy || !isConfigured || !isSupported || isSubscribed}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#a08062] bg-[#b86642] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#9d5737] disabled:opacity-70"
        >
          <Bell className="h-3.5 w-3.5" />
          {isSubscribed ? "Enabled" : "Enable alerts"}
        </button>

        <button
          type="button"
          onClick={handleDisable}
          disabled={isBusy || !isSupported || !isSubscribed}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#c6b6a1] bg-[#f7eddd] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#4f5d55] transition hover:border-[#b8a183] hover:text-[#2b3b34] disabled:opacity-70"
        >
          <BellOff className="h-3.5 w-3.5" />
          Disable
        </button>

        <button
          type="button"
          onClick={handleSendTest}
          disabled={isBusy || !isConfigured || !isSupported || !isSubscribed}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#c6b6a1] bg-[#f7eddd] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#4f5d55] transition hover:border-[#b8a183] hover:text-[#2b3b34] disabled:opacity-70"
        >
          <SendHorizontal className="h-3.5 w-3.5" />
          Send test
        </button>
      </div>

      <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a726d]">
        <Smartphone className="h-3.5 w-3.5 text-[#5a6e63]" />
        Alerts are per device, so enable on each phone/tablet you use.
      </p>
    </article>
  );
}
