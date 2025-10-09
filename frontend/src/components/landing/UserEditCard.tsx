import { motion } from 'framer-motion';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface UserEditCardProps {
  changed: string;
  editType: string;
}

export const UserEditCard = ({ changed, editType }: UserEditCardProps) => {
  return (
    <motion.div
      key="user-edit"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.calendarOrEdit.duration / 1000, delay: ANIMATION_TIMING.cards.calendarOrEdit.delay / 1000 }}
      className={`absolute ${CARD_POSITIONS.calendarOrEdit} right-0 ${CARD_SIZES.userEdit}`}
    >
      <motion.div
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/50 p-5 relative overflow-hidden"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">You're editing</span>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1 h-full bg-amber-500 rounded-full"
              />
              <div className="flex-1">
                <p className="text-xs text-slate-600 mb-1">Changed:</p>
                <p className="text-sm font-semibold text-slate-900">{changed}</p>
                <p className="text-xs text-amber-700 mt-1">{editType}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
