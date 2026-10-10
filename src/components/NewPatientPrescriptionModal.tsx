import React, { useState, useRef } from 'react';
import {
  X,
  UserPlus,
  Camera,
  Upload,
  CheckCircle2,
  Brain,
  Activity,
  Utensils,
  Clock,
  Sparkles,
  Shield,
  FileText,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react';
import { ApiService } from '../services/api';

interface NewPatientPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPatient: any) => void;
}

// 13 Cognitive Games from the mobile app
export const COGNITIVE_GAMES_CATALOG = [
  { id: 'memory_match', name: 'Memory Match', domain: 'Working Memory', defaultDuration: 120, difficulty: 'medium' as const },
  { id: 'reaction_time', name: 'Reaction Time & Reflex', domain: 'Processing Speed', defaultDuration: 60, difficulty: 'medium' as const },
  { id: 'stroop_clash', name: 'Stroop Color Clash', domain: 'Inhibitory Control', defaultDuration: 90, difficulty: 'hard' as const },
  { id: 'spatial_grid', name: 'Spatial Grid Recall', domain: 'Visuospatial Memory', defaultDuration: 120, difficulty: 'medium' as const },
  { id: 'n_back_sequence', name: 'N-Back Sequence', domain: 'Active Working Memory', defaultDuration: 150, difficulty: 'hard' as const },
  { id: 'motor_rhythm', name: 'Motor Rhythm Tap', domain: 'Sensorimotor Coordination', defaultDuration: 90, difficulty: 'easy' as const },
  { id: 'trail_making', name: 'Trail Making Test', domain: 'Cognitive Flexibility', defaultDuration: 100, difficulty: 'medium' as const },
  { id: 'object_matrix', name: 'Object Recognition Matrix', domain: 'Visual Agnosia Recovery', defaultDuration: 120, difficulty: 'easy' as const },
  { id: 'semantic_pair', name: 'Word-Color Semantic Pair', domain: 'Language Processing', defaultDuration: 90, difficulty: 'medium' as const },
  { id: 'digit_span', name: 'Digit Span Backward', domain: 'Auditory/Verbal Memory', defaultDuration: 120, difficulty: 'hard' as const },
  { id: 'target_saccades', name: 'Target Tracking Saccades', domain: 'Oculomotor Tracking', defaultDuration: 80, difficulty: 'easy' as const },
  { id: 'dual_task', name: 'Dual-Task Balance & Number', domain: 'Divided Attention', defaultDuration: 180, difficulty: 'hard' as const },
  { id: 'pattern_matrix', name: 'Pattern Completion Matrix', domain: 'Fluid Reasoning', defaultDuration: 120, difficulty: 'medium' as const },
];

// Physical Exercises Catalog
export const EXERCISES_CATALOG = [
  {
    id: 'arm_raise',
    name: 'Arm Raise (Anterior Deltoid & Flexion)',
    description: 'Active vertical shoulder flexion tracked via front camera ML pose estimation',
    defaultReps: 12,
    defaultAngle: 120,
    defaultTime: 'Morning (09:00 AM)',
    frequencyPerDay: 2,
  },
  {
    id: 'shoulder_abduction',
    name: 'Shoulder Abduction (Coronal Plane)',
    description: 'Lateral arm raise to strengthen supraspinatus & lateral deltoid',
    defaultReps: 10,
    defaultAngle: 90,
    defaultTime: 'Morning (10:30 AM)',
    frequencyPerDay: 1,
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion & Forearm Control',
    description: 'Controlled concentric bicep contraction & eccentric lowering',
    defaultReps: 15,
    defaultAngle: 135,
    defaultTime: 'Afternoon (02:00 PM)',
    frequencyPerDay: 2,
  },
  {
    id: 'wrist_extension',
    name: 'Wrist & Finger Extension Recovery',
    description: 'Distal motor recovery against gravity for grip function',
    defaultReps: 15,
    defaultAngle: 60,
    defaultTime: 'Evening (05:30 PM)',
    frequencyPerDay: 1,
  },
  {
    id: 'trunk_balance',
    name: 'Seated Trunk Core Stabilization',
    description: 'Postural symmetry and core sway control in upright posture',
    defaultReps: 10,
    defaultAngle: 30,
    defaultTime: 'Evening (07:00 PM)',
    frequencyPerDay: 1,
  },
];

// Reference photo presets (realistic medical avatars for fast demonstration)
const SAMPLE_FACE_PHOTOS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
];

