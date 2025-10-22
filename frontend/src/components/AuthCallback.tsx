import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';
import './AuthCallback.css';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your authentication...');
  const [errorType, setErrorType] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const success = urlParams.get('success');
        const tokensParam = urlParams.get('tokens');

        console.info('[Route] AuthCallback params', { error, success, hasTokens: !!tokensParam });

        if (error) {
          setStatus('error');
          setErrorType(error);

          if (error === 'no_code') {
            setMessage('No authorization code received from Google.');
          } else if (error === 'auth_failed') {
            setMessage('We couldn\'t complete your authentication. This might be a temporary issue.');
          } else if (error === 'user_not_found') {
            const email = urlParams.get('email');
            setMessage(`We couldn't find an account associated with ${email}.`);
          } else if (error === 'user_exists') {
            const email = urlParams.get('email');
            setMessage(`An account with ${email} already exists.`);
          } else {
            setMessage('Authentication was cancelled or encountered an error.');
          }
          return;
        }

        if (success === 'true' && tokensParam) {
          try {
            const decodedTokens = JSON.parse(atob(decodeURIComponent(tokensParam)));
            console.info('[Route] AuthCallback success');
            setMessage('Authentication successful! Setting up your account...');
            setStatus('success');
            (auth as any).handleAuthSuccess(decodedTokens);
            
            // Check if user needs onboarding (based on backend data)
            if (decodedTokens.needs_onboarding) {
              console.log('🆕 New user or incomplete onboarding - redirecting to profile setup');
              setTimeout(() => {
                window.location.href = '/profile-setup';
              }, 1500);
            } else {
              console.log('✅ Existing user with complete profile - redirecting to dashboard');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
            }
          } catch (tokenError) {
            console.error('Error parsing tokens:', tokenError);
            setStatus('error');
            setMessage('Error processing authentication tokens. Please try again.');
          }
        } else {
          setStatus('error');
          setMessage('Invalid authentication response. Please try again.');
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('error');
        setMessage('An error occurred during authentication. Please try again.');
      }
    };

    handleCallback();
  }, [auth]);

  const handleAction = () => {
    if (errorType === 'user_exists') {
      console.info('[Route] AuthCallback: redirecting to sign in');
      window.location.href = '/signin';
    } else if (errorType === 'user_not_found') {
      console.info('[Route] AuthCallback: redirecting to sign up');
      window.location.href = '/signup';
    } else {
      console.info('[Route] AuthCallback: retry -> /signin');
      window.location.href = '/signin';
    }
  };

  const getActionButtonText = () => {
    if (errorType === 'user_exists') return 'Go to Sign In';
    if (errorType === 'user_not_found') return 'Go to Sign Up';
    return 'Return to Sign In';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient orbs - matching SignIn page */}
      <motion.div
        className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main Card */}
      <motion.div
        className="relative z-10 bg-white/90 backdrop-blur-xl border border-blue-200/50 rounded-3xl shadow-2xl max-w-lg w-full p-10"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center">
          {status === 'processing' && (
            <>
              {/* Logo */}
              <motion.div
                className="w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-blue-200/50"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <img src="/Logo.png" alt="Captain AI" className="w-12 h-12 object-contain" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Setting up your account
                </h2>
                <p className="text-slate-600 mb-8">{message}</p>
                <motion.div
                  className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-green-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle className="w-12 h-12 text-green-600" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Welcome to Captain AI!
                </h2>
                <p className="text-slate-600">{message}</p>
              </motion.div>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-red-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <AlertCircle className="w-12 h-12 text-red-600" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  {errorType === 'user_exists' ? 'Account Already Exists' :
                   errorType === 'user_not_found' ? 'Account Not Found' :
                   'Authentication Error'}
                </h2>
                <p className="text-slate-600 leading-relaxed">{message}</p>
              </motion.div>

              {/* Informational box for specific errors */}
              {(errorType === 'user_exists' || errorType === 'user_not_found') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100 text-left"
                >
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    {errorType === 'user_exists' ? 'What to do next:' : 'Need help?'}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {errorType === 'user_exists'
                      ? 'You already have a Captain AI account with this email address. Click the button below to sign in to your existing account.'
                      : 'This email address hasn\'t been registered yet. Click the button below to create a new Captain AI account.'}
                  </p>
                </motion.div>
              )}

              <motion.button
                onClick={handleAction}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-5 px-6 rounded-xl transition-all duration-300 shadow-xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] flex items-center justify-center gap-3 group hover:from-blue-700 hover:to-purple-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="group-hover:translate-x-1 transition-transform">
                  {getActionButtonText()}
                </span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}