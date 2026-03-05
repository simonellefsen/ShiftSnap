"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  encounterId: string;
  interactionId: string;
  initialStatus: string;
};

type LiveStatus = "idle" | "starting" | "streaming" | "stopping" | "error";

function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, targetRate: number) {
  if (targetRate === inputRate) return buffer;
  if (targetRate > inputRate) return buffer;

  const ratio = inputRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = accum / Math.max(count, 1);
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export default function LiveCapturePanel({ encounterId, interactionId, initialStatus }: Props) {
  const router = useRouter();
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>("-");
  const liveStatusRef = useRef<LiveStatus>("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  function setStatus(status: LiveStatus) {
    liveStatusRef.current = status;
    setLiveStatus(status);
  }

  async function postEvent(eventType: string, eventPayload: Record<string, unknown>, source: "app" | "corti" = "app") {
    await fetch(`/api/encounters/${encounterId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, eventPayload, source })
    });
  }

  async function startCapture() {
    try {
      setStatus("starting");
      setError(null);

      const sessionRes = await fetch(`/api/encounters/${encounterId}/stream-session`, {
        method: "POST"
      });
      if (!sessionRes.ok) {
        const body = await sessionRes.text();
        throw new Error(body || `Failed to create stream session (${sessionRes.status})`);
      }

      const session = (await sessionRes.json()) as { wsUrl: string };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      const ws = new WebSocket(session.wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = async () => {
        setStatus("streaming");
        setLastMessage("Connected");
        ws.send(
          JSON.stringify({
            type: "config",
            config: {
              transcription: {
                primaryLanguage: "en",
                isDiarization: true
              },
              mode: {
                type: "facts",
                outputLocale: "en-US"
              }
            }
          })
        );
        await postEvent("session.started", { interactionId }, "app");
      };

      ws.onerror = () => {
        setStatus("error");
        setError("Corti stream connection failed.");
      };

      ws.onclose = () => {
        if (liveStatusRef.current !== "stopping") {
          setStatus("idle");
        }
      };

      ws.onmessage = async (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : "";
          setLastMessage(raw ? raw.slice(0, 140) : "[binary message]");

          if (!raw) return;

          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const eventType = typeof parsed.type === "string" ? parsed.type : "stream.message";
          await postEvent(eventType, parsed, "corti");
        } catch {
          // keep streaming even when some messages are not JSON
        }
      };

      processor.onaudioprocess = (audioEvent) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const input = audioEvent.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioCtx.sampleRate, 16000);
        const pcm = floatTo16BitPCM(downsampled);
        ws.send(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      wsRef.current = ws;
      mediaStreamRef.current = mediaStream;
      audioCtxRef.current = audioCtx;
      sourceRef.current = source;
      processorRef.current = processor;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start capture";
      setStatus("error");
      setError(message);
    }
  }

  async function stopCapture(markComplete = false) {
    setStatus("stopping");

    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      await postEvent("session.stopped", { interactionId }, "app");

      if (markComplete) {
        await fetch(`/api/encounters/${encounterId}/complete`, { method: "POST" });
      }

      setStatus("idle");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to stop capture";
      setStatus("error");
      setError(message);
    }
  }

  const canStart = liveStatus === "idle" || liveStatus === "error";
  const canStop = liveStatus === "streaming";

  useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Live Capture</h2>
      <small>
        Browser microphone streams to Corti `/stream` and persists returned events.
      </small>

      <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button type="button" onClick={startCapture} disabled={!canStart}>
          {liveStatus === "starting" ? "Starting..." : "Start Live Capture"}
        </button>
        <button type="button" onClick={() => stopCapture(false)} disabled={!canStop}>
          Stop
        </button>
        <button type="button" onClick={() => stopCapture(true)} disabled={!canStop && initialStatus !== "recording"}>
          End Encounter
        </button>
        <button type="button" onClick={() => router.refresh()}>
          Refresh Events
        </button>
      </div>

      <p style={{ marginBottom: "0.25rem" }}>
        Status: <strong>{liveStatus}</strong>
      </p>
      <small style={{ display: "block" }}>Last stream message: {lastMessage}</small>
      {error ? <small style={{ color: "#b3261e", display: "block", marginTop: "0.4rem" }}>{error}</small> : null}
    </section>
  );
}
