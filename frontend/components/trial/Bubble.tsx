'use client';

import { Agent, RoleType } from '@/types';
import { motion } from 'framer-motion';
import React from 'react';
import ThreeVisualizer from '@/components/trial/ThreeVisualizer';

interface BubbleProps {
  agent?: Agent;
  isSpeaking: boolean;
  isThinking?: boolean;
  isUser?: boolean;
  speaker?: boolean;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  disabled?: boolean;
  audioAnalyser?: AnalyserNode;
}

const baseThemes = {
  [RoleType.JUDGE]: {
    colors: { r: 0, g: 0.32, b: 0.85 },
    bgGradient: 'from-blue-500/20 via-cyan-500/10 to-indigo-600/20',
    glowColor: 'rgba(0, 82, 213, 0.44)',
  },
  [RoleType.PROSECUTOR]: {
    colors: { r: 0.85, g: 0, b: 0 },
    bgGradient: 'from-rose-500/20 via-pink-500/10 to-orange-500/20',
    glowColor: 'rgba(197, 0, 0, 0.73)',
  },
  [RoleType.DEFENSE]: {
    colors: { r: 0.25, g: 0.85, b: 0.64 },
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/20',
    glowColor: 'rgba(0, 181, 88, 0.33)',
  },
};

const userTheme = {
  colors: { r: 0.35, g: 0.001, b: 0.67 },
  bgGradient: 'from-purple-500/20 via-fuchsia-500/10 to-blue-500/20',
  glowColor: 'rgba(88, 1, 169, 0.21)',
};

const speakerTheme = {
  colors: { r: 0.001, g: 0.02, b: 0.85 },
  bgGradient: 'from-blue-500/20 via-violet-500/10 to-pink-500/20',
  glowColor: 'rgba(2, 6, 217, 0.54)', // Slightly increased opacity for better glow
};

export function Bubble({ 
  agent, 
  isSpeaking, 
  isThinking = false,
  isUser = false, 
  speaker = false, 
  onPressStart, 
  onPressEnd, 
  disabled = false,
  audioAnalyser 
}: BubbleProps) {
  const theme =
    speaker ? speakerTheme : isUser ? userTheme : baseThemes[agent?.role as RoleType] ?? baseThemes[RoleType.JUDGE];
  const name = isUser ? 'You' : agent?.name ?? 'Agent';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!disabled && onPressStart) {
      e.preventDefault();
      onPressStart();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!disabled && onPressEnd) {
      e.preventDefault();
      onPressEnd();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!disabled && onPressStart) {
      e.preventDefault();
      onPressStart();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!disabled && onPressEnd) {
      e.preventDefault();
      onPressEnd();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <motion.div 
        className="relative w-80 h-80"
        animate={isSpeaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ 
          duration: 1.5, 
          repeat: isSpeaking ? Infinity : 0, 
          ease: "easeInOut",
          scale: { duration: 0.2 }
        }}
      >
        {/* 1. Ambient Background Glow Layer */}
        {/* This layer sits behind the bubble and creates the soft light on the background */}
        <motion.div
          className={`absolute inset-32 rounded-full ${disabled ? 'opacity-50' : ''}`}
          style={{
            boxShadow: isThinking 
              ? `0 0 80px 50px ${theme.glowColor}` 
              : `0 0 60px 40px ${theme.glowColor}`,
          }}
          animate={
            isThinking 
              ? { 
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.1, 1]
                }
              : { opacity: 0.7, scale: 1 }
          }
          transition={{
            duration: 1.2,
            repeat: isThinking ? Infinity : 0,
            ease: "easeInOut"
          }}
        />

        {/* 2. Main Bubble Container */}
        {/* This contains the 3D visualizer and clips it to a circle */}
        <div
          className={`relative w-full h-full rounded-full overflow-visible ${speaker && !disabled ? 'cursor-pointer select-none' : ''} ${disabled ? 'opacity-50' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-10"> 
            <ThreeVisualizer 
              isSpeaking={isSpeaking} 
              theme={theme}
              audioAnalyser={audioAnalyser}
            />
          </div>
          
        </div>

        {/* 3. Ripple Effects (Outer rings) */}
        {isSpeaking && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30 pointer-events-none"
              animate={{
                scale: [1, 1.3],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none"
              animate={{
                scale: [1, 1.5],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.4,
              }}
            />
          </>
        )}
      </motion.div>

      <div className="text-center">
        <p className="font-semibold text-xl mt-[-30px]">{speaker ? 'You' : name}</p>
        {!speaker && !isUser && <p className="text-sm text-muted-foreground capitalize mt-1">{agent?.role}</p>}
        {speaker && (
          <p className="text-sm text-muted-foreground mt-1">
            {isSpeaking ? 'Listening...' : <>Hold the bubble or press <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">Space</kbd> to speak</>}
          </p>
        )}
        {isThinking && !isSpeaking && !speaker && (
          <motion.p
            className="text-sm font-semibold mt-2"
            style={{ color: theme.glowColor }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            Thinking...
          </motion.p>
        )}
        {isSpeaking && (
          <motion.p
            className="text-xs text-primary font-medium mt-2"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {speaker ? 'Capturing audio' : 'Speaking...'}
          </motion.p>
        )}
      </div>
    </div>
  );
}