import { motion } from 'framer-motion';
import { ANIMATION_TIMING, CARD_POSITIONS, CARD_SIZES } from '../../config/animations';

interface CalendarCardProps {
  title: string;
  time: string;
  duration: string;
}

export const CalendarCard = ({ title, time, duration }: CalendarCardProps) => {
  return (
    <motion.div
      key="calendar"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: ANIMATION_TIMING.cards.calendarOrEdit.duration / 1000, delay: ANIMATION_TIMING.cards.calendarOrEdit.delay / 1000 }}
      className={`absolute ${CARD_POSITIONS.calendarOrEdit} right-0 ${CARD_SIZES.calendar}`}
    >
      <motion.div
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-orange-200/50 p-5 relative overflow-hidden"
        animate={{
          scale: ANIMATION_TIMING.floating.calendar.scale,
        }}
        transition={{ duration: ANIMATION_TIMING.floating.calendar.duration / 1000, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-pink-400/10 rounded-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Auto-scheduled</span>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">{time}</p>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-xs text-slate-600 mt-1">{duration}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
