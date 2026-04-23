import { useState, useCallback, useRef, useEffect } from 'react';
import type { SagaInput, Saga, Feedback } from '../types';
import { generateSaga, generateFeedback, generateScenarioImage } from '../services/geminiService';
import { t } from '../lib/i18n';

export const useSagaGamification = (language: 'en' | 'es') => {
  // State
  const [sagaInput, setSagaInput] = useState<SagaInput>({
    theme: '',
    tasks: [''],
    prompt: '',
    constraints: [''],
  });
  const [mission, setMission] = useState<Saga | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Visuals & Feedback
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0);
  const [toast, setToast] = useState<{ id: number, message: string } | null>(null);
  const [completedFeats, setCompletedFeats] = useState<Feedback[]>([]);
  const [finalFeedback, setFinalFeedback] = useState<{ content: Feedback | null, isLoading: boolean }>({ content: null, isLoading: false });

  // Loading Messages
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- Logic ---

  const startLoadingCycle = useCallback(() => {
    const messages = t('loadingPhases', language) as string[];
    if (!messages || !Array.isArray(messages)) {
      setLoadingMessage("Loading...");
      return;
    }
    let index = 0;
    setLoadingMessage(messages[0]);
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2000);
  }, [language]);

  const stopLoadingCycle = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  const generateMission = useCallback(async () => {
    const nonEmptyTasks = sagaInput.tasks.filter(t => t.trim());
    if (!sagaInput.theme || nonEmptyTasks.length === 0) {
      setError(t('app.errorRequired', language));
      return;
    }

    setIsLoading(true);
    startLoadingCycle();
    setError(null);
    setMission(null);
    setCompletedFeats([]);
    setFinalFeedback({ content: null, isLoading: false });
    setBackgroundOpacity(0);
    setIsImageLoading(false);

    try {
      const result = await generateSaga({ ...sagaInput, tasks: nonEmptyTasks }, language);
      if (!isMountedRef.current) return;

      setMission(result);
      setIsImageLoading(true);

      // Async Image Generation
      generateScenarioImage(sagaInput.theme, result.scenario)
        .then((imageUrl) => {
          if (!isMountedRef.current) return;
          if (imageUrl) {
            setMission(prev => prev ? { ...prev, imageUrl } : null);
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
              if (!isMountedRef.current) return;
              setBackgroundImage(imageUrl);
              setBackgroundOpacity(1);
              setIsImageLoading(false);
            };
          } else {
            setIsImageLoading(false);
          }
        })
        .catch(err => {
          console.error("Image gen failed", err);
          if (isMountedRef.current) setIsImageLoading(false);
        });

    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : t('app.errorUnknown', language));
    } finally {
      if (isMountedRef.current) {
        stopLoadingCycle();
        setIsLoading(false);
      }
    }
  }, [sagaInput, language, startLoadingCycle, stopLoadingCycle]);

  const clearAll = useCallback(() => {
    setSagaInput({ theme: '', tasks: [''], prompt: '', constraints: [''] });
    setMission(null);
    setError(null);
    setCompletedFeats([]);
    setBackgroundOpacity(0);
    setTimeout(() => { if (isMountedRef.current) setBackgroundImage(null); }, 1000);
    setFinalFeedback({ content: null, isLoading: false });
    stopLoadingCycle();
  }, [stopLoadingCycle]);

  const toggleObjective = useCallback((objectiveIndex: number) => {
    setMission(prevMission => {
      if (!prevMission) return null;

      const newObjectives = [...prevMission.objectives];
      const targetObjective = newObjectives[objectiveIndex];
      newObjectives[objectiveIndex] = { ...targetObjective, completed: !targetObjective.completed };
      const newMissionState = { ...prevMission, objectives: newObjectives };

      if (newObjectives[objectiveIndex].completed) {
        setToast({ id: Date.now(), message: t('toast.successTitle', language) });

        // Final reward check
        const allComplete = newObjectives.every(obj => obj.completed);

        if (!allComplete) {
          // Micro-reward
          generateFeedback({
            theme: sagaInput.theme || 'adventure',
            role: newMissionState.roleAndObjective,
            completedTask: newObjectives[objectiveIndex].missionTask,
            isFinal: false,
          }, language).then(feat => {
            if (isMountedRef.current) setCompletedFeats(prev => [...prev, feat]);
          });
        } else {
          // Final reward
          setFinalFeedback({ content: null, isLoading: true });
          generateFeedback({
            theme: sagaInput.theme || 'adventure',
            role: newMissionState.roleAndObjective,
            completedTask: newObjectives[objectiveIndex].missionTask,
            isFinal: true,
          }, language)
            .then(final => {
              if (isMountedRef.current) setFinalFeedback({ content: final, isLoading: false });
            })
            .catch(() => {
              if (isMountedRef.current) {
                setFinalFeedback({
                  content: { id: 'fallback', title: t('fallbackFeedback', language).title, message: t('fallbackFeedback', language).message },
                  isLoading: false
                });
              }
            });
        }
      }
      return newMissionState;
    });
  }, [sagaInput.theme, language]);

  const returnToEdit = () => setMission(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => { if (isMountedRef.current) setToast(null); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    sagaInput,
    setSagaInput,
    mission,
    isLoading,
    isImageLoading,
    loadingMessage,
    error,
    backgroundImage,
    backgroundOpacity,
    toast,
    setToast,
    completedFeats,
    finalFeedback,
    setFinalFeedback,
    actions: {
      generateMission,
      clearAll,
      toggleObjective,
      returnToEdit
    }
  };
};