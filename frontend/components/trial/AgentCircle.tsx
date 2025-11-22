'use client';

import { Agent, RoleType } from '@/types';
import { motion } from 'framer-motion';

interface AgentCircleProps {
  agent: Agent;
  isSpeaking: boolean;
}

const roleColors = {
  [RoleType.JUDGE]: 'bg-blue-500',
  [RoleType.PROSECUTOR]: 'bg-red-500',
  [RoleType.DEFENSE]: 'bg-green-500',
};

const roleBorderColors = {
  [RoleType.JUDGE]: 'border-blue-500',
  [RoleType.PROSECUTOR]: 'border-red-500',
  [RoleType.DEFENSE]: 'border-green-500',
};

export function AgentCircle({ agent, isSpeaking }: AgentCircleProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <motion.div
          className={`w-32 h-32 rounded-full ${roleColors[agent.role]} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
          animate={
            isSpeaking
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{
            duration: 1.5,
            repeat: isSpeaking ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {agent.name.charAt(0)}
        </motion.div>

        {isSpeaking && (
          <>
            <motion.div
              className={`absolute inset-0 rounded-full border-4 ${roleBorderColors[agent.role]}`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className={`absolute inset-0 rounded-full border-4 ${roleBorderColors[agent.role]}`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.3,
              }}
            />
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="font-semibold text-lg">{agent.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{agent.role}</p>
        {isSpeaking && (
          <motion.p
            className="text-xs text-primary font-medium mt-1"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Speaking...
          </motion.p>
        )}
      </div>
    </div>
  );
}

