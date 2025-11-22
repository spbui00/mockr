'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Scale, ArrowRight, Gavel, UserCheck, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RoleType } from '@/types';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const [factFlowId, setFactFlowId] = useState('');
  const [trialFlowId, setTrialFlowId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([
    RoleType.JUDGE,
    RoleType.PROSECUTOR,
    RoleType.DEFENSE,
  ]);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateAudioLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average / 255);
          }
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);


  const handleRoleToggle = (role: RoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleStartFactGathering = () => {
    if (!factFlowId.trim()) {
      alert('Please enter a Fact-Gathering Flow ID');
      return;
    }

    if (!trialFlowId.trim()) {
      alert('Please enter a Trial Flow ID');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('Please select at least one role');
      return;
    }

    const sessionId = uuidv4();
    const rolesParam = selectedRoles.join(',');
    
    router.push(`/fact-gathering/${sessionId}?factFlowId=${encodeURIComponent(factFlowId)}&trialFlowId=${encodeURIComponent(trialFlowId)}&roles=${encodeURIComponent(rolesParam)}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const scaleVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const roleVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center gap-1 px-4 opacity-25">
        {[...Array(80)].map((_, i) => {
          const centerDistance = Math.abs(i - 40) / 40;
          const baseHeight = 50 + Math.sin(i * 0.3) * 30;
          const audioMultiplier = Math.pow(audioLevel, 0.7) * 600 * (1 - centerDistance * 0.5);
          const height = baseHeight + audioMultiplier;
          
          return (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-b from-purple-300 via-purple-500 to-purple-300 rounded-lg"
              style={{
                minWidth: '2px',
              }}
              animate={{
                height: `${height}px`,
                opacity: 0.4 + audioLevel * 0.6,
              }}
              transition={{
                duration: 0.05,
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>

      <motion.div
        className="container max-w-4xl mx-auto px-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center mb-12">
          <motion.div className="flex justify-center mb-6" variants={scaleVariants}>
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Scale className="h-20 w-20 text-primary relative z-20" />
            </motion.div>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-bold mb-4 bg-gradient-to-l from-purple-600 to-black bg-clip-text text-transparent relative z-20"
          >
            Mockr Trial Simulator
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl text-muted-foreground relative z-20">
            AI-powered legal simulation with OpenJustice Dialog Flows
          </motion.p>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="p-8 backdrop-blur-sm bg-card/95 shadow-2xl border-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div>
                  <Label htmlFor="factFlowId" className="text-lg font-semibold">
                    Fact-Gathering Flow ID
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter the OpenJustice Dialog Flow ID for gathering case facts
                  </p>
                  <Input
                    id="factFlowId"
                    type="text"
                    placeholder="e.g., df_fact_gathering_123..."
                    value={factFlowId}
                    onChange={(e) => setFactFlowId(e.target.value)}
                    className="text-lg h-12 transition-all focus:scale-[1.02]"
                  />
                </div>

                <div>
                  <Label htmlFor="trialFlowId" className="text-lg font-semibold">
                    Trial Flow ID
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter the OpenJustice Dialog Flow ID for trial debate/argumentation
                  </p>
                  <Input
                    id="trialFlowId"
                    type="text"
                    placeholder="e.g., df_trial_debate_456..."
                    value={trialFlowId}
                    onChange={(e) => setTrialFlowId(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleStartFactGathering();
                      }
                    }}
                    className="text-lg h-12 transition-all focus:scale-[1.02]"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Label className="text-lg font-semibold mb-3 block">
                  Select Trial Roles
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose which roles will participate in the mock trial
                </p>
                <div className="space-y-3">
                  <motion.div
                    custom={0}
                    variants={roleVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      id="judge"
                      checked={selectedRoles.includes(RoleType.JUDGE)}
                      onCheckedChange={() => handleRoleToggle(RoleType.JUDGE)}
                    />
                    <Label
                      htmlFor="judge"
                      className="flex items-center space-x-2 cursor-pointer flex-1"
                    >
                      <Gavel className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Judge</p>
                        <p className="text-xs text-muted-foreground">
                          Presides over the trial, makes rulings
                        </p>
                      </div>
                    </Label>
                  </motion.div>

                  <motion.div
                    custom={1}
                    variants={roleVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      id="prosecutor"
                      checked={selectedRoles.includes(RoleType.PROSECUTOR)}
                      onCheckedChange={() => handleRoleToggle(RoleType.PROSECUTOR)}
                    />
                    <Label
                      htmlFor="prosecutor"
                      className="flex items-center space-x-2 cursor-pointer flex-1"
                    >
                      <UserCheck className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">Prosecutor</p>
                        <p className="text-xs text-muted-foreground">
                          Argues for conviction, presents evidence
                        </p>
                      </div>
                    </Label>
                  </motion.div>

                  <motion.div
                    custom={2}
                    variants={roleVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      id="defense"
                      checked={selectedRoles.includes(RoleType.DEFENSE)}
                      onCheckedChange={() => handleRoleToggle(RoleType.DEFENSE)}
                    />
                    <Label
                      htmlFor="defense"
                      className="flex items-center space-x-2 cursor-pointer flex-1"
                    >
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Defense Lawyer</p>
                        <p className="text-xs text-muted-foreground">
                          Defends the accused, challenges prosecution
                        </p>
                      </div>
                    </Label>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleStartFactGathering}
                  disabled={!factFlowId.trim() || !trialFlowId.trim() || selectedRoles.length === 0}
                  className="w-full h-12 text-lg shadow-lg"
                  size="lg"
                >
                  Start Fact Gathering
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

