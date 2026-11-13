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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const pulseIntervalRef = useRef<any>(null);

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Clean animated pulse when listening
  const startPulseAnimation = useCallback(() => {
    if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    pulseIntervalRef.current = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 35) + 15);
    }, 120);
  }, []);

  const stopPulseAnimation = useCallback(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    setAudioLevel(0);
  }, []);

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
      let interim = "";
      let finalSpeech = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalSpeech += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const activeText = (finalSpeech || interim).toLowerCase().trim();
      if (activeText) {
        setTranscript(activeText);
        setAudioLevel(Math.floor(Math.random() * 45) + 40); // higher pulse on voice
      }

      // Check Wake Words: "Hey Tony", "Hi Tony", "OK Tony"
      if (
        activeText.includes("hey tony") ||
        activeText.includes("hi tony") ||
        activeText.includes("ok tony") ||
        activeText.endsWith("tony")
      ) {
        setIsAwake(true);
        if (onWakeWord) onWakeWord();
      }

      // Check Stop Words
      if (
        activeText.includes("stop tony") ||
        activeText.includes("pause tony") ||
        activeText.includes("shut up tony")
      ) {
        setIsAwake(false);
        if (onStopWord) onStopWord();
        return;
      }

      // Check Confirm Words
      if (activeText.includes("thank you tony") || activeText.includes("thanks tony")) {
        setIsAwake(false);
        if (onConfirmWord) onConfirmWord();
        return;
      }

      // Dispatch final transcript
      if (finalSpeech) {
        let command = finalSpeech.trim();
        // Strip wake phrase prefix if present
        command = command.replace(/^(hey|hi|ok|okay)\s+tony[,.]?\s*/i, "").trim();
        if (command && onCommandTranscript) {
          onCommandTranscript(command);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        // Normal silence timeout, no action needed
        return;
      }
      if (e.error === "not-allowed") {
        setErrorMsg("Microphone access was denied. Please allow mic permissions in Chrome.");
        setIsListening(false);
        isListeningRef.current = false;
        stopPulseAnimation();
      } else if (e.error === "audio-capture") {
        setErrorMsg("Microphone device not available or already busy.");
        setIsListening(false);
        isListeningRef.current = false;
        stopPulseAnimation();
      } else {
        console.warn("Speech recognition warning:", e.error);
      }
    };

    recognition.onend = () => {
      // ONLY restart if the user intentionally keeps listening active
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // already restarting or busy
        }
      } else {
        setIsListening(false);
        stopPulseAnimation();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
      stopPulseAnimation();
    };
  }, [onWakeWord, onStopWord, onConfirmWord, onCommandTranscript, stopPulseAnimation]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setErrorMsg(null);
      isListeningRef.current = true;
      setIsListening(true);
      startPulseAnimation();
      recognitionRef.current.start();
    } catch {
      // In case it was already active
      isListeningRef.current = true;
      setIsListening(true);
      startPulseAnimation();
    }
  }, [startPulseAnimation]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setIsAwake(false);
    stopPulseAnimation();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [stopPulseAnimation]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("David"))
      );
      if (naturalVoice) utterance.voice = naturalVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  }, []);

  return {
    isListening,
    isAwake,
    setIsAwake,
    transcript,
    audioLevel,
    supported,
    errorMsg,
    startListening,
    stopListening,
    speak,
  };
}
