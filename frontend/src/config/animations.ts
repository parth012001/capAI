// Animation configuration for landing page
export type AnimationCycle = 'meeting' | 'regular';

// Animation timing constants (in milliseconds)
export const ANIMATION_TIMING = {
  // Cycle duration: 15 seconds (12s animation + 3s gap)
  cycleDuration: 15000,

  // Card entrance delays
  cards: {
    inbox: {
      delay: 0,
      duration: 600,
    },
    notificationBadge: {
      delay: 800,
      duration: 500,
    },
    aiProcessing: {
      delay: 2000,
      duration: 500,
    },
    draft: {
      delay: 3500,
      duration: 600,
    },
    calendarOrEdit: {
      delay: 5000,
      duration: 500,
    },
    aiLearning: {
      delay: 6500,
      duration: 500,
    },
    successCheckmark: {
      meeting: 6500,
      regular: 8000,
    },
  },

  // Floating animations
  floating: {
    inbox: {
      duration: 4000,
      yOffset: [-10, 0],
    },
    draft: {
      duration: 5000,
      yOffset: [-8, 0],
    },
    calendar: {
      duration: 4000,
      scale: [1, 1.02, 1],
    },
  },
};

// Card position constants
export const CARD_POSITIONS = {
  // Both cycles use same base positions
  inbox: 'top-16',
  aiProcessing: 'top-24',
  draft: 'top-72',
  calendarOrEdit: 'top-72',

  // Regular cycle specific
  aiLearning: 'top-[500px]',

  // Checkmark positions
  successCheckmark: {
    meeting: 'bottom-32',
    regular: 'bottom-8',
  },
};

// Card size constants
export const CARD_SIZES = {
  inbox: 'w-72',
  aiProcessing: 'w-64',
  draft: 'w-72',
  calendar: 'w-64',
  userEdit: 'w-64',
  aiLearning: 'w-64',
  successCheckmark: 'w-16 h-16',
};

// Animation variants for Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
