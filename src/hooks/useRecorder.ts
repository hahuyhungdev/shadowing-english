import { useCallback, useRef, useState } from "react";

interface UseRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  audioURL: string | null;
  audioBlob: Blob | null;
  duration: number;
  resetRecording: () => void;
}

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const detectSilence = useCallback(
    (analyser: AnalyserNode, threshold: number, silenceDurationMs: number) => {
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      const checkSilence = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);

        if (rms < threshold) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              // Auto-stop on silence
              mediaRecorderRef.current?.stop();
            }, silenceDurationMs);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }

        if (mediaRecorderRef.current?.state === "recording") {
          animationFrameRef.current = requestAnimationFrame(checkSilence);
        }
      };

      checkSilence();
    },
    [],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        setIsRecording(false);

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);

      // Timer to track duration
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start silence detection (threshold: 0.01, silence: 3 seconds)
      detectSilence(analyser, 0.01, 3000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [detectSilence]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setAudioBlob(null);
    setDuration(0);
  }, [audioURL]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioURL,
    audioBlob,
    duration,
    resetRecording,
  };
}
