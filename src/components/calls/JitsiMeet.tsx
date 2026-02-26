"use client";

import { useEffect, useRef, useCallback } from "react";

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
  onParticipantJoined?: (participant: { id: string; displayName: string }) => void;
  /** Called when a participant leaves */
  onParticipantLeft?: (participant: { id: string }) => void;
}

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
  const scriptLoadedRef = useRef(false);

  // Stable callback refs to avoid re-mounting Jitsi on every render
  const onCloseRef = useRef(onReadyToClose);
  onCloseRef.current = onReadyToClose;
  const onJoinRef = useRef(onParticipantJoined);
  onJoinRef.current = onParticipantJoined;
  const onLeftRef = useRef(onParticipantLeft);
  onLeftRef.current = onParticipantLeft;

  const initJitsi = useCallback(() => {
    if (!containerRef.current || apiRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) return;

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
        // Toolbox configuration
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
      apiRef.current = new JitsiMeetExternalAPI(domain, options);

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
    } catch (err) {
      console.error("Failed to initialize Jitsi:", err);
    }
  }, [domain, roomName, jwt, displayName]);

  useEffect(() => {
    // Check if script is already loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).JitsiMeetExternalAPI) {
      scriptLoadedRef.current = true;
      initJitsi();
      return () => {
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      };
    }

    // Check if script tag already exists (e.g. from a previous mount)
    const existingScript = document.querySelector(
      `script[src="https://${domain}/external_api.js"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        scriptLoadedRef.current = true;
        initJitsi();
      });
      // If already loaded
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).JitsiMeetExternalAPI) {
        scriptLoadedRef.current = true;
        initJitsi();
      }
      return () => {
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      };
    }

    // Load the external API script
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      initJitsi();
    };

    script.onerror = () => {
      console.error(
        `Failed to load Jitsi External API from https://${domain}/external_api.js`
      );
    };

    document.head.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      // Don't remove the script — may be needed on re-render
    };
  }, [domain, initJitsi]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[60vh] rounded-xl overflow-hidden border border-surface-700 bg-surface-950"
    />
  );
}
