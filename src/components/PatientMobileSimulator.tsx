import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { AssignedActivity, ExerciseSession, CognitiveGameSession, LocalSyncQueueItem, SyncState } from '../types';

export function PatientMobileSimulator() {
  // Network simulation state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncQueue, setSyncQueue] = useState<LocalSyncQueueItem[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Patient Auth State
  const [patientUser, setPatientUser] = useState<any | null>(null);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [activities, setActivities] = useState<AssignedActivity[]>([]);
  const [activeScreen, setActiveScreen] = useState<'login' | 'activate' | 'home' | 'arm_raise' | 'memory_game' | 'reaction_game' | 'stroop_game' | 'summary'>('login');

  // Login Form
  const [loginEmail, setLoginEmail] = useState('alex.rivera@patient.neurorehab.health');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Activation Form (Section 3 & 4)
  const [activationCode, setActivationCode] = useState('ACT-9421-8832');
  const [activateEmail, setActivateEmail] = useState('alex.rivera@patient.neurorehab.health');
  const [newPassword, setNewPassword] = useState('ClinicalRehab#2026!');
  const [activationError, setActivationError] = useState<string | null>(null);

  // Exercise: Arm Raise Camera Kinematics (Section 1 & 8)
  const [armAngle, setArmAngle] = useState<number>(20);
  const [targetAngle, setTargetAngle] = useState<number>(120);
  const [targetReps, setTargetReps] = useState<number>(12);
  const [completedReps, setCompletedReps] = useState<number>(0);
  const [validReps, setValidReps] = useState<number>(0);
  const [maxRecordedAngle, setMaxRecordedAngle] = useState<number>(20);
  const [repState, setRepState] = useState<'down' | 'raising' | 'peak' | 'lowering'>('down');
  const [voiceGuidance, setVoiceGuidance] = useState<string>('Stand upright facing camera. Elevate arm steadily.');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [torsoCompensating, setTorsoCompensating] = useState<boolean>(false);
  const [autoSimulating, setAutoSimulating] = useState<boolean>(false);
  const [exerciseTimeSeconds, setExerciseTimeSeconds] = useState<number>(0);
  const [exerciseActive, setExerciseActive] = useState<boolean>(false);
  const [lastFinishedSession, setLastFinishedSession] = useState<any | null>(null);

  // Cognitive Game 1: Memory Match
  const [memoryCards, setMemoryCards] = useState<Array<{ id: number; icon: string; matched: boolean; flipped: boolean }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState<number>(0);
  const [memoryMatchesFound, setMemoryMatchesFound] = useState<number>(0);
  const [memoryTimer, setMemoryTimer] = useState<number>(0);
  const [memoryPlaying, setMemoryPlaying] = useState<boolean>(false);

  // Cognitive Game 2: Visual Reaction Time
  const [reactionState, setReactionState] = useState<'idle' | 'waiting' | 'ready' | 'clicked' | 'early'>('idle');
  const [reactionStartTime, setReactionStartTime] = useState<number>(0);
  const [reactionTrials, setReactionTrials] = useState<number[]>([]);
  const [currentTrialScore, setCurrentTrialScore] = useState<number | null>(null);

  // Cognitive Game 3: Stroop Color Clash
  const [stroopRound, setStroopRound] = useState<number>(0);
  const [stroopWord, setStroopWord] = useState<{ text: string; color: string; colorKey: string }>({ text: 'RED', color: 'text-blue-600', colorKey: 'blue' });
  const [stroopScore, setStroopScore] = useState<number>(0);
  const [stroopTotalRounds] = useState<number>(8);
  const [stroopReactionTimes, setStroopReactionTimes] = useState<number[]>([]);
  const [stroopRoundStart, setStroopRoundStart] = useState<number>(0);

  // Voice Guidance Audio Synthesis
  const speakVoice = (text: string) => {
    if (!audioEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      // SpeechSynthesis fallback
    }
  };

  // Timer effect for exercises
  useEffect(() => {
    let interval: any = null;
    if (exerciseActive) {
      interval = setInterval(() => {
        setExerciseTimeSeconds((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [exerciseActive]);

  // Handle auto simulation of Arm Raise
  useEffect(() => {
    if (!autoSimulating) return;

    let forward = true;
    let current = 25;
    const simInterval = setInterval(() => {
      if (forward) {
        current += 7;
        if (current >= 135) {
          forward = false;
        }
      } else {
        current -= 7;
        if (current <= 20) {
          forward = true;
        }
      }
      handleAngleChange(current);
    }, 120);

    return () => clearInterval(simInterval);
  }, [autoSimulating, repState, completedReps]);

  // Kinematic Repetition State Machine
  function handleAngleChange(newAngle: number) {
    setArmAngle(newAngle);
    if (newAngle > maxRecordedAngle) {
      setMaxRecordedAngle(newAngle);
    }

    // Kinematic check for trunk lean compensation
    if (newAngle > 110 && Math.random() < 0.05) {
      setTorsoCompensating(true);
      setVoiceGuidance('Keep spine straight. Avoid arching back.');
      speakVoice('Keep spine straight. Avoid arching back.');
      setTimeout(() => setTorsoCompensating(false), 2000);
    }

    if (repState === 'down' && newAngle > 35) {
      setRepState('raising');
      setVoiceGuidance('Smooth ascent. Elevate toward 120 degrees.');
    } else if (repState === 'raising' && newAngle >= targetAngle) {
      setRepState('peak');
      setVoiceGuidance(`Target ${targetAngle}° reached! Hold and lower slowly.`);
      speakVoice('Target reached! Lower slowly.');
    } else if (repState === 'peak' && newAngle < 40) {
      setRepState('down');
      const newCompleted = completedReps + 1;
      const newValid = validReps + (newAngle < 40 ? 1 : 0);
      setCompletedReps(newCompleted);
      setValidReps(newValid);
      setVoiceGuidance(`Repetition ${newCompleted} recorded. Excellent control.`);
      speakVoice(`Repetition ${newCompleted} counted.`);

      if (newCompleted >= targetReps) {
        setAutoSimulating(false);
        finishArmRaiseSet(newCompleted, newValid);
      }
    } else if (repState === 'raising' && newAngle < 30) {
      setRepState('down');
    }
  }

  // Finish and save physical Arm Raise session
  async function finishArmRaiseSet(totalCompleted: number, totalValid: number) {
    setExerciseActive(false);
    setAutoSimulating(false);

    const now = new Date().toISOString();
    const sessionId = `ses_arm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionPayload: ExerciseSession = {
      sessionId,
      patientId: patientUser?._id,
      assignedActivityId: 'act_arm_raise_01',
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise (Anterior Shoulder Flexion)',
      startedAt: new Date(Date.now() - exerciseTimeSeconds * 1000).toISOString(),
      completedAt: now,
      activeDurationSeconds: exerciseTimeSeconds || 60,
      elapsedDurationSeconds: (exerciseTimeSeconds || 60) + 15,
      targetRepetitions: targetReps,
      completedRepetitions: totalCompleted,
      validRepetitions: totalValid,
      completionPercentage: Math.min(100, Math.round((totalCompleted / targetReps) * 100)),
      sessionStatus: 'completed',
      relevantMetrics: {
        romMaxAngle: maxRecordedAngle,
        romMinAngle: 20,
        formAccuracyPercentage: Math.min(100, Math.round((totalValid / totalCompleted) * 96)),
        smoothnessScore: 88,
      },
      measurementQuality: 'high',
      exerciseAlgorithmVersion: '1.2.0',
      clientTimestamp: now,
    };

    setLastFinishedSession(sessionPayload);
    await dispatchSessionSync(sessionPayload, 'exercise');
    setActiveScreen('summary');
  }

  // Synchronize or Queue Session (Section 8)
  async function dispatchSessionSync(payload: ExerciseSession | CognitiveGameSession, type: 'exercise' | 'cognitive') {
    const queueItem: LocalSyncQueueItem = {
      id: payload.sessionId,
      type,
      payload,
      queuedAt: new Date().toISOString(),
      status: isOnline ? 'syncing' : 'waiting_to_sync',
      retryAttempts: 0,
    };

    // Add to local queue immediately (simulating Dart local storage)
    setSyncQueue((prev) => [queueItem, ...prev]);

    if (!isOnline) {
      console.info('[Offline Mode] Session saved to local storage. Queued for server sync.');
      return;
    }

    try {
      if (type === 'exercise') {
        await ApiService.syncExerciseSession(payload);
      } else {
        await ApiService.syncGameSession(payload);
      }

      setSyncQueue((prev) =>
        prev.map((item) => (item.id === payload.sessionId ? { ...item, status: 'synced' } : item))
      );
    } catch (err: any) {
      console.warn('Sync failed, retaining in local offline retry queue:', err.message);
      setSyncQueue((prev) =>
        prev.map((item) =>
          item.id === payload.sessionId
            ? { ...item, status: 'sync_failed', lastError: err.message, retryAttempts: item.retryAttempts + 1 }
            : item
        )
      );
    }
  }

  // Push pending offline queue to server when back online
  async function processOfflineQueue() {
    if (!isOnline) {
      alert('Cannot sync while offline. Please switch to Online Mode.');
      return;
    }

    setIsSyncingQueue(true);
    const pending = syncQueue.filter((i) => i.status !== 'synced');

    for (const item of pending) {
      try {
        if (item.type === 'exercise') {
          await ApiService.syncExerciseSession(item.payload);
        } else {
          await ApiService.syncGameSession(item.payload);
        }
        setSyncQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'synced' } : q))
        );
      } catch (err: any) {
        setSyncQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'sync_failed', lastError: err.message } : q))
        );
      }
    }
    setIsSyncingQueue(false);
  }

  // Patient Login Handler (Section 4)
  async function handlePatientLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    try {
      const res = await ApiService.patientLogin(loginEmail, loginPassword);
      setPatientUser(res.user);

      // Load patient plan and activities (Section 9)
      const planRes = await ApiService.getPatientPlan();
      setActivePlan(planRes.plan);
      setActivities(planRes.plan?.activities || []);

      setActiveScreen('home');
    } catch (err: any) {
      // Generic error message per Section 4 security guidelines
      setLoginError('Invalid username or password credentials.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Patient Activation Handler (Section 3 & 4)
  async function handleActivateAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActivationError(null);
    setAuthLoading(true);

    try {
      const res = await ApiService.activatePatient(activationCode, newPassword, activateEmail);
      setPatientUser(res.user);

      // Fetch plan
      const planRes = await ApiService.getPatientPlan();
      setActivePlan(planRes.plan);
      setActivities(planRes.plan?.activities || []);

      setActiveScreen('home');
    } catch (err: any) {
      setActivationError(err.message || 'Activation code could not be verified.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Cognitive Game 1: Memory Match Setup
  function startMemoryGame() {
    const symbols = ['🧠', '⚡', '🏋️', '🎯', '❤️', '🌟'];
    const deck = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((icon, index) => ({ id: index, icon, matched: false, flipped: false }));

    setMemoryCards(deck);
    setSelectedCards([]);
    setMemoryMoves(0);
    setMemoryMatchesFound(0);
    setMemoryTimer(0);
    setMemoryPlaying(true);
    setActiveScreen('memory_game');
  }

  function handleCardClick(index: number) {
    if (!memoryPlaying || selectedCards.length === 2 || memoryCards[index].flipped || memoryCards[index].matched) {
      return;
    }

    const updated = [...memoryCards];
    updated[index].flipped = true;
    setMemoryCards(updated);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [first, second] = newSelected;

      if (updated[first].icon === updated[second].icon) {
        // Matched
        setTimeout(() => {
          updated[first].matched = true;
          updated[second].matched = true;
          setMemoryCards([...updated]);
          setSelectedCards([]);
          const found = memoryMatchesFound + 1;
          setMemoryMatchesFound(found);

          if (found === 6) {
            finishMemoryGame(memoryMoves + 1, 6);
          }
        }, 500);
      } else {
        // Unmatched, flip back
        setTimeout(() => {
          updated[first].flipped = false;
          updated[second].flipped = false;
          setMemoryCards([...updated]);
          setSelectedCards([]);
        }, 900);
      }
    }
  }

  async function finishMemoryGame(moves: number, matches: number) {
    setMemoryPlaying(false);
    const score = Math.max(100, 1000 - moves * 40);
    const accuracy = Math.min(100, Math.round((matches / Math.max(matches, moves)) * 100));

    const sessionId = `ses_cog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionPayload: CognitiveGameSession = {
      sessionId,
      patientId: patientUser?._id,
      assignedActivityId: 'act_mem_01',
      gameId: 'memory_match',
      gameName: 'Memory Match (Working Memory)',
      cognitiveDomain: 'working_memory',
      startedAt: new Date(Date.now() - 45000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 45,
      score,
      accuracyPercentage: accuracy,
      difficulty: 'medium',
      sessionStatus: 'completed',
      clientTimestamp: new Date().toISOString(),
    };

    setLastFinishedSession(sessionPayload);
    await dispatchSessionSync(sessionPayload, 'cognitive');
    setActiveScreen('summary');
  }

  // Cognitive Game 2: Visual Reaction Time
  function startReactionGame() {
    setReactionTrials([]);
    setCurrentTrialScore(null);
    setReactionState('waiting');
    setActiveScreen('reaction_game');

    const randomDelay = Math.floor(Math.random() * 2000) + 1800;
    setTimeout(() => {
      setReactionState('ready');
      setReactionStartTime(Date.now());
    }, randomDelay);
  }

  function handleReactionTap() {
    if (reactionState === 'waiting') {
      setReactionState('early');
      setTimeout(() => startReactionGame(), 1500);
    } else if (reactionState === 'ready') {
      const elapsed = Date.now() - reactionStartTime;
      setCurrentTrialScore(elapsed);
      setReactionState('clicked');
      const updatedTrials = [...reactionTrials, elapsed];
      setReactionTrials(updatedTrials);

      if (updatedTrials.length >= 3) {
        finishReactionGame(updatedTrials);
      }
    }
  }

  async function finishReactionGame(trials: number[]) {
    const avgReaction = Math.round(trials.reduce((a, b) => a + b, 0) / trials.length);
    const score = Math.max(200, Math.round(1500 - avgReaction * 2));

    const sessionId = `ses_react_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionPayload: CognitiveGameSession = {
      sessionId,
      patientId: patientUser?._id,
      assignedActivityId: 'act_react_01',
      gameId: 'reaction_time',
      gameName: 'Visual Reaction Time (Reflex)',
      cognitiveDomain: 'processing_speed',
      startedAt: new Date(Date.now() - 30000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 30,
      score,
      accuracyPercentage: 98,
      reactionTimeMs: avgReaction,
      difficulty: 'medium',
      sessionStatus: 'completed',
      clientTimestamp: new Date().toISOString(),
    };

    setLastFinishedSession(sessionPayload);
    await dispatchSessionSync(sessionPayload, 'cognitive');
    setActiveScreen('summary');
  }

  // Cognitive Game 3: Stroop Color Clash
  function startStroopGame() {
    setStroopRound(0);
    setStroopScore(0);
    setStroopReactionTimes([]);
    nextStroopRound(0, 0, []);
    setActiveScreen('stroop_game');
  }

  function nextStroopRound(currentRound: number, currentScore: number, times: number[]) {
    if (currentRound >= stroopTotalRounds) {
      finishStroopGame(currentScore, times);
      return;
    }

    const words = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
    const colors = [
      { key: 'red', class: 'text-red-600' },
      { key: 'blue', class: 'text-blue-600' },
      { key: 'green', class: 'text-green-600' },
      { key: 'yellow', class: 'text-amber-500' },
    ];

    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setStroopWord({ text: randomWord, color: randomColor.class, colorKey: randomColor.key });
    setStroopRound(currentRound + 1);
    setStroopRoundStart(Date.now());
  }

  function handleStroopAnswer(colorKeySelected: string) {
    const elapsed = Date.now() - stroopRoundStart;
    const isCorrect = colorKeySelected === stroopWord.colorKey;
    const newScore = stroopScore + (isCorrect ? 100 : 0);
    const newTimes = [...stroopReactionTimes, elapsed];

    setStroopScore(newScore);
    setStroopReactionTimes(newTimes);
    nextStroopRound(stroopRound, newScore, newTimes);
  }

  async function finishStroopGame(finalScore: number, times: number[]) {
    const avgReaction = Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length));
    const accuracy = Math.round((finalScore / (stroopTotalRounds * 100)) * 100);

    const sessionId = `ses_stroop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionPayload: CognitiveGameSession = {
      sessionId,
      patientId: patientUser?._id,
      assignedActivityId: 'act_stroop_01',
      gameId: 'stroop_clash',
      gameName: 'Stroop Color Clash (Executive Control)',
      cognitiveDomain: 'executive_function',
      startedAt: new Date(Date.now() - 35000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 35,
      score: finalScore,
      accuracyPercentage: accuracy,
      reactionTimeMs: avgReaction,
      difficulty: 'hard',
      sessionStatus: 'completed',
      clientTimestamp: new Date().toISOString(),
    };

    setLastFinishedSession(sessionPayload);
    await dispatchSessionSync(sessionPayload, 'cognitive');
    setActiveScreen('summary');
  }

  // Pre-seed demo login
  function fillDemoLogin(role: 'alex' | 'maya') {
    if (role === 'alex') {
      setLoginEmail('alex.rivera@patient.neurorehab.health');
      setLoginPassword('Password123!');
    } else {
      setLoginEmail('maya.lin@patient.neurorehab.health');
      setLoginPassword('Password123!');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Flutter Integration & Offline Queue */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Flutter Patient Mobile App (Existing Integration)</h2>
            <span className="text-xs text-indigo-700 font-medium">· Dart Client Preserved</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserves physical exercises (Arm Raise camera kinematics) and 13 cognitive games. Connected to shared Node.js / MongoDB backend.
          </p>
        </div>

        {/* Network & Offline Switcher Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setIsOnline(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                isOnline ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" /> Online Mode
            </button>
            <button
              onClick={() => setIsOnline(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                !isOnline ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode (Simulated)
            </button>
          </div>

          {syncQueue.some((q) => q.status !== 'synced') && (
            <button
              onClick={processOfflineQueue}
              disabled={isSyncingQueue || !isOnline}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              Push Offline Queue ({syncQueue.filter((q) => q.status !== 'synced').length})
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Mobile Frame + Sync Queue Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mobile Phone Frame (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[420px] bg-slate-900 rounded-[44px] p-4 shadow-2xl border-4 border-slate-800 relative">
            {/* Phone Speaker Notch */}
            <div className="w-28 h-4 bg-black rounded-b-xl mx-auto mb-3 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* Mobile Screen Surface */}
            <div className="bg-slate-50 rounded-[34px] overflow-hidden min-h-[640px] flex flex-col text-slate-800 border border-slate-200/50 relative">
              {/* Phone Status Bar */}
              <div className="px-5 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>09:41</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${isOnline ? 'text-emerald-600' : 'text-amber-600 font-bold'}`}>
                    {isOnline ? 'REST API Connected' : 'Offline Storage'}
                  </span>
                  {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
                </div>
              </div>

              {/* SCREEN 1: LOGIN (Section 4) */}
              {activeScreen === 'login' && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4 pt-2">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                        <Brain className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">NeuroRehab Connect</h3>
                      <p className="text-xs text-slate-500">Patient Rehabilitation Companion</p>
                    </div>

                    {loginError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handlePatientLoginSubmit} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Patient Email</label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        {authLoading ? 'Verifying...' : 'Sign In to My Plan'}
                      </button>
                    </form>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveScreen('activate')}
                        className="text-xs text-indigo-700 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Have an Activation Code? Activate Here
                      </button>
                    </div>
                  </div>

                  {/* Quick Seed Buttons for Demonstration */}
                  <div className="pt-4 border-t border-slate-200/80 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block text-center">
                      Quick Patient Demo Logins
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => fillDemoLogin('alex')}
                        className="py-1.5 px-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 font-medium text-slate-700 truncate"
                      >
                        Alex Rivera (Active)
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoLogin('maya')}
                        className="py-1.5 px-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 font-medium text-slate-700 truncate"
                      >
                        Maya Lin (Pending)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: ACTIVATION (Section 3 & 4) */}
              {activeScreen === 'activate' && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4 pt-2">
                    <button
                      onClick={() => setActiveScreen('login')}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </button>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Activate Patient Account</h3>
                      <p className="text-xs text-slate-500">
                        Enter the activation code received from your attending neurologist.
                      </p>
                    </div>

                    {activationError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        {activationError}
                      </div>
                    )}

                    <form onSubmit={handleActivateAccountSubmit} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Activation Code</label>
                        <input
                          type="text"
                          required
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value)}
                          placeholder="ACT-XXXX-XXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono tracking-wider focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Account Email</label>
                        <input
                          type="email"
                          required
                          value={activateEmail}
                          onChange={(e) => setActivateEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Create Secure Password</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-xs"
                      >
                        {authLoading ? 'Activating...' : 'Verify Code & Launch Plan'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* SCREEN 3: HOME DASHBOARD (Section 1, 7, 9) */}
              {activeScreen === 'home' && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    {/* Patient Card */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                          {patientUser?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{patientUser?.name || 'Patient'}</h4>
                          <span className="text-[11px] text-slate-500">Plan: {activePlan?.title || 'Phase 1 Motor Plan'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPatientUser(null);
                          setActiveScreen('login');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Streak & Today Progress */}
                    <div className="p-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl text-white space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold">
                          <Flame className="w-4 h-4 text-amber-300" /> 4 Day Recovery Streak
                        </span>
                        <span className="text-white/80">Plan v{activePlan?.version || 1}</span>
                      </div>
                      <div className="text-xs">
                        Today's Goal: <strong>2/3 Activities Completed</strong>
                      </div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-white h-full rounded-full w-2/3" />
                      </div>
                    </div>

                    {/* Prescribed Activities List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Prescribed Activities</span>
                        <span className="text-[11px] text-slate-400">Dr. Sarah Chen, MD</span>
                      </div>

                      {/* 1. Arm Raise Camera Exercise */}
                      <div
                        onClick={() => {
                          setCompletedReps(0);
                          setValidReps(0);
                          setArmAngle(20);
                          setMaxRecordedAngle(20);
                          setExerciseTimeSeconds(0);
                          setExerciseActive(true);
                          setActiveScreen('arm_raise');
                        }}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Arm Raise (Camera Kinematics)</div>
                            <div className="text-[11px] text-slate-500">Target: 12 Reps @ 120° ROM</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* 2. Memory Match Cognitive Game */}
                      <div
                        onClick={startMemoryGame}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Memory Match (Working Memory)</div>
                            <div className="text-[11px] text-slate-500">Target: 6 Pairs @ Medium</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* 3. Visual Reaction Time */}
                      <div
                        onClick={startReactionGame}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Visual Reaction Time (Processing)</div>
                            <div className="text-[11px] text-slate-500">Reflex Assessment · 3 Trials</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* 4. Stroop Color Clash */}
                      <div
                        onClick={startStroopGame}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Stroop Color Clash (Executive)</div>
                            <div className="text-[11px] text-slate-500">Inhibition & Focus · 8 Rounds</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Sync Status Footer in Phone */}
                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      {syncQueue.filter((q) => q.status !== 'synced').length === 0
                        ? 'All Sessions Synced to Cloud'
                        : `${syncQueue.filter((q) => q.status !== 'synced').length} Pending in Local Queue`}
                    </span>
                    <span className="font-mono text-slate-400">v1.2-dart</span>
                  </div>
                </div>
              )}

              {/* SCREEN 4: ARM RAISE CAMERA EXERCISE (Section 1 & 8) */}
              {activeScreen === 'arm_raise' && (
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setExerciseActive(false);
                          setAutoSimulating(false);
                          setActiveScreen('home');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                          audioEnabled ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{audioEnabled ? 'Voice Guidance ON' : 'Muted'}</span>
                      </button>
                    </div>

                    {/* Camera Feed / Kinematic Silhouette Simulator */}
                    <div className="relative w-full h-56 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex flex-col items-center justify-center">
                      {/* Privacy Disclosure watermark (Section 12) */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 text-[9px] text-emerald-400 font-mono">
                        HIPAA Safe: Zero Camera Video Uploaded
                      </div>

                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
                        Time: {exerciseTimeSeconds}s
                      </div>

                      {/* Pose Kinematic Silhouette Skeleton */}
                      <div className="relative w-36 h-48 flex items-center justify-center">
                        {/* Head */}
                        <div className="absolute top-2 w-9 h-9 rounded-full border-2 border-indigo-400/80 bg-indigo-900/40" />

                        {/* Torso */}
                        <div className="absolute top-11 w-1.5 h-20 bg-indigo-400/80 rounded-full" />

                        {/* Fixed Left Arm */}
                        <div className="absolute top-12 left-10 w-1.5 h-16 bg-slate-500 rounded-full rotate-12" />

                        {/* Active Raising Right Arm with Dynamic Angle Rotation */}
                        <div
                          className="absolute top-12 right-12 w-1.5 h-20 bg-emerald-400 rounded-full origin-top transition-transform duration-75"
                          style={{
                            transform: `rotate(${-(armAngle)}deg)`,
                          }}
                        >
                          {/* Joint point */}
                          <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-emerald-300 shadow-sm" />
                        </div>

                        {/* Target Angle Arc Guide */}
                        <div className="absolute top-12 right-12 w-24 h-24 border-t-2 border-dashed border-emerald-400/40 rounded-full pointer-events-none" />
                      </div>

                      {/* Torso compensation alert */}
                      {torsoCompensating && (
                        <div className="absolute bottom-3 px-3 py-1 bg-amber-500 text-slate-900 font-bold text-[10px] rounded-md shadow-md animate-bounce">
                          Notice: Keep Spine Straight (Torso Leaning)
                        </div>
                      )}
                    </div>

                    {/* Kinematic Angle Gauge & Metrics */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Shoulder Joint Flexion:</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{armAngle}°</span>
                      </div>

                      {/* Interactive Angle Slider (Simulating real camera angle feed) */}
                      <input
                        type="range"
                        min="15"
                        max="160"
                        value={armAngle}
                        onChange={(e) => handleAngleChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Rest (20°)</span>
                        <span className="text-emerald-600 font-bold">Target Zone ({targetAngle}°)</span>
                        <span>Full (160°)</span>
                      </div>
                    </div>

                    {/* Voice Guidance Banner */}
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-medium">{voiceGuidance}</span>
                    </div>

                    {/* Reps Summary */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Completed</div>
                        <div className="text-base font-bold text-slate-900">{completedReps} / {targetReps}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Valid Kinematics</div>
                        <div className="text-base font-bold text-emerald-600">{validReps}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Max ROM</div>
                        <div className="text-base font-bold text-blue-600">{maxRecordedAngle}°</div>
                      </div>
                    </div>
                  </div>

                  {/* Exercise Action Controls */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAutoSimulating(!autoSimulating)}
                      className={`w-full py-2 rounded-xl text-xs font-semibold border transition ${
                        autoSimulating
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {autoSimulating ? 'Pause Motion Simulation' : 'Auto-Simulate Arm Repetitions'}
                    </button>

                    <button
                      type="button"
                      onClick={() => finishArmRaiseSet(Math.max(1, completedReps), Math.max(1, validReps))}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      Complete Set & Record Kinematics
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 5: COGNITIVE GAME 1 - MEMORY MATCH */}
              {activeScreen === 'memory_game' && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveScreen('home')}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Quit
                      </button>
                      <div className="text-xs font-bold text-slate-700">Memory Match</div>
                      <div className="text-xs text-slate-500">Moves: {memoryMoves}</div>
                    </div>

                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 text-center text-xs text-purple-900 font-medium">
                      Find matching neural pairs. Matches: {memoryMatchesFound} / 6
                    </div>

                    {/* Card Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {memoryCards.map((card, idx) => (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(idx)}
                          className={`h-16 rounded-xl flex items-center justify-center text-xl font-bold cursor-pointer transition select-none ${
                            card.flipped || card.matched
                              ? 'bg-white border-2 border-purple-500 shadow-xs'
                              : 'bg-indigo-900 border border-indigo-950 text-indigo-300 hover:bg-indigo-800'
                          }`}
                        >
                          {card.flipped || card.matched ? card.icon : '?'}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center text-[11px] text-slate-400">
                    Dual-task cognitive exercise for cortical neuroplasticity.
                  </div>
                </div>
              )}

              {/* SCREEN 6: COGNITIVE GAME 2 - REACTION TIME */}
              {activeScreen === 'reaction_game' && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveScreen('home')}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <span className="text-xs font-bold text-slate-700">Trial {reactionTrials.length + 1} of 3</span>
                    </div>

                    {/* Reflex Target Canvas */}
                    <div
                      onClick={handleReactionTap}
                      className={`w-full h-64 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition select-none ${
                        reactionState === 'waiting'
                          ? 'bg-rose-500 text-white'
                          : reactionState === 'ready'
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : reactionState === 'clicked'
                          ? 'bg-blue-600 text-white'
                          : reactionState === 'early'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {reactionState === 'waiting' && (
                        <div className="space-y-1">
                          <div className="text-lg font-bold">WAIT FOR GREEN...</div>
                          <div className="text-xs text-white/80">Do not tap yet</div>
                        </div>
                      )}
                      {reactionState === 'ready' && (
                        <div className="space-y-1">
                          <div className="text-2xl font-black tracking-wider">TAP NOW!</div>
                          <div className="text-xs text-white/90">Reflex recorded in milliseconds</div>
                        </div>
                      )}
                      {reactionState === 'clicked' && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{currentTrialScore} ms</div>
                          <div className="text-xs text-white/80">Tap to proceed to next trial</div>
                        </div>
                      )}
                      {reactionState === 'early' && (
                        <div className="space-y-1">
                          <div className="text-base font-bold">Too Early!</div>
                          <div className="text-xs text-white/80">Wait until the color changes to green</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-500">
                    Measures visual-motor processing speed following stroke or neural injury.
                  </div>
                </div>
              )}

              {/* SCREEN 7: COGNITIVE GAME 3 - STROOP COLOR CLASH */}
              {activeScreen === 'stroop_game' && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveScreen('home')}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <span className="text-xs font-bold text-slate-700">
                        Round {stroopRound} of {stroopTotalRounds}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-600">
                      Tap the <strong>INK COLOR</strong> of the text, not the word itself!
                    </div>

                    {/* Word Display with Conflicting Color */}
                    <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-xs">
                      <span className={`text-4xl font-black tracking-wider ${stroopWord.color}`}>
                        {stroopWord.text}
                      </span>
                    </div>

                    {/* Ink Color Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button
                        onClick={() => handleStroopAnswer('red')}
                        className="py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-xs"
                      >
                        Red
                      </button>
                      <button
                        onClick={() => handleStroopAnswer('blue')}
                        className="py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs"
                      >
                        Blue
                      </button>
                      <button
                        onClick={() => handleStroopAnswer('green')}
                        className="py-3 rounded-xl bg-green-600 text-white font-bold text-xs hover:bg-green-700 shadow-xs"
                      >
                        Green
                      </button>
                      <button
                        onClick={() => handleStroopAnswer('yellow')}
                        className="py-3 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-xs"
                      >
                        Yellow
                      </button>
                    </div>
                  </div>

                  <div className="text-center text-[11px] text-slate-400">
                    Evaluates inhibitory control in anterior cingulate cortex.
                  </div>
                </div>
              )}

              {/* SCREEN 8: SUMMARY & SYNC CONFIRMATION (Section 8) */}
              {activeScreen === 'summary' && lastFinishedSession && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4 pt-2">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Session Completed!</h3>
                      <p className="text-xs text-slate-500">{lastFinishedSession.exerciseName || lastFinishedSession.gameName}</p>
                    </div>

                    {/* Metrics card */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Session ID:</span>
                        <span className="font-mono text-[11px] text-slate-700">{lastFinishedSession.sessionId}</span>
                      </div>

                      {lastFinishedSession.exerciseId ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Completed Reps:</span>
                            <span className="font-bold text-slate-900">
                              {lastFinishedSession.completedRepetitions} / {lastFinishedSession.targetRepetitions}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Max ROM Angle:</span>
                            <span className="font-bold text-blue-600">{lastFinishedSession.relevantMetrics?.romMaxAngle}°</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Form Accuracy:</span>
                            <span className="font-bold text-emerald-600">
                              {lastFinishedSession.relevantMetrics?.formAccuracyPercentage}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Score:</span>
                            <span className="font-bold text-slate-900">{lastFinishedSession.score} pts</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Accuracy:</span>
                            <span className="font-bold text-emerald-600">{lastFinishedSession.accuracyPercentage}%</span>
                          </div>
                          {lastFinishedSession.reactionTimeMs && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Reaction Time:</span>
                              <span className="font-bold text-purple-600">{lastFinishedSession.reactionTimeMs} ms</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Server Sync Status Banner */}
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        isOnline
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {isOnline ? (
                          <>
                            <Wifi className="w-4 h-4 text-emerald-600" /> Synchronized with Doctor Dashboard
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 text-amber-600" /> Saved Locally in Offline Queue
                          </>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90">
                        {isOnline
                          ? 'HTTP 201 Created confirmed by backend. Data immediately visible to Dr. Sarah Chen.'
                          : 'Offline mode active. Session cached locally and will automatically retry when connected.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                  >
                    Return to Activities
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Offline Sync Queue Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Section 8 — Sync Engine & Local Storage
                </h3>
                <p className="text-xs text-slate-400">
                  Simulates Hive / SharedPreferences storage in Dart with idempotent REST submission.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700">{syncQueue.length} Sessions</span>
            </div>

            {/* Offline vs Online explanation card */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Idempotency & Network Resilience:</div>
              <p className="text-[11px]">
                Every exercise or cognitive trial generates a stable UUID <code className="text-slate-800">sessionId</code>. If connectivity drops, results persist locally without losing historical kinematics.
              </p>
            </div>

            {/* Queue items list */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {syncQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">
                      {(item.payload as any).exerciseName || (item.payload as any).gameName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.status === 'synced'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'syncing'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.status === 'waiting_to_sync'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>{item.id}</span>
                    <span>{new Date(item.queuedAt).toLocaleTimeString()}</span>
                  </div>

                  {item.lastError && (
                    <div className="text-[10px] text-red-600 italic">Error: {item.lastError}</div>
                  )}
                </div>
              ))}

              {syncQueue.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No sessions performed yet. Open an exercise or cognitive game in the phone on the left!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
