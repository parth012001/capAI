import { motion } from 'framer-motion';
import type { AnimationCycle } from '../../config/animations';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface DraftCardProps {
  cycle: AnimationCycle;
  recipient: string;
  message: string;
}

export const DraftCard = ({ cycle, recipient, message }: DraftCardProps) => {
  return (
    <motion.div
      key={`draft-${cycle}`}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.draft.duration / 1000, delay: ANIMATION_TIMING.cards.draft.delay / 1000 }}
      className={`absolute ${CARD_POSITIONS.draft} left-0 ${CARD_SIZES.draft}`}
    >
      <motion.div
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200/50 p-6 relative overflow-hidden"
        animate={{
          y: ANIMATION_TIMING.floating.draft.yOffset,
        }}
        transition={{ duration: ANIMATION_TIMING.floating.draft.duration / 1000, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-blue-400/10 to-purple-400/10 rounded-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="font-semibold text-slate-900">Draft Ready</span>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 2.8, type: "spring", stiffness: 500 }}
              className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full"
            >
              In your voice
            </motion.div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-700 font-medium">
              To: {recipient}
            </p>
            <p className="text-sm text-slate-600">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                {message}
              </motion.span>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
