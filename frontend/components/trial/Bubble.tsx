'use client';

import { Agent, RoleType } from '@/types';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';

interface BubbleProps {
  agent?: Agent;
  isSpeaking: boolean;
  isUser?: boolean;
  speaker?: boolean;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  disabled?: boolean;
}

const baseThemes = {
  [RoleType.JUDGE]: {
    outer: 'from-blue-400 via-cyan-400 to-indigo-600',
    inner: 'from-blue-200/60 via-cyan-200/40 to-purple-300/40',
    glow: 'shadow-[0_30px_60px_rgba(59,130,246,0.5)]',
  },
  [RoleType.PROSECUTOR]: {
    outer: 'from-rose-400 via-pink-400 to-orange-500',
    inner: 'from-rose-200/60 via-pink-200/40 to-amber-300/40',
    glow: 'shadow-[0_30px_60px_rgba(244,114,182,0.45)]',
  },
  [RoleType.DEFENSE]: {
    outer: 'from-emerald-400 via-teal-400 to-cyan-500',
    inner: 'from-emerald-200/60 via-teal-200/40 to-cyan-200/40',
    glow: 'shadow-[0_30px_60px_rgba(16,185,129,0.45)]',
  },
};

const userTheme = {
  outer: 'from-purple-400 via-fuchsia-400 to-blue-500',
  inner: 'from-purple-200/60 via-fuchsia-200/40 to-cyan-200/40',
  glow: 'shadow-[0_30px_60px_rgba(168,85,247,0.45)]',
};

const speakerTheme = {
  outer: 'from-[#3f9bff] via-[#9b5bff] to-[#ff5bbd]',
  inner: 'from-white/50 via-[#9bbcff1a] to-white/5',
  glow: 'shadow-[0_25px_70px_rgba(99,102,241,0.55)]',
};

export function Bubble({ agent, isSpeaking, isUser = false, speaker = false, onPressStart, onPressEnd, disabled = false }: BubbleProps) {
  const theme =
    speaker ? speakerTheme : isUser ? userTheme : baseThemes[agent?.role as RoleType] ?? baseThemes[RoleType.JUDGE];
  const name = isUser ? 'You' : agent?.name ?? 'Agent';
  const initial = isUser ? 'U' : agent?.name ? agent.name.charAt(0) : 'A';

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
      <div className="relative w-36 h-36">
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.outer} ${theme.glow} backdrop-blur-xl border border-white/20 ${speaker && !disabled ? 'cursor-pointer select-none' : ''} ${disabled ? 'opacity-50' : ''}`}
          animate={
            isSpeaking
              ? {
                  scale: [0.98, 1.03, 0.98],
                }
              : {
                  scale: [1, 1.01, 1],
                }
          }
          transition={{
            duration: isSpeaking ? 1.4 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), transparent 40%)`,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.inner}`}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <motion.div
            className="absolute inset-1 rounded-full border border-white/30 mix-blend-screen"
            animate={{
              opacity: [0.7, 0.4, 0.7],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <div className="relative z-10 h-full flex items-center justify-center">
            {speaker ? (
              <motion.div
                animate={
                  isSpeaking
                    ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7],
                      }
                    : { opacity: 0.9 }
                }
                transition={{ duration: 0.8, repeat: isSpeaking ? Infinity : 0 }}
                className="text-white"
              >
                <Mic className="h-10 w-10 drop-shadow-lg" />
              </motion.div>
            ) : (
              <motion.span
                className="text-white font-bold text-4xl drop-shadow"
                animate={
                  isSpeaking
                    ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.8, 1, 0.8],
                      }
                    : { opacity: 0.9 }
                }
                transition={{
                  duration: 0.8,
                  repeat: isSpeaking ? Infinity : 0,
                }}
              >
                {initial}
              </motion.span>
            )}
          </div>
        </motion.div>

        {isSpeaking && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border border-white/40"
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-white/30"
              animate={{
                scale: [1, 1.45, 1],
                opacity: [0.35, 0, 0.35],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.3,
              }}
            />
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="font-semibold text-lg">{speaker ? 'Your Mic' : name}</p>
        {!speaker && !isUser && <p className="text-sm text-muted-foreground capitalize">{agent?.role}</p>}
        {speaker && (
          <p className="text-sm text-muted-foreground">
            {isSpeaking ? 'Listening...' : 'Tap mic to speak'}
          </p>
        )}
        {isSpeaking && (
          <motion.p
            className="text-xs text-primary font-medium mt-1"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {speaker ? 'Capturing audio' : 'Speaking...'}
          </motion.p>
        )}
      </div>
    </div>
  );
}

