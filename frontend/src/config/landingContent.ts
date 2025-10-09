// Content configuration for landing page
import type { AnimationCycle } from './animations';

export const landingContent = {
  hero: {
    badge: '✨ Your Email + Calendar AI Assistant',
    headline: {
      part1: 'Turn Your To-Do List Into',
      part2: 'Your Done List',
    },
    subheadline:
      'Captain AI writes emails in your voice and manages your calendar automatically. Schedule meetings, draft replies, and handle your inbox—all without lifting a finger.',
    cta: {
      primary: 'Get Started with Google',
      secondary: 'Free to start • No credit card required',
    },
    trustSignals: [
      { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', text: '256-bit AES', color: 'text-green-600' },
      { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'OAuth 2.0', color: 'text-blue-600' },
      { icon: 'M5 13l4 4L19 7', text: 'No Passwords', color: 'text-purple-600' },
    ],
  },

  emailWorkflows: {
    meeting: {
      inbox: {
        sender: 'Sarah Johnson',
        subject: 'Meeting Follow-up',
        message: 'Hi! Can we schedule a quick call to discuss the Q4 roadmap?',
        timestamp: '2 min ago',
      },
      draft: {
        recipient: 'Sarah Johnson',
        message: "Hi Sarah! Absolutely, I'd be happy to discuss the Q4 roadmap.",
      },
      calendar: {
        title: 'Q4 Roadmap Discussion',
        time: 'Tomorrow, 2:00 PM',
        duration: '30 min • Google Meet',
      },
    },
    regular: {
      inbox: {
        sender: 'Mike Chen',
        subject: 'Project Update Question',
        message: "Hey! What's the status on the API integration? Need this for the client demo.",
        timestamp: '2 min ago',
      },
      draft: {
        recipient: 'Mike Chen',
        message: "Hey Mike! The API integration is 80% complete. We're on track for the demo—I'll have it ready by Thursday EOD.",
      },
      userEdit: {
        changed: '"...by Thursday EOD"',
        editType: '→ Made tone more casual',
      },
      aiLearning: {
        title: 'Captain AI Learning',
        subtitle: 'Adapting to your style...',
        analyzing: 'Analyzing your edit patterns',
        learned: 'Next time: More casual tone for Mike ✓',
      },
    },
  },
};

// Helper function to get content based on cycle
export const getWorkflowContent = (cycle: AnimationCycle) => {
  return landingContent.emailWorkflows[cycle];
};
