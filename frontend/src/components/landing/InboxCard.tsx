import { motion } from 'framer-motion';
import type { AnimationCycle } from '../../config/animations';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface InboxCardProps {
  cycle: AnimationCycle;
  sender: string;
  subject: string;
  message: string;
  timestamp: string;
}

export const InboxCard = ({ cycle, sender, subject, message, timestamp }: InboxCardProps) => {
  return (
    <motion.div
      key={cycle}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.inbox.duration / 1000 }}
      className={`absolute ${CARD_POSITIONS.inbox} left-0 ${CARD_SIZES.inbox}`}
    >
      <motion.div
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-200/50 p-6 relative overflow-visible"
        animate={{
          y: ANIMATION_TIMING.floating.inbox.yOffset,
        }}
        transition={{
          duration: ANIMATION_TIMING.floating.inbox.duration / 1000,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Notification Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: ANIMATION_TIMING.cards.notificationBadge.delay / 1000,
            type: 'spring',
            stiffness: 500,
          }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10"
        >
          1
        </motion.div>

        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{sender}</p>
              <p className="text-xs text-slate-500">{timestamp}</p>
            </div>
          </div>
          <h4 className="font-bold text-slate-900 mb-2">{subject}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};
