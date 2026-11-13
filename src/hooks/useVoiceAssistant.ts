"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseVoiceAssistantOptions {
  onWakeWord?: () => void;
  onStopWord?: () => void;
  onConfirmWord?: () => void;
  onCommandTranscript?: (transcript: string) => void;
  enabled?: boolean;
}

export function useVoiceAssistant({
  onWakeWord,
  onStopWord,
  onConfirmWord,
  onCommandTranscript,
  enabled = true,
}: UseVoiceAssistantOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      
      const cleanLower = currentTranscript.toLowerCase().trim();
      setTranscript(cleanLower);

      // Trigger 1: Wake Word "Hey Tony" / "Tony"
      if (cleanLower.includes("hey tony") || cleanLower.includes("hi tony") || cleanLower.endsWith("tony")) {
        setIsAwake(true);
        if (onWakeWord) onWakeWord();
      }

      // Trigger 2: Stop Word "Stop Tony" / "Pause Tony"
      if (cleanLower.includes("stop tony") || cleanLower.includes("pause tony") || cleanLower.includes("shut up tony")) {
        setIsAwake(false);
        if (onStopWord) onStopWord();
      }

      // Trigger 3: Confirm Word "OK Tony" / "Okay Tony"
      if (cleanLower.includes("ok tony") || cleanLower.includes("okay tony") || cleanLower.includes("thanks tony")) {
        setIsAwake(false);
        if (onConfirmWord) onConfirmWord();
      }

      // Dispatch final transcript
      if (event.results[event.results.length - 1].isFinal) {
        if (onCommandTranscript && cleanLower) {
          onCommandTranscript(cleanLower);
        }
      }
    };

    recognition.onerror = (e: any) => {
      // ignore normal aborts
      if (e.error !== "no-speech") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabled && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [enabled, onWakeWord, onStopWord, onConfirmWord, onCommandTranscript]);

  // Audio level meter using Web Audio API for reactive soundwaves
  const startAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.warn("Could not access microphone for meter:", err);
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      startAudioMeter();
    } catch {
      setIsListening(true);
    }
  }, [startAudioMeter]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsAwake(false);
    stopAudioMeter();
  }, [stopAudioMeter]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    // pick clean natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")));
    if (naturalVoice) utterance.voice = naturalVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    isAwake,
    setIsAwake,
    transcript,
    audioLevel,
    supported,
    startListening,
    stopListening,
    speak
  };
}