export function NewPatientPrescriptionModal({ isOpen, onClose, onCreated }: NewPatientPrescriptionModalProps) {
  // Mode: 'wizard' (4-5 buttons) vs 'upload' (description upload/paste)
  const [entryMode, setEntryMode] = useState<'wizard' | 'upload'>('wizard');

  // Step in wizard: 1: Patient & Face, 2: Exercises & Games, 3: Nutrition & Plan
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Patient Identity
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientDob, setPatientDob] = useState('1978-04-12');
  const [patientGender, setPatientGender] = useState('female');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('Ischemic Stroke · Right Hemiparesis');
  const [clinicalNotes, setClinicalNotes] = useState('Initiating daily arm raise kinematic rehab, neuro-cognitive stimulation, and restorative nutrition.');

  // Face Verification Photo
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_FACE_PHOTOS[0]);
  const [isUsingWebcam, setIsUsingWebcam] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Selected Physical Exercises
  const [selectedExercises, setSelectedExercises] = useState<{
    [exerciseId: string]: {
      enabled: boolean;
      reps: number;
      targetAngle: number;
      timeOfDay: string;
      frequencyPerDay: number;
    };
  }>({
    arm_raise: { enabled: true, reps: 12, targetAngle: 120, timeOfDay: 'Morning (09:00 AM)', frequencyPerDay: 2 },
    shoulder_abduction: { enabled: false, reps: 10, targetAngle: 90, timeOfDay: 'Morning (10:30 AM)', frequencyPerDay: 1 },
    elbow_flexion: { enabled: true, reps: 15, targetAngle: 135, timeOfDay: 'Afternoon (02:00 PM)', frequencyPerDay: 1 },
    wrist_extension: { enabled: false, reps: 15, targetAngle: 60, timeOfDay: 'Evening (05:30 PM)', frequencyPerDay: 1 },
    trunk_balance: { enabled: false, reps: 10, targetAngle: 30, timeOfDay: 'Evening (07:00 PM)', frequencyPerDay: 1 },
  });

  // Selected Cognitive Games
  const [selectedGames, setSelectedGames] = useState<{
    [gameId: string]: {
      enabled: boolean;
      durationSeconds: number;
      timeOfDay: string;
      difficulty: 'easy' | 'medium' | 'hard';
    };
  }>({
    memory_match: { enabled: true, durationSeconds: 120, timeOfDay: 'Afternoon (03:00 PM)', difficulty: 'medium' },
    reaction_time: { enabled: true, durationSeconds: 60, timeOfDay: 'Evening (06:00 PM)', difficulty: 'medium' },
    stroop_clash: { enabled: false, durationSeconds: 90, timeOfDay: 'Afternoon (04:00 PM)', difficulty: 'hard' },
    spatial_grid: { enabled: false, durationSeconds: 120, timeOfDay: 'Morning (11:00 AM)', difficulty: 'medium' },
    motor_rhythm: { enabled: false, durationSeconds: 90, timeOfDay: 'Morning (11:30 AM)', difficulty: 'easy' },
  });

  // Food & Nutrition
  const [dietOverview, setDietOverview] = useState('High-protein anti-inflammatory neuro-rehabilitation nutrition');
  const [hydrationTargetMl, setHydrationTargetMl] = useState(2500);
  const [breakfastRec, setBreakfastRec] = useState('Oats, wild blueberries, walnuts, Greek yogurt, or boiled eggs with choline');
  const [lunchRec, setLunchRec] = useState('Grilled wild salmon, quinoa, dark leafy greens, avocado & extra virgin olive oil');
  const [dinnerRec, setDinnerRec] = useState('Steamed lean poultry or lentils, roasted sweet potatoes, steamed broccoli with turmeric');
  const [recommendedFoods, setRecommendedFoods] = useState('Wild Salmon (Omega-3), Blueberries (Anthocyanins), Walnuts, Eggs (Choline), Turmeric, Spinach');
  const [foodsToAvoid, setFoodsToAvoid] = useState('Ultra-processed trans fats, sugary beverages, excessive sodium, cured nitrate meats');

  // Description / Document Upload Mode State
  const [rawDescription, setRawDescription] = useState('');
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    patientName: string;
    patientEmail: string;
    mrn: string;
    activationCode: string;
    temporaryPassword: string;
    photoUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Auto-generate a clinical patient email
  function generatePatientEmail() {
    const clean = patientName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const generated = clean ? `${clean}.${rand}@patient.neurorehab.health` : `patient.${Date.now().toString().slice(-5)}@patient.neurorehab.health`;
    setPatientEmail(generated);
  }

  // 1-Click Protocol Presets (Click 1 of 4 buttons to configure entire prescription instantly)
  function applyPreset(presetType: 'stroke' | 'tbi' | 'parkinson' | 'general') {
    if (presetType === 'stroke') {
      setPrimaryDiagnosis('Post-Stroke MCA Hemiparesis · Upper Limb Recovery');
      setDietOverview('Neurovascular Repair: High-protein, DHA omega-3, vascular protective protocol');
      setHydrationTargetMl(2600);
      setBreakfastRec('Omega-3 rich eggs, sliced avocado, oatmeal with blueberries and pumpkin seeds');
      setLunchRec('Grilled salmon with olive oil, baby spinach, brown rice, turmeric vinaigrette');
      setDinnerRec('Herb-roasted chicken breast, steamed asparagus, sweet potato mash');
      setSelectedExercises({
        arm_raise: { enabled: true, reps: 15, targetAngle: 125, timeOfDay: 'Morning (09:00 AM)', frequencyPerDay: 2 },
        shoulder_abduction: { enabled: true, reps: 10, targetAngle: 90, timeOfDay: 'Afternoon (02:30 PM)', frequencyPerDay: 1 },
        elbow_flexion: { enabled: true, reps: 15, targetAngle: 135, timeOfDay: 'Evening (06:00 PM)', frequencyPerDay: 1 },
        wrist_extension: { enabled: true, reps: 12, targetAngle: 60, timeOfDay: 'Morning (11:00 AM)', frequencyPerDay: 1 },
        trunk_balance: { enabled: false, reps: 10, targetAngle: 30, timeOfDay: 'Evening (07:00 PM)', frequencyPerDay: 1 },
      });
      setSelectedGames({
        memory_match: { enabled: true, durationSeconds: 120, timeOfDay: 'Morning (10:00 AM)', difficulty: 'medium' },
        reaction_time: { enabled: true, durationSeconds: 60, timeOfDay: 'Afternoon (03:30 PM)', difficulty: 'medium' },
        stroop_clash: { enabled: false, durationSeconds: 90, timeOfDay: 'Afternoon (04:00 PM)', difficulty: 'hard' },
        spatial_grid: { enabled: true, durationSeconds: 120, timeOfDay: 'Evening (05:00 PM)', difficulty: 'easy' },
        motor_rhythm: { enabled: true, durationSeconds: 90, timeOfDay: 'Morning (11:30 AM)', difficulty: 'easy' },
      });
    } else if (presetType === 'tbi') {
      setPrimaryDiagnosis('Traumatic Brain Injury (TBI) · Cognitive & Motor Rehabilitation');
      setDietOverview('Brain Metabolism & Mitochondrial Support: Ketogenic-leaning MCTs and anti-inflammatory');
      setHydrationTargetMl(2800);
      setBreakfastRec('Keto avocado egg scramble, spinach, walnut crunch, matcha green tea');
      setLunchRec('Sardines or wild salmon salad with walnuts, olive oil, microgreens');
      setDinnerRec('Grass-fed lean beef or lentil stew, roasted broccoli, bone broth');
      setSelectedExercises({
        arm_raise: { enabled: true, reps: 12, targetAngle: 120, timeOfDay: 'Morning (09:30 AM)', frequencyPerDay: 1 },
        shoulder_abduction: { enabled: false, reps: 10, targetAngle: 90, timeOfDay: 'Afternoon (02:30 PM)', frequencyPerDay: 1 },
        elbow_flexion: { enabled: true, reps: 12, targetAngle: 130, timeOfDay: 'Afternoon (02:00 PM)', frequencyPerDay: 1 },
        wrist_extension: { enabled: false, reps: 12, targetAngle: 60, timeOfDay: 'Morning (11:00 AM)', frequencyPerDay: 1 },
        trunk_balance: { enabled: true, reps: 12, targetAngle: 30, timeOfDay: 'Evening (06:30 PM)', frequencyPerDay: 2 },
      });
      setSelectedGames({
        memory_match: { enabled: true, durationSeconds: 120, timeOfDay: 'Morning (10:30 AM)', difficulty: 'medium' },
        reaction_time: { enabled: true, durationSeconds: 90, timeOfDay: 'Afternoon (01:30 PM)', difficulty: 'medium' },
        stroop_clash: { enabled: true, durationSeconds: 90, timeOfDay: 'Afternoon (04:00 PM)', difficulty: 'medium' },
        spatial_grid: { enabled: true, durationSeconds: 120, timeOfDay: 'Evening (05:30 PM)', difficulty: 'medium' },
        motor_rhythm: { enabled: false, durationSeconds: 90, timeOfDay: 'Morning (11:30 AM)', difficulty: 'easy' },
      });
    } else if (presetType === 'parkinson') {
      setPrimaryDiagnosis("Parkinson's Disease · Bradykinesia & Dual-Task Rhythm Training");
      setDietOverview('Neuro-protective Mediterranean: High fiber, levodopa-compatible protein timing');
      setHydrationTargetMl(2500);
      setBreakfastRec('Oat bran with flaxseed, chia, almond butter, sliced pear');
      setLunchRec('Mediterranean chickpea & roasted vegetable salad with feta and olive oil');
      setDinnerRec('Baked cod, steamed green beans, quinoa, evening protein portioning');
      setSelectedExercises({
        arm_raise: { enabled: true, reps: 15, targetAngle: 130, timeOfDay: 'Morning (09:00 AM)', frequencyPerDay: 2 },
        shoulder_abduction: { enabled: true, reps: 12, targetAngle: 95, timeOfDay: 'Morning (11:00 AM)', frequencyPerDay: 1 },
        elbow_flexion: { enabled: true, reps: 15, targetAngle: 140, timeOfDay: 'Afternoon (03:00 PM)', frequencyPerDay: 2 },
        wrist_extension: { enabled: true, reps: 15, targetAngle: 65, timeOfDay: 'Evening (06:00 PM)', frequencyPerDay: 1 },
        trunk_balance: { enabled: true, reps: 15, targetAngle: 35, timeOfDay: 'Evening (07:30 PM)', frequencyPerDay: 1 },
      });
      setSelectedGames({
        memory_match: { enabled: true, durationSeconds: 120, timeOfDay: 'Morning (10:00 AM)', difficulty: 'easy' },
        reaction_time: { enabled: true, durationSeconds: 90, timeOfDay: 'Afternoon (02:00 PM)', difficulty: 'medium' },
        stroop_clash: { enabled: true, durationSeconds: 90, timeOfDay: 'Afternoon (04:30 PM)', difficulty: 'medium' },
        spatial_grid: { enabled: false, durationSeconds: 120, timeOfDay: 'Evening (05:00 PM)', difficulty: 'medium' },
        motor_rhythm: { enabled: true, durationSeconds: 120, timeOfDay: 'Morning (11:30 AM)', difficulty: 'medium' },
      });
    } else {
      setPrimaryDiagnosis('Neurorehabilitation Maintenance & Active Recovery');
      setDietOverview('Balanced Anti-Inflammatory Longevity Nutrition');
      setHydrationTargetMl(2500);
      setBreakfastRec('Mixed berry smoothie with plant protein, chia seeds, and walnut meal');
      setLunchRec('Grilled turkey or tempeh, wild rice, sautéed kale, olive oil drizzle');
      setDinnerRec('Roasted white fish or lentils, roasted carrots, beet salad');
      setSelectedExercises({
        arm_raise: { enabled: true, reps: 12, targetAngle: 120, timeOfDay: 'Morning (09:00 AM)', frequencyPerDay: 1 },
        shoulder_abduction: { enabled: false, reps: 10, targetAngle: 90, timeOfDay: 'Morning (10:30 AM)', frequencyPerDay: 1 },
        elbow_flexion: { enabled: true, reps: 12, targetAngle: 130, timeOfDay: 'Afternoon (02:00 PM)', frequencyPerDay: 1 },
        wrist_extension: { enabled: false, reps: 10, targetAngle: 60, timeOfDay: 'Evening (05:30 PM)', frequencyPerDay: 1 },
        trunk_balance: { enabled: false, reps: 10, targetAngle: 30, timeOfDay: 'Evening (07:00 PM)', frequencyPerDay: 1 },
      });
      setSelectedGames({
        memory_match: { enabled: true, durationSeconds: 120, timeOfDay: 'Afternoon (03:00 PM)', difficulty: 'medium' },
        reaction_time: { enabled: true, durationSeconds: 60, timeOfDay: 'Evening (06:00 PM)', difficulty: 'medium' },
        stroop_clash: { enabled: false, durationSeconds: 90, timeOfDay: 'Afternoon (04:00 PM)', difficulty: 'hard' },
        spatial_grid: { enabled: false, durationSeconds: 120, timeOfDay: 'Morning (11:00 AM)', difficulty: 'medium' },
        motor_rhythm: { enabled: false, durationSeconds: 90, timeOfDay: 'Morning (11:30 AM)', difficulty: 'easy' },
      });
    }
  }

  // Smart Clinical Note / Description Parser
  function parseDescriptionText() {
    if (!rawDescription.trim()) return;
    const text = rawDescription.toLowerCase();

    // Check for patient name
    const nameMatch = rawDescription.match(/(?:patient(?:\s+name)?|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch) {
      setPatientName(nameMatch[1]);
      const clean = nameMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '');
      setPatientEmail(`${clean}.${Math.floor(100 + Math.random() * 900)}@patient.neurorehab.health`);
    }

    // Check for diagnosis
    if (text.includes('stroke') || text.includes('hemiparesis') || text.includes('infarct')) {
      setPrimaryDiagnosis('Post-Stroke Hemiparesis · Upper Extremity Recovery');
    } else if (text.includes('tbi') || text.includes('traumatic brain') || text.includes('concussion')) {
      setPrimaryDiagnosis('Traumatic Brain Injury (TBI) · Cognitive Motor Rehab');
    } else if (text.includes('parkinson') || text.includes('tremor') || text.includes('bradykinesia')) {
      setPrimaryDiagnosis("Parkinson's Disease · Bilateral Motor & Coordination");
    }

    // Check for arm raise reps & angles
    const armRepsMatch = rawDescription.match(/(?:arm\s*raise|reps?)[^\d]*(\d+)\s*(?:reps?|repetitions)/i);
    const armAngleMatch = rawDescription.match(/(\d+)\s*(?:deg|degrees?|°)/i);
    const reps = armRepsMatch ? parseInt(armRepsMatch[1]) : 12;
    const angle = armAngleMatch ? parseInt(armAngleMatch[1]) : 120;

    // Check for games mentioned
    const memoryMatch = text.includes('memory') || text.includes('match');
    const reactionTime = text.includes('reaction') || text.includes('speed') || text.includes('reflex');
    const stroop = text.includes('stroop') || text.includes('color');
    const rhythm = text.includes('rhythm') || text.includes('tap');

    setSelectedExercises((prev) => ({
      ...prev,
      arm_raise: { enabled: true, reps: reps || 12, targetAngle: angle || 120, timeOfDay: 'Morning (09:00 AM)', frequencyPerDay: 2 },
      elbow_flexion: { enabled: text.includes('elbow') || text.includes('bicep'), reps: 15, targetAngle: 135, timeOfDay: 'Afternoon (02:00 PM)', frequencyPerDay: 1 },
    }));

    setSelectedGames((prev) => ({
      ...prev,
      memory_match: { enabled: memoryMatch, durationSeconds: 120, timeOfDay: 'Morning (10:30 AM)', difficulty: 'medium' },
      reaction_time: { enabled: reactionTime, durationSeconds: 60, timeOfDay: 'Afternoon (03:00 PM)', difficulty: 'medium' },
      stroop_clash: { enabled: stroop, durationSeconds: 90, timeOfDay: 'Afternoon (04:30 PM)', difficulty: 'hard' },
      motor_rhythm: { enabled: rhythm, durationSeconds: 90, timeOfDay: 'Morning (11:30 AM)', difficulty: 'easy' },
    }));

    // Food & Nutrition mentions
    if (text.includes('salmon') || text.includes('omega') || text.includes('protein') || text.includes('diet')) {
      setDietOverview('Clinical Prescription Nutrition: High protein, anti-inflammatory & neuroplastic repair');
    }
    const waterMatch = rawDescription.match(/(\d{3,4})\s*(?:ml|milliliters?|cc)/i);
    if (waterMatch) {
      setHydrationTargetMl(parseInt(waterMatch[1]));
    }

    setParseSuccess('Successfully parsed clinical notes! Review extracted prescription below and confirm.');
    setTimeout(() => setParseSuccess(null), 5000);
    setEntryMode('wizard');
    setWizardStep(2); // Jump directly to exercise review
  }

  // Handle File Upload for photo
  function handlePhotoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Live Webcam Snapshot
  async function startWebcam() {
    setIsUsingWebcam(true);
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setWebcamError('Unable to access webcam. Please check permissions or select a reference portrait.');
      setIsUsingWebcam(false);
    }
  }

  function captureWebcamPhoto() {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(dataUrl);
      }
      // Stop webcam stream
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      setIsUsingWebcam(false);
    }
  }

  // Assemble and submit the patient + prescription
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError('Patient name is required');
      setWizardStep(1);
      return;
    }

    const emailToUse = patientEmail.trim() || `${patientName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Math.floor(100 + Math.random() * 900)}@patient.neurorehab.health`;

    // Construct assigned activities
    const activities: any[] = [];

    // Add physical exercises
    Object.entries(selectedExercises).forEach(([id, cfg]) => {
      if (cfg.enabled) {
        const catalogItem = EXERCISES_CATALOG.find((e) => e.id === id);
        activities.push({
          activityType: 'physical_exercise',
          activityName: catalogItem?.name || id,
          exerciseId: id,
          timeOfDay: cfg.timeOfDay,
          configuration: {
            targetRepetitions: cfg.reps,
            targetRomMaxAngle: cfg.targetAngle,
            targetRomMinAngle: 15,
            targetDurationSeconds: cfg.reps * 12,
            cadenceRepsPerMin: 10,
            cameraOrientation: 'portrait',
            instructions: `Perform in upright posture. Elevate arm steadily toward ${cfg.targetAngle} degrees without trunk leaning.`,
          },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          frequencyPerDay: cfg.frequencyPerDay,
          status: 'active',
        });
      }
    });

    // Add cognitive games
    Object.entries(selectedGames).forEach(([id, cfg]) => {
      if (cfg.enabled) {
        const catalogItem = COGNITIVE_GAMES_CATALOG.find((g) => g.id === id);
        activities.push({
          activityType: 'cognitive_game',
          activityName: catalogItem?.name || id,
          gameId: id,
          timeOfDay: cfg.timeOfDay,
          configuration: {
            difficulty: cfg.difficulty,
            cognitiveDomain: catalogItem?.domain || 'Executive Function',
            targetDurationSeconds: cfg.durationSeconds,
            instructions: `Complete assigned daily cognitive challenge to promote neural plasticity.`,
          },
          scheduledDays: ['monday', 'wednesday', 'friday'],
          frequencyPerDay: 1,
          status: 'active',
        });
      }
    });

    // Build dietary plan
    const dietaryPlan = {
      overview: dietOverview,
      nutritionGoals: [
        'Optimal amino acid delivery for neuromuscular motor repair',
        'DHA/EPA brain-supportive fatty acids for myelin preservation',
        `Structured daily hydration target: ${hydrationTargetMl} ml`,
      ],
      hydrationTargetMl,
      meals: [
        { timing: '08:30 AM', meal: 'Breakfast', recommendations: breakfastRec },
        { timing: '01:00 PM', meal: 'Lunch', recommendations: lunchRec },
        { timing: '07:00 PM', meal: 'Dinner', recommendations: dinnerRec },
      ],
      foodsRecommended: recommendedFoods.split(',').map((f) => f.trim()).filter(Boolean),
      foodsToAvoid: foodsToAvoid.split(',').map((f) => f.trim()).filter(Boolean),
    };

    setIsSubmitting(true);
    try {
      const response = await ApiService.createPatient({
        name: patientName.trim(),
        email: emailToUse,
        dateOfBirth: patientDob,
        gender: patientGender,
        primaryDiagnosis,
        clinicalNotes,
        profilePhotoUrl: photoUrl,
        photo: photoUrl,
        dietaryPlan,
        assignedActivities: activities,
      });

      // Show success modal with credentials
      setCreatedCredentials({
        patientName: response.patient.name,
        patientEmail: response.patient.email,
        mrn: response.profile.mrn,
        activationCode: response.onboardingCredentials.activationCode,
        temporaryPassword: response.onboardingCredentials.temporaryPassword,
        photoUrl,
      });

      onCreated(response);
    } catch (err: any) {
      setError(err.message || 'Failed to create patient and prescription');
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyCredentials() {
    if (!createdCredentials) return;
    const text = `NeuroRehab Connect Patient Credentials
Name: ${createdCredentials.patientName}
MRN: ${createdCredentials.mrn}
Email: ${createdCredentials.patientEmail}
Activation Code: ${createdCredentials.activationCode}
Temporary Password: ${createdCredentials.temporaryPassword}
Face Verification: Enrolled for Mobile Camera Verification`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Prescribe Patient Rehabilitation Protocol</h2>
              <p className="text-xs text-blue-200">
                Exercises • Cognitive Games • Food & Nutrition • AI Face Verification Enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials Created Confirmation View */}
        {createdCredentials ? (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient Onboarded & Protocol Prescribed!</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Patient profile, biometric face enrollment, exercises, cognitive games, and nutrition plan have been synchronized to the backend.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 max-w-lg mx-auto">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <img
                  src={createdCredentials.photoUrl}
                  alt={createdCredentials.patientName}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{createdCredentials.patientName}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Face Enrolled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{createdCredentials.mrn}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{createdCredentials.patientEmail}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Activation Code (for Flutter App)</span>
                  <div className="flex items-center justify-between mt-1 px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono text-sm font-bold text-blue-700">
                    <span>{createdCredentials.activationCode}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Initial Temporary Password</span>
                  <div className="flex items-center justify-between mt-1 px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono text-sm font-bold text-slate-800">
                    <span>{createdCredentials.temporaryPassword}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    The patient will enter these credentials in the Flutter mobile application, where they will prompt a new secure password and face-verify against their enrolled photo.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Patient Credentials'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Entry Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-100 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMode('wizard')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    entryMode === 'wizard' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Interactive 4-Click Prescriber</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('upload')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    entryMode === 'upload' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload Description / Clinical Notes</span>
                </button>
              </div>

              {entryMode === 'wizard' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold self-end sm:self-auto">
                  <span className={`px-2 py-0.5 rounded-md ${wizardStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    1. Patient & Face
                  </span>
                  <span>→</span>
                  <span className={`px-2 py-0.5 rounded-md ${wizardStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    2. Exercises & Games
                  </span>
                  <span>→</span>
                  <span className={`px-2 py-0.5 rounded-md ${wizardStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    3. Food & Review
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {parseSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{parseSuccess}</span>
              </div>
            )}

            {/* DESCRIPTION UPLOAD / PASTE MODE */}
            {entryMode === 'upload' ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-1 text-xs font-bold text-indigo-900">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Upload or Paste Entire Clinical Prescription Description</span>
                  </div>
                  <p className="text-xs text-indigo-700">
                    Just paste or upload what you have written about the patient (diagnosis, exercises, angles, games, and food/nutrition). Our smart parser will extract everything automatically in seconds!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinical Notes / Prescription Text
                  </label>
                  <textarea
                    rows={7}
                    value={rawDescription}
                    onChange={(e) => setRawDescription(e.target.value)}
                    placeholder="Example:
Patient Name: John Henderson
Diagnosis: Left MCA Stroke with Right Hemiparesis
Prescribed Exercises: Arm Raise 15 reps at 120 degrees twice daily at 09:00 AM and 05:00 PM. Elbow flexion 15 reps at 02:00 PM.
Prescribed Games: Memory Match for 120 seconds and Reaction Time for 60 seconds at 03:00 PM.
Nutrition & Diet: High protein neurovascular recovery with wild salmon, walnuts, blueberries, and 2500 ml water. Avoid trans fats."
                    className="w-full p-3.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-hidden bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRawDescription(`Patient Name: Maria Rodriguez
Diagnosis: Post-Ischemic Stroke Hemiparesis
Prescribed Exercises: Arm Raise 15 reps at 125 degrees twice daily at 09:00 AM and 06:00 PM. Shoulder abduction 10 reps at 90 degrees.
Prescribed Games: Memory Match 120 seconds, Reaction Time 60 seconds, and Stroop Color Clash at 03:30 PM.
Dietary Protocol: High protein brain repair, daily 2600 ml hydration, wild salmon, avocados, blueberries, and walnuts.`);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Load Sample Clinical Note
                  </button>

                  <button
                    type="button"
                    onClick={parseDescriptionText}
                    disabled={!rawDescription.trim()}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Parse Notes & Auto-Fill Prescription</span>
                  </button>
                </div>
              </div>
            ) : (
              /* WIZARD MODE (4-5 BUTTONS) */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* STEP 1: PATIENT IDENTITY & FACE VERIFICATION PHOTO */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    {/* 1-Click Protocol Preset Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>1-Click Clinical Condition Presets (Click to Auto-Configure)</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset('stroke')}
                          className="p-2.5 text-left rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-blue-900">Post-Stroke Hemiparesis</div>
                          <div className="text-[10px] text-blue-700 mt-0.5">Arm Raise 125° • Memory • Salmon Diet</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyPreset('tbi')}
                          className="p-2.5 text-left rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-indigo-900">Traumatic Brain Injury</div>
                          <div className="text-[10px] text-indigo-700 mt-0.5">Dual Task • Reaction Speed • 2800ml</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyPreset('parkinson')}
                          className="p-2.5 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-amber-900">Parkinson's Coordination</div>
                          <div className="text-[10px] text-amber-700 mt-0.5">Rhythm Tap • Big Amplitude • Fiber Diet</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyPreset('general')}
                          className="p-2.5 text-left rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition cursor-pointer"
                        >
                          <div className="text-xs font-bold text-emerald-900">Neuro Recovery Baseline</div>
                          <div className="text-[10px] text-emerald-700 mt-0.5">Daily Arm Raise • Memory • Balanced</div>
                        </button>
                      </div>
                    </div>

                    {/* Face Verification Reference Photo Section */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            <span>Biometric Face Verification Photo (Required)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            This picture is used to face-verify the patient each time they open the mobile app to exercise, confirming authentic patient identity.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Reference Enrolled
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        {/* Current Photo Preview */}
                        <div className="relative shrink-0">
                          <img
                            src={photoUrl}
                            alt="Patient Face Reference"
                            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-md"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Camera Capture or Preset Options */}
                        <div className="flex-1 space-y-2 text-xs">
                          {isUsingWebcam ? (
                            <div className="space-y-2">
                              <video ref={videoRef} className="w-48 h-36 rounded-xl object-cover border border-slate-300" />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={captureWebcamPhoto}
                                  className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" /> Take Snapshot
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsUsingWebcam(false)}
                                  className="py-1.5 px-3 bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={startWebcam}
                                  className="py-1.5 px-3 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 rounded-xl font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Take Live Camera Snapshot</span>
                                </button>

                                <label className="py-1.5 px-3 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 rounded-xl font-medium text-xs flex items-center gap-1.5 transition cursor-pointer">
                                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Upload Photo File</span>
                                  <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
                                </label>
                              </div>

                              <div>
                                <span className="text-[11px] text-slate-500 block mb-1 font-medium">Or select medical demo reference portrait:</span>
                                <div className="flex items-center gap-2">
                                  {SAMPLE_FACE_PHOTOS.map((src, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setPhotoUrl(src)}
                                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                                        photoUrl === src ? 'border-emerald-600 ring-2 ring-emerald-400' : 'border-slate-200 opacity-60 hover:opacity-100'
                                      }`}
                                    >
                                      <img src={src} alt="sample face" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {webcamError && <p className="text-xs text-rose-600">{webcamError}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Patient Demographics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Patient Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="e.g. Eleanor Vance"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Patient Email / App Login
                          </label>
                          <button
                            type="button"
                            onClick={generatePatientEmail}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            Generate Auto ID
                          </button>
                        </div>
                        <input
                          type="email"
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                          placeholder="eleanor.vance@patient.neurorehab.health"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={patientDob}
                          onChange={(e) => setPatientDob(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Gender
                        </label>
                        <select
                          value={patientGender}
                          onChange={(e) => setPatientGender(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden bg-white"
                        >
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="non_binary">Non-Binary</option>
                          <option value="prefer_not_to_say">Other / Unspecified</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Primary Neurological Diagnosis
                        </label>
                        <input
                          type="text"
                          value={primaryDiagnosis}
                          onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                          placeholder="e.g. Left MCA Ischemic Stroke"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!patientName.trim()) {
                            setError('Please provide the patient name');
                            return;
                          }
                          setError(null);
                          setWizardStep(2);
                        }}
                        className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
                      >
                        <span>Next: Configure Exercises & Games</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: EXERCISES & COGNITIVE GAMES SELECTION */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    {/* SECTION 1: PHYSICAL REHABILITATION EXERCISES */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span>1. Physical Exercises (What to do, Time, Reps & Range of Motion)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Exercises monitored in real-time by the patient's camera with ML joint angle tracking.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {EXERCISES_CATALOG.map((ex) => {
                          const isChecked = selectedExercises[ex.id]?.enabled || false;
                          const current = selectedExercises[ex.id] || {
                            enabled: false,
                            reps: ex.defaultReps,
                            targetAngle: ex.defaultAngle,
                            timeOfDay: ex.defaultTime,
                            frequencyPerDay: ex.frequencyPerDay,
                          };

                          return (
                            <div
                              key={ex.id}
                              className={`p-3.5 rounded-xl border transition ${
                                isChecked ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-slate-200 opacity-70'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedExercises({
                                        ...selectedExercises,
                                        [ex.id]: { ...current, enabled: e.target.checked },
                                      });
                                    }}
                                    className="w-4 h-4 mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">{ex.name}</div>
                                    <div className="text-[11px] text-slate-500">{ex.description}</div>
                                  </div>
                                </label>

                                {isChecked && (
                                  <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0 pt-2 sm:pt-0">
                                    {/* Time of Day */}
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <select
                                        value={current.timeOfDay}
                                        onChange={(e) => {
                                          setSelectedExercises({
                                            ...selectedExercises,
                                            [ex.id]: { ...current, timeOfDay: e.target.value },
                                          });
                                        }}
                                        className="text-xs bg-transparent outline-hidden font-medium text-slate-700"
                                      >
                                        <option value="Morning (08:30 AM)">Morning 08:30 AM</option>
                                        <option value="Morning (09:00 AM)">Morning 09:00 AM</option>
                                        <option value="Afternoon (02:00 PM)">Afternoon 02:00 PM</option>
                                        <option value="Evening (06:00 PM)">Evening 06:00 PM</option>
                                        <option value="Night (08:00 PM)">Night 08:00 PM</option>
                                      </select>
                                    </div>

                                    {/* Reps */}
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                                      <span className="text-[11px] text-slate-500 font-bold">Reps:</span>
                                      <select
                                        value={current.reps}
                                        onChange={(e) => {
                                          setSelectedExercises({
                                            ...selectedExercises,
                                            [ex.id]: { ...current, reps: parseInt(e.target.value) },
                                          });
                                        }}
                                        className="text-xs bg-transparent outline-hidden font-bold text-blue-700"
                                      >
                                        <option value={8}>8 reps</option>
                                        <option value={10}>10 reps</option>
                                        <option value={12}>12 reps</option>
                                        <option value={15}>15 reps</option>
                                        <option value={20}>20 reps</option>
                                      </select>
                                    </div>

                                    {/* Target Angle */}
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                                      <span className="text-[11px] text-slate-500 font-bold">Angle:</span>
                                      <select
                                        value={current.targetAngle}
                                        onChange={(e) => {
                                          setSelectedExercises({
                                            ...selectedExercises,
                                            [ex.id]: { ...current, targetAngle: parseInt(e.target.value) },
                                          });
                                        }}
                                        className="text-xs bg-transparent outline-hidden font-bold text-indigo-700"
                                      >
                                        <option value={60}>60°</option>
                                        <option value={90}>90°</option>
                                        <option value={120}>120°</option>
                                        <option value={135}>135°</option>
                                        <option value={150}>150°</option>
                                        <option value={180}>180°</option>
                                      </select>
                                    </div>

                                    {/* Frequency */}
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                                      <span className="text-[11px] text-slate-500 font-bold">Freq:</span>
                                      <select
                                        value={current.frequencyPerDay}
                                        onChange={(e) => {
                                          setSelectedExercises({
                                            ...selectedExercises,
                                            [ex.id]: { ...current, frequencyPerDay: parseInt(e.target.value) },
                                          });
                                        }}
                                        className="text-xs bg-transparent outline-hidden font-bold text-slate-700"
                                      >
                                        <option value={1}>1x / day</option>
                                        <option value={2}>2x / day</option>
                                        <option value={3}>3x / day</option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 2: 13 COGNITIVE NEURAL GAMES */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-indigo-600" />
                            <span>2. Cognitive Neural Games (13 Available In Mobile App)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Select which games the patient should play, at what time, and how long to play.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                        {COGNITIVE_GAMES_CATALOG.map((gm) => {
                          const isChecked = selectedGames[gm.id]?.enabled || false;
                          const current = selectedGames[gm.id] || {
                            enabled: false,
                            durationSeconds: gm.defaultDuration,
                            timeOfDay: 'Afternoon (03:00 PM)',
                            difficulty: gm.difficulty,
                          };

                          return (
                            <div
                              key={gm.id}
                              className={`p-3 rounded-xl border text-xs transition ${
                                isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <label className="flex items-start gap-2 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedGames({
                                        ...selectedGames,
                                        [gm.id]: { ...current, enabled: e.target.checked },
                                      });
                                    }}
                                    className="w-4 h-4 mt-0.5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div>
                                    <div className="font-bold text-slate-900">{gm.name}</div>
                                    <div className="text-[10px] text-indigo-700 font-semibold">{gm.domain}</div>
                                  </div>
                                </label>
                              </div>

                              {isChecked && (
                                <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-indigo-100">
                                  {/* Time */}
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">Schedule</span>
                                    <select
                                      value={current.timeOfDay}
                                      onChange={(e) => {
                                        setSelectedGames({
                                          ...selectedGames,
                                          [gm.id]: { ...current, timeOfDay: e.target.value },
                                        });
                                      }}
                                      className="w-full text-[11px] bg-white border border-slate-200 rounded-md p-1 font-semibold"
                                    >
                                      <option value="Morning (10:00 AM)">10:00 AM</option>
                                      <option value="Afternoon (01:30 PM)">01:30 PM</option>
                                      <option value="Afternoon (03:00 PM)">03:00 PM</option>
                                      <option value="Evening (05:00 PM)">05:00 PM</option>
                                      <option value="Night (07:30 PM)">07:30 PM</option>
                                    </select>
                                  </div>

                                  {/* Duration */}
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                                    <select
                                      value={current.durationSeconds}
                                      onChange={(e) => {
                                        setSelectedGames({
                                          ...selectedGames,
                                          [gm.id]: { ...current, durationSeconds: parseInt(e.target.value) },
                                        });
                                      }}
                                      className="w-full text-[11px] bg-white border border-slate-200 rounded-md p-1 font-semibold"
                                    >
                                      <option value={60}>1 min</option>
                                      <option value={90}>1.5 min</option>
                                      <option value={120}>2 mins</option>
                                      <option value={180}>3 mins</option>
                                      <option value={300}>5 mins</option>
                                    </select>
                                  </div>

                                  {/* Difficulty */}
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">Level</span>
                                    <select
                                      value={current.difficulty}
                                      onChange={(e) => {
                                        setSelectedGames({
                                          ...selectedGames,
                                          [gm.id]: { ...current, difficulty: e.target.value as any },
                                        });
                                      }}
                                      className="w-full text-[11px] bg-white border border-slate-200 rounded-md p-1 font-semibold"
                                    >
                                      <option value="easy">Easy</option>
                                      <option value="medium">Medium</option>
                                      <option value="hard">Hard</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
                      >
                        <span>Next: Food & Dietary Plan</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: FOOD, NUTRITION & CONFIRMATION */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Utensils className="w-4 h-4 text-emerald-600" />
                            <span>3. Food & Dietary Prescription (What to take, Meal Timing & Hydration)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Prescribe the exact nutrition protocol, meal timing, and hydration target for brain neuroplasticity.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Nutrition Plan Overview
                            </label>
                            <input
                              type="text"
                              value={dietOverview}
                              onChange={(e) => setDietOverview(e.target.value)}
                              placeholder="e.g. High-protein anti-inflammatory neuro-rehabilitation nutrition"
                              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Daily Hydration (mL)
                            </label>
                            <input
                              type="number"
                              step={100}
                              value={hydrationTargetMl}
                              onChange={(e) => setHydrationTargetMl(parseInt(e.target.value) || 2000)}
                              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white font-bold text-blue-700"
                            />
                          </div>
                        </div>

                        {/* Timed Meals */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Timed Meal Recommendations
                          </span>

                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                08:30 AM · Breakfast
                              </span>
                              <input
                                type="text"
                                value={breakfastRec}
                                onChange={(e) => setBreakfastRec(e.target.value)}
                                className="flex-1 text-xs border-0 outline-hidden text-slate-800 font-medium"
                                placeholder="Breakfast food..."
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                01:00 PM · Lunch
                              </span>
                              <input
                                type="text"
                                value={lunchRec}
                                onChange={(e) => setLunchRec(e.target.value)}
                                className="flex-1 text-xs border-0 outline-hidden text-slate-800 font-medium"
                                placeholder="Lunch food..."
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                                07:00 PM · Dinner
                              </span>
                              <input
                                type="text"
                                value={dinnerRec}
                                onChange={(e) => setDinnerRec(e.target.value)}
                                className="flex-1 text-xs border-0 outline-hidden text-slate-800 font-medium"
                                placeholder="Dinner food..."
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Recommended Brain Foods
                            </label>
                            <input
                              type="text"
                              value={recommendedFoods}
                              onChange={(e) => setRecommendedFoods(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Foods to Avoid
                            </label>
                            <input
                              type="text"
                              value={foodsToAvoid}
                              onChange={(e) => setFoodsToAvoid(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white text-rose-700 font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prescription Summary Checklist */}
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Ready to Issue Clinical Prescription</span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Patient: <strong>{patientName || 'Unspecified'}</strong> • Biometric Face Reference Enrolled • Exercises Prescribed • Cognitive Games Configured • Nutrition Active
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Enrolling & Prescribing...' : 'Confirm & Issue Patient Prescription'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
