"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";

/* global JitsiMeetExternalAPI type (loaded dynamically via script tag) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JitsiAPI = any;

interface JitsiMeetProps {
  /** Jitsi server domain, e.g. "meet.jit.si" or "8x8.vc" */
  domain: string;
  /** Room name (for JaaS this includes the appId prefix) */
  roomName: string;
  /** JWT token for JaaS authentication (empty string for free Jitsi) */
  jwt?: string;
  /** Display name shown in the call */
  displayName: string;
  /** Called when the user hangs up or closes the Jitsi meeting */
  onReadyToClose?: () => void;
  /** Called when a participant joins */
  onParticipantJoined?: (participant: {
    id: string;
    displayName: string;
  }) => void;
  /** Called when a participant leaves */
  onParticipantLeft?: (participant: { id: string }) => void;
}

type LoadState = "loading" | "ready" | "error";

export default function JitsiMeet({
  domain,
  roomName,
  jwt,
  displayName,
  onReadyToClose,
  onParticipantJoined,
  onParticipantLeft,
}: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const mountedRef = useRef(true);
  const initAttemptedRef = useRef(false);

  // Stable callback refs
  const onCloseRef = useRef(onReadyToClose);
  onCloseRef.current = onReadyToClose;
  const onJoinRef = useRef(onParticipantJoined);
  onJoinRef.current = onParticipantJoined;
  const onLeftRef = useRef(onParticipantLeft);
  onLeftRef.current = onParticipantLeft;

  const meetingUrl = jwt
    ? `https://${domain}/${roomName}?jwt=${jwt}`
    : `https://${domain}/${roomName}`;

  const initJitsi = useCallback(() => {
    if (!containerRef.current || apiRef.current || initAttemptedRef.current)
      return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) {
      console.error("[JitsiMeet] JitsiMeetExternalAPI not found on window");
      if (mountedRef.current) {
        setLoadState("error");
        setErrorMsg("Jitsi External API not available");
      }
      return;
    }

    initAttemptedRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      roomName,
      parentNode: containerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName,
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        enableClosePage: false,
        hideConferenceSubject: false,
        toolbarButtons: [
          "camera",
          "chat",
          "closedcaptions",
          "desktop",
          "fullscreen",
          "hangup",
          "microphone",
          "participants-pane",
          "raisehand",
          "select-background",
          "settings",
          "tileview",
          "toggle-camera",
        ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        FILM_STRIP_MAX_HEIGHT: 120,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
      },
    };

    if (jwt) {
      options.jwt = jwt;
    }

    try {
      console.log("[JitsiMeet] Creating JitsiMeetExternalAPI", {
        domain,
        roomName,
        hasJwt: !!jwt,
      });

      apiRef.current = new JitsiMeetExternalAPI(domain, options);

      apiRef.current.addEventListener("videoConferenceJoined", () => {
        console.log("[JitsiMeet] Conference joined successfully");
        if (mountedRef.current) setLoadState("ready");
      });

      apiRef.current.addEventListener("readyToClose", () => {
        onCloseRef.current?.();
      });

      apiRef.current.addEventListener(
        "participantJoined",
        (evt: { id: string; displayName: string }) => {
          onJoinRef.current?.(evt);
        }
      );

      apiRef.current.addEventListener(
        "participantLeft",
        (evt: { id: string }) => {
          onLeftRef.current?.(evt);
        }
      );

      // If videoConferenceJoined doesn't fire within 10s, still mark as ready
      // (the Jitsi iframe might be showing its own UI already)
      setTimeout(() => {
        if (mountedRef.current && loadState === "loading") {
          setLoadState("ready");
        }
      }, 10000);
    } catch (err) {
      console.error("[JitsiMeet] Failed to initialize Jitsi:", err);
      if (mountedRef.current) {
        setLoadState("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to initialize Jitsi"
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, roomName, jwt, displayName]);

  useEffect(() => {
    mountedRef.current = true;
    initAttemptedRef.current = false;
    setLoadState("loading");
    setErrorMsg("");

    const scriptSrc = `https://${domain}/external_api.js`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).JitsiMeetExternalAPI) {
      console.log("[JitsiMeet] External API already loaded, initializing...");
      initJitsi();
      return () => {
        mountedRef.current = false;
        if (apiRef.current) {
          try {
            apiRef.current.dispose();
          } catch {
            /* ignore */
          }
          apiRef.current = null;
        }
      };
    }

    // Remove any stale script tags for this domain
    document
      .querySelectorAll(`script[src="${scriptSrc}"]`)
      .forEach((s) => s.remove());

    console.log("[JitsiMeet] Loading External API from", scriptSrc);

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;

    script.onload = () => {
      console.log("[JitsiMeet] External API script loaded");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).JitsiMeetExternalAPI) {
        console.error(
          "[JitsiMeet] Script loaded but JitsiMeetExternalAPI not found"
        );
        if (mountedRef.current) {
          setLoadState("error");
          setErrorMsg("Script loaded but API not available");
        }
        return;
      }
      if (mountedRef.current) {
        initJitsi();
      }
    };

    script.onerror = () => {
      console.error("[JitsiMeet] Failed to load script from", scriptSrc);
      if (mountedRef.current) {
        setLoadState("error");
        setErrorMsg(`Failed to load Jitsi from ${domain}`);
      }
    };

    document.head.appendChild(script);

    return () => {
      mountedRef.current = false;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          /* ignore */
        }
        apiRef.current = null;
      }
    };
  }, [domain, roomName, initJitsi]);

  const handleRetry = () => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    }
    initAttemptedRef.current = false;
    setLoadState("loading");
    setErrorMsg("");

    const scriptSrc = `https://${domain}/external_api.js`;
    document
      .querySelectorAll(`script[src="${scriptSrc}"]`)
      .forEach((s) => s.remove());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).JitsiMeetExternalAPI;

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      if (mountedRef.current) initJitsi();
    };
    script.onerror = () => {
      if (mountedRef.current) {
        setLoadState("error");
        setErrorMsg(`Failed to load Jitsi from ${domain}`);
      }
    };
    document.head.appendChild(script);
  };

  return (
    <div className="relative w-full h-[60vh] rounded-xl overflow-hidden border border-surface-700 bg-surface-950">
      {/* Jitsi container — always mounted so the API can attach the iframe */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loadState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950/90 z-10">
          <div className="h-10 w-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-surface-300 text-sm">Loading video call...</p>
          <p className="text-surface-500 text-xs mt-1">
            Connecting to {domain}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {loadState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950/95 z-10 px-6">
          <AlertTriangle className="h-10 w-10 text-warning-400 mb-3" />
          <p className="text-surface-200 font-medium mb-1">
            Could not load the video call
          </p>
          {errorMsg && (
            <p className="text-surface-500 text-xs mb-4 text-center">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in browser
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
