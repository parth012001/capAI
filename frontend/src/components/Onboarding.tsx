import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Sparkles, Mail, Brain, Zap, CheckCircle2 } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'active' | 'completed';
}

export default function Onboarding() {
  const { tokens } = useAuth();
  const [isComplete, setIsComplete] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'fetch_emails',
      title: 'Connecting to Gmail',
      description: 'Fetching your recent emails',
      icon: Mail,
      status: 'active'
    },
    {
      id: 'analyze_tone',
      title: 'Learning Your Style',
      description: 'Analyzing how you communicate',
      icon: Brain,
      status: 'pending'
    },
    {
      id: 'generate_drafts',
      title: 'Creating Drafts',
      description: 'Generating AI responses for your emails',
      icon: Zap,
      status: 'pending'
    },
    {
      id: 'complete',
      title: 'Ready to Go!',
      description: 'Captain AI is ready to assist',
      icon: CheckCircle2,
      status: 'pending'
    }
  ]);

  useEffect(() => {
    if (tokens?.jwt_token) {
      startOnboarding();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tokens]);

  const startOnboarding = async () => {
    try {
      await fetchEmailsStep();
      await analyzeToneStep();
      await completeStep();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Onboarding was cancelled');
        return;
      }
      console.error('Onboarding error:', error);
    }
  };

  const fetchEmailsStep = async (): Promise<void> => {
    updateStepStatus('fetch_emails', 'active');

    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      await api.get('/emails/fetch', { signal });

      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateStepStatus('fetch_emails', 'completed');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Email fetch error:', error);
      // Continue anyway
      updateStepStatus('fetch_emails', 'completed');
    }
  };

  const analyzeToneStep = async (): Promise<void> => {
    updateStepStatus('analyze_tone', 'active');

    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      await api.post('/ai/analyze-tone-real', {}, { signal });

      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateStepStatus('analyze_tone', 'completed');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Tone analysis error:', error);
      // Continue anyway
      updateStepStatus('analyze_tone', 'completed');
    }
  };

  const completeStep = async (): Promise<void> => {
    updateStepStatus('generate_drafts', 'active');

    // Simulate draft generation visualization
    await new Promise(resolve => setTimeout(resolve, 2000));

    updateStepStatus('generate_drafts', 'completed');

    updateStepStatus('complete', 'active');
    setIsComplete(true);

    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  const updateStepStatus = (stepId: string, status: OnboardingStep['status']) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status } : step
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Gradient Orbs - Matching Dashboard */}
      <motion.div
        className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, 20, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-l from-purple-400 via-pink-400 to-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <motion.div
          className="bg-white/90 backdrop-blur-xl border border-blue-200/50 rounded-3xl shadow-2xl max-w-2xl w-full p-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              className="w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-blue-200/50"
              animate={{
                rotate: isComplete ? 0 : [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: isComplete ? 0 : Infinity,
                ease: "easeInOut"
              }}
            >
              <img src="/Logo.png" alt="Captain AI" className="w-12 h-12 object-contain" />
            </motion.div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {isComplete ? 'All Set!' : 'Setting Up Captain AI'}
            </h1>
            <p className="text-slate-600">
              {isComplete
                ? 'Your AI assistant is ready to help you manage emails'
                : 'We\'re preparing your personalized AI assistant'}
            </p>
          </div>

          {/* Steps Progress */}
          <div className="space-y-4 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                  step.status === 'active'
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200'
                    : step.status === 'completed'
                    ? 'bg-green-50 border-2 border-green-200'
                    : 'bg-slate-50 border-2 border-slate-200'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    step.status === 'active'
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                      : step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {step.status === 'active' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <step.icon className="w-6 h-6" />
                    </motion.div>
                  ) : step.status === 'completed' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold mb-1 ${
                    step.status === 'active' ? 'text-blue-900' :
                    step.status === 'completed' ? 'text-green-900' :
                    'text-slate-500'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm ${
                    step.status === 'active' ? 'text-blue-700' :
                    step.status === 'completed' ? 'text-green-700' :
                    'text-slate-400'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {/* Loading Indicator */}
                {step.status === 'active' && (
                  <motion.div
                    className="flex-shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-blue-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-purple-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-pink-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Completion Message */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border-2 border-green-200 mb-4"
                >
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Redirecting to dashboard...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Footer */}
          {!isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-slate-200 text-center"
            >
              <p className="text-sm text-slate-500">
                This usually takes 30-60 seconds
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
