import { motion } from 'framer-motion';
import type { AnimationCycle } from '../../config/animations';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface AIProcessingCardProps {
  cycle: AnimationCycle;
}

export const AIProcessingCard = ({ cycle }: AIProcessingCardProps) => {
  return (
    <motion.div
      key={`ai-processing-${cycle}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.aiProcessing.duration / 1000, delay: ANIMATION_TIMING.cards.aiProcessing.delay / 1000 }}
      className={`absolute ${CARD_POSITIONS.aiProcessing} right-0 ${CARD_SIZES.aiProcessing}`}
    >
      <motion.div
        className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        animate={{
          boxShadow: [
            "0 20px 60px rgba(168, 85, 247, 0.4)",
            "0 20px 60px rgba(236, 72, 153, 0.4)",
            "0 20px 60px rgba(168, 85, 247, 0.4)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
          />
          <p className="text-white font-semibold">Captain AI analyzing...</p>
        </div>
        <div className="space-y-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 1.8 }}
            className="h-2 bg-white/30 rounded-full overflow-hidden"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="h-full w-1/3 bg-white rounded-full"
            />
          </motion.div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-white rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
