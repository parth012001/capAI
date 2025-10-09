import { motion } from 'framer-motion';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface AILearningCardProps {
  title: string;
  subtitle: string;
  analyzing: string;
  learned: string;
}

export const AILearningCard = ({ title, subtitle, analyzing, learned }: AILearningCardProps) => {
  return (
    <motion.div
      key="ai-learning"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.aiLearning.duration / 1000, delay: ANIMATION_TIMING.cards.aiLearning.delay / 1000 }}
      className={`absolute ${CARD_POSITIONS.aiLearning} left-[56%] -translate-x-1/2 ${CARD_SIZES.aiLearning}`}
    >
      <motion.div
        className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-2xl p-5 relative overflow-hidden"
        animate={{
          boxShadow: [
            "0 20px 60px rgba(99, 102, 241, 0.4)",
            "0 20px 60px rgba(168, 85, 247, 0.4)",
            "0 20px 60px rgba(99, 102, 241, 0.4)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </motion.div>
          <div>
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-white/80 text-xs">{subtitle}</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            <p className="text-xs text-white/90 font-medium">{analyzing}</p>
          </div>
          <p className="text-xs text-white/70">{learned}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};
