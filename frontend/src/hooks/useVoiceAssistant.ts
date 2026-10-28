import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '../types/robot';

interface UseVoiceAssistantProps {
  language: SupportedLanguage;
  onTranscriptReady: (transcript: string) => void;
  onTranscriptInterim?: (transcript: string) => void;
}

export function useVoiceAssistant({
  language,
  onTranscriptReady,
  onTranscriptInterim
}: UseVoiceAssistantProps) {
  const [micState, setMicState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;
  const onTranscriptInterimRef = useRef(onTranscriptInterim);
  onTranscriptInterimRef.current = onTranscriptInterim;

  const latestTranscriptRef = useRef<string>('');
  const dispatchedTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);

  // Web Audio stream & analyser for live microphone amplitude meter
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const dispatchTranscript = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    if (dispatchedTranscriptRef.current === cleanText) return;
    dispatchedTranscriptRef.current = cleanText;
    setMicState('processing');
    try {
      await onTranscriptReadyRef.current(cleanText);
    } catch (err) {
      console.error('Error in onTranscriptReady callback:', err);
    } finally {
      setMicState('idle');
    }
  }, []);

  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Asynchronously load system voices for speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setSystemVoices(v);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Map app languages to BCP-47 speech tags
  const speechLangMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    ta: 'ta-IN',
    ml: 'ml-IN',
    hi: 'hi-IN'
  };

  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    ta: 'Tamil',
    ml: 'Malayalam',
    hi: 'Hindi'
  };

  // Multilingual Text-to-Speech
  const speakText = useCallback(
    (text: string, lang: SupportedLanguage = language) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

      try {
        window.speechSynthesis.cancel(); // Stop prior audio
        const utterance = new SpeechSynthesisUtterance(text);
        const targetTag = speechLangMap[lang] || 'en-US';
        utterance.lang = targetTag;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Pick matching system voice if available
        const voices = systemVoices.length > 0 ? systemVoices : window.speechSynthesis.getVoices();
        let matchingVoice: SpeechSynthesisVoice | undefined;

        if (voices && voices.length > 0) {
          matchingVoice =
            voices.find((v) => v.lang.toLowerCase() === targetTag.toLowerCase()) ||
            voices.find(
              (v) =>
                v.lang.toLowerCase().startsWith(lang) ||
                v.lang.toLowerCase().includes(lang)
            );

          if (matchingVoice) {
            utterance.voice = matchingVoice;
          } else if (lang !== 'en') {
            const langName = languageNames[lang] || lang.toUpperCase();
            setVoiceError(
              `Native TTS voice for ${langName} (${targetTag}) is not installed on this system. The assistant response is displayed in text.`
            );
            return;
          }
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setMicState('speaking');
          setVoiceError(null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setMicState('idle');
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setIsSpeaking(false);
          setMicState('idle');
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis failed safely:', err);
        setIsSpeaking(false);
        setMicState('idle');
      }
    },
    [language, systemVoices]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      setIsSpeaking(false);
      setMicState((prev) => (prev === 'speaking' ? 'idle' : prev));
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        'Web Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for microphone voice commands.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      // Use continuous=true so the browser does not shut off on brief pauses
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLangMap[language] || 'en-US';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setMicState('listening');
        setVoiceError(null);
        latestTranscriptRef.current = '';
        dispatchedTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const latestSpoken = (finalTranscript + interimTranscript).trim();
        if (latestSpoken) {
          setTranscript(latestSpoken);
          latestTranscriptRef.current = latestSpoken;
          // Live stream interim words to parent (CommandEditor and App)
          onTranscriptInterimRef.current?.(latestSpoken);

          // Reset silence timer: auto-stop and finalize 1.8s after speaker pauses
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && latestTranscriptRef.current.trim()) {
              try {
                recognitionRef.current?.stop();
              } catch (_) {}
            }
          }, 1800);
        }

        if (finalTranscript.trim().length > 0) {
          latestTranscriptRef.current = finalTranscript.trim();
        }
      };

      recognition.onerror = (e: any) => {
        const errType = e?.error || 'unknown';
        console.warn('Speech recognition error event:', errType);

        if (errType === 'no-speech') {
          // With continuous listening, no-speech is normal background silence, do not crash
          return;
        }

        isListeningRef.current = false;
        stopAudioMonitoring();

        if (errType === 'not-allowed') {
          setVoiceError(
            'Microphone permission was denied. Please click the lock or microphone icon in your browser URL bar and choose "Allow".'
          );
        } else if (errType === 'network') {
          setVoiceError(
            'Speech recognition network error: Google Chrome requires internet connectivity to translate speech, or click a Preset command below.'
          );
        } else if (errType === 'audio-capture') {
          setVoiceError(
            'No physical microphone detected. Please plug in or enable a microphone in Windows Sound settings.'
          );
        } else if (errType === 'language-not-supported') {
          setVoiceError(
            `Speech recognition for ${language.toUpperCase()} (${speechLangMap[language]}) is not available in this browser. You can type commands in this language or select English.`
          );
        } else {
          setVoiceError(`Voice input status: ${errType}`);
        }
        setMicState('idle');
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        stopAudioMonitoring();
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const pending = latestTranscriptRef.current.trim();
        if (pending && dispatchedTranscriptRef.current !== pending) {
          dispatchTranscript(pending);
        } else {
          setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
        }
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.warn('SpeechRecognition initialization error:', e);
      setVoiceError(e?.message || 'Failed to initialize speech recognition.');
    }

    return () => {
      stopAudioMonitoring();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, [language, dispatchTranscript, stopAudioMonitoring]);

  const toggleMic = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(
        'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (isListeningRef.current || micState === 'listening') {
      // User clicked mic to stop listening
      isListeningRef.current = false;
      stopAudioMonitoring();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      const pending = latestTranscriptRef.current.trim();
      if (pending && dispatchedTranscriptRef.current !== pending) {
        dispatchTranscript(pending);
      } else {
        setMicState('idle');
      }
    } else {
      // Stop ongoing speech before recording
      stopSpeaking();
      latestTranscriptRef.current = '';
      dispatchedTranscriptRef.current = '';
      setVoiceError(null);

      // 1. Explicitly request microphone stream to ensure browser permissions & live audio level
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (!isListeningRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(1, avg / 60)); // normalized 0..1
              animFrameRef.current = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          }
        }
      } catch (err: any) {
        console.warn('Microphone permission check error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setVoiceError(
            'Microphone permission blocked. Please click the lock/mic icon in the browser address bar (URL) and select "Allow".'
          );
          return;
        }
      }

      // 2. Start speech recognition with target language tag
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = speechLangMap[language] || 'en-US';
          recognitionRef.current.start();
          isListeningRef.current = true;
          setMicState('listening');
        } catch (e: any) {
          console.warn('Failed to start recognition:', e);
          if (e?.name === 'InvalidStateError') {
            try {
              recognitionRef.current.abort();
              setTimeout(() => {
                try {
                  recognitionRef.current?.start();
                  isListeningRef.current = true;
                  setMicState('listening');
                } catch (_) {}
              }, 150);
            } catch (_) {}
          } else {
            setVoiceError(`Could not start microphone: ${e?.message || e}`);
          }
        }
      }
    }
  }, [language, micState, stopSpeaking, dispatchTranscript, stopAudioMonitoring]);

  // Method to simulate voice input (for quick testing or when hardware mic is absent)
  const simulateVoiceInput = useCallback(
    async (simulatedText: string) => {
      stopSpeaking();
      setTranscript(simulatedText);
      onTranscriptInterimRef.current?.(simulatedText);
      await dispatchTranscript(simulatedText);
    },
    [stopSpeaking, dispatchTranscript]
  );

  return {
    micState,
    transcript,
    audioLevel,
    voiceError,
    setTranscript,
    setVoiceError,
    toggleMic,
    speakText,
    isSpeaking,
    stopSpeaking,
    simulateVoiceInput
  };
}
