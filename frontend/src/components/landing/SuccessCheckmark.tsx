import { motion } from 'framer-motion';
import type { AnimationCycle } from '../../config/animations';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface SuccessCheckmarkProps {
  cycle: AnimationCycle;
}

export const SuccessCheckmark = ({ cycle }: SuccessCheckmarkProps) => {
  return (
    <motion.div
      key={`success-${cycle}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5, delay: ANIMATION_TIMING.cards.successCheckmark[cycle] / 1000, type: "spring", stiffness: 200 }}
      className={`absolute left-1/2 -translate-x-1/2 ${CARD_POSITIONS.successCheckmark[cycle]} ${CARD_SIZES.successCheckmark}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl"
      >
        <motion.svg
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 4.7 }}
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
};
