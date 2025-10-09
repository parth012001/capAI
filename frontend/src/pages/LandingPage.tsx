import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function LandingPage() {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [animationCycle, setAnimationCycle] = React.useState<'meeting' | 'regular'>('meeting');

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Alternate between meeting and regular email cycles every 15 seconds (12s animation + 3s gap)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationCycle((prev) => (prev === 'meeting' ? 'regular' : 'meeting'));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = async () => {
    try {
      const response = await fetch(`${apiUrl}/auth?mode=signup`);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating authentication:', error);
    }
  };

  const handleSignIn = () => {
    navigate('/signin');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 scroll-smooth">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-lg shadow-lg border-b border-slate-200/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img src="/Logo.png" alt="Captain AI" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Captain AI
            </span>
          </motion.div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              Security
            </button>
          </nav>

          <Button
            variant="outline"
            size="default"
            onClick={handleSignIn}
            className="border-2 border-blue-600/20 hover:border-blue-600 hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-200 px-6 py-2 flex items-center gap-2 group"
          >
            <span>Sign In</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
            {/* Left Side - Text Content */}
            <motion.div
              className="text-center"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
          {/* Badge */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-full mb-6 border border-blue-200/50 shadow-md"
          >
            <motion.span
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-xs font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent bg-[length:200%_auto]"
            >
              ✨ Your Email + Calendar AI Assistant
            </motion.span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-6 leading-[1.15]"
          >
            Turn Your To-Do List Into{' '}
            <motion.span
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: '200% auto' }}
            >
              Your Done List
            </motion.span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="text-base md:text-lg text-slate-600 mb-8 max-w-xl leading-relaxed mx-auto"
          >
            Captain AI writes emails in your voice and manages your calendar automatically. Schedule meetings, draft replies, and handle your inbox—all without lifting a finger.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center mb-8"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-8 py-4 h-auto shadow-xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] flex items-center gap-2.5 group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 rounded-xl"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="group-hover:translate-x-1 transition-transform">Get Started with Google</span>
              </Button>
            </motion.div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
              <span>Free to start</span>
              <span>•</span>
              <span>No credit card required</span>
            </p>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-700"
          >
            {[
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', text: '256-bit AES', color: 'text-green-600' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'OAuth 2.0', color: 'text-blue-600' },
              { icon: 'M5 13l4 4L19 7', text: 'No Passwords', color: 'text-purple-600' }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 bg-white/70 px-3 py-2 rounded-full shadow-md backdrop-blur-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <svg className={`w-4 h-4 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-semibold">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
            </motion.div>

            {/* Right Side - Floating Email Workflow Demo */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-[700px] hidden lg:block"
            >
              {/* Inbox Card - Email Arrives */}
              <motion.div
                key={animationCycle}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-16 left-0 w-72"
              >
                <motion.div
                  className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-200/50 p-6 relative overflow-visible"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Notification Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 500 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10"
                  >
                    1
                  </motion.div>

                  {/* Gradient border effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {animationCycle === 'meeting' ? 'Sarah Johnson' : 'Mike Chen'}
                        </p>
                        <p className="text-xs text-slate-500">2 min ago</p>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">
                      {animationCycle === 'meeting' ? 'Meeting Follow-up' : 'Project Update Question'}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {animationCycle === 'meeting'
                        ? 'Hi! Can we schedule a quick call to discuss the Q4 roadmap?'
                        : "Hey! What's the status on the API integration? Need this for the client demo."}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* AI Processing Card */}
              <motion.div
                key={`ai-processing-${animationCycle}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, delay: 2 }}
                className="absolute top-24 right-0 w-64"
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

              {/* Draft Card */}
              <motion.div
                key={`draft-${animationCycle}`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.6, delay: 3.5 }}
                className="absolute top-72 left-0 w-72"
              >
                <motion.div
                  className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200/50 p-6 relative overflow-hidden"
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
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
                        To: {animationCycle === 'meeting' ? 'Sarah Johnson' : 'Mike Chen'}
                      </p>
                      <p className="text-sm text-slate-600">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 3 }}
                        >
                          {animationCycle === 'meeting'
                            ? "Hi Sarah! Absolutely, I'd be happy to discuss the Q4 roadmap."
                            : "Hey Mike! The API integration is 80% complete. We're on track for the demo—I'll have it ready by Thursday EOD."}
                        </motion.span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Calendar Card - Only for Meeting Cycle */}
              {animationCycle === 'meeting' && (
                <motion.div
                  key="calendar"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5, delay: 5 }}
                  className="absolute top-72 right-0 w-64"
                >
                <motion.div
                  className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-orange-200/50 p-5 relative overflow-hidden"
                  animate={{
                    scale: [1, 1.02, 1],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
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
                      <p className="text-xs font-semibold text-slate-600 mb-1">Tomorrow, 2:00 PM</p>
                      <p className="text-sm font-bold text-slate-900">Q4 Roadmap Discussion</p>
                      <p className="text-xs text-slate-600 mt-1">30 min • Google Meet</p>
                    </div>
                  </div>
                </motion.div>
                </motion.div>
              )}

              {/* User Edit Card - Only for Regular Cycle */}
              {animationCycle === 'regular' && (
                <motion.div
                  key="user-edit"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5, delay: 5 }}
                  className="absolute top-72 right-0 w-64"
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
                            <p className="text-sm font-semibold text-slate-900">"...by Thursday EOD"</p>
                            <p className="text-xs text-amber-700 mt-1">→ Made tone more casual</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* AI Learning Card - Only for Regular Cycle */}
              {animationCycle === 'regular' && (
                <motion.div
                  key="ai-learning"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5, delay: 6.5 }}
                  className="absolute top-[500px] left-[56%] -translate-x-1/2 w-64"

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
                        <p className="text-white font-semibold text-sm">Captain AI Learning</p>
                        <p className="text-white/80 text-xs">Adapting to your style...</p>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <p className="text-xs text-white/90 font-medium">Analyzing your edit patterns</p>
                      </div>
                      <p className="text-xs text-white/70">
                        Next time: More casual tone for Mike ✓
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Success Checkmark */}
              <motion.div
                key={`success-${animationCycle}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, delay: animationCycle === 'meeting' ? 6.5 : 8, type: "spring", stiffness: 200 }}
                className={`absolute left-1/2 -translate-x-1/2 ${animationCycle === 'meeting' ? 'bottom-32' : 'bottom-8'}`}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl"
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
            </motion.div>
          </div>
        </div>

        {/* Enhanced gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-l from-purple-400 via-pink-400 to-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-300 to-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="min-h-screen flex items-center justify-center py-24 px-6 bg-white relative scroll-mt-20">
        {/* Top Wave Divider */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg className="relative block w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="rgb(239 246 255)"></path>
          </svg>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three simple steps to automate your email and calendar
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Connect Securely', desc: 'One-click Google sign-in. Captain analyzes your writing style from sent emails and syncs with your calendar.', gradient: 'from-blue-500 to-blue-600', delay: 0 },
              { num: '2', title: 'AI Does the Work', desc: 'Emails get auto-drafted in your voice. Meeting requests are detected, and calendar slots are found automatically.', gradient: 'from-purple-500 to-purple-600', delay: 0.2 },
              { num: '3', title: 'Review & Approve', desc: 'You stay in control. Review drafts, approve meetings, or edit before sending. Captain learns from every interaction.', gradient: 'from-pink-500 to-purple-600', delay: 0.4 }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: step.delay }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <Card className="text-center p-10 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 bg-white/90 backdrop-blur-sm h-full">
                  <motion.div
                    className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="text-4xl font-bold text-white">{step.num}</span>
                  </motion.div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="min-h-screen flex items-center justify-center py-24 px-6 bg-gradient-to-br from-blue-50 via-purple-50/30 to-white relative scroll-mt-20">
        {/* Decorative gradient orbs */}
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-r from-blue-300/30 to-purple-300/30 rounded-full filter blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Why Captain AI?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              An email + calendar assistant that actually sounds like you
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 mb-16">
            {[
              { icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', title: 'Writes Like You', desc: 'Analyzes 50+ of your sent emails to match your tone, style, and personality perfectly.', gradient: 'from-blue-500 to-blue-600', delay: 0 },
              { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Smart Calendar Management', desc: 'Detects meeting requests, checks your availability, handles timezones, and books meetings automatically.', gradient: 'from-purple-500 to-purple-600', delay: 0.15 },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Real-Time Drafts', desc: 'The moment an email arrives, your draft is ready. Context-aware, thread-smart, relationship-conscious.', gradient: 'from-pink-500 to-purple-600', delay: 0.3 }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="text-center group"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: feature.delay }}
              >
                <motion.div
                  className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </motion.div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', title: 'To-Do ➜ Done', desc: 'Converts meeting requests and action items from your inbox directly into calendar events and completed tasks.', gradient: 'from-blue-50 to-purple-50', border: 'border-blue-100', iconGradient: 'from-blue-500 to-blue-600' },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Timezone Intelligence', desc: 'Automatically handles timezone conversions and suggests optimal meeting times across global teams.', gradient: 'from-purple-50 to-pink-50', border: 'border-purple-100', iconGradient: 'from-purple-500 to-purple-600' },
              { icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', title: 'Thread Context', desc: 'Understands email threads, previous conversations, and relationships to craft perfect responses.', gradient: 'from-green-50 to-blue-50', border: 'border-green-100', iconGradient: 'from-green-500 to-green-600' },
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Availability Sync', desc: 'Real-time calendar sync ensures meeting proposals only suggest times when you\'re actually free.', gradient: 'from-orange-50 to-pink-50', border: 'border-orange-100', iconGradient: 'from-orange-500 to-orange-600' }
            ].map((item, index) => (
              <motion.div
                key={index}
                className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-8 border-2 ${item.border} shadow-lg`}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <div className="flex items-start gap-5">
                  <motion.div
                    className={`w-12 h-12 bg-gradient-to-br ${item.iconGradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </motion.div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h4>
                    <p className="text-slate-700 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Trust Section */}
      <section id="security" className="min-h-screen flex items-center justify-center py-24 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden scroll-mt-20">
        {/* Animated background */}
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-600/20 to-purple-600/20 rounded-full filter blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -50, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="max-w-6xl mx-auto relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Data, Your Control
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              We take security seriously. Your trust is our top priority.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: '256-bit AES Encryption', desc: 'Industry-standard encryption for all sensitive data in transit and at rest.', gradient: 'from-green-400 to-green-600', delay: 0 },
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'OAuth 2.0', desc: 'Google\'s secure authentication. We never see your password.', gradient: 'from-blue-400 to-blue-600', delay: 0.15 },
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'You Approve All Actions', desc: 'We draft replies and suggest meetings. You review and approve before anything is sent.', gradient: 'from-purple-400 to-purple-600', delay: 0.3 },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: 'Privacy Focused', desc: 'Your data is encrypted and secure. Revoke access anytime from settings.', gradient: 'from-orange-400 to-pink-600', delay: 0.45 }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 hover:border-white/40 hover:bg-white/15 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: item.delay }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <motion.div
                  className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-5 shadow-xl`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="min-h-screen flex items-center justify-center py-24 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-30"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            backgroundSize: '100% 100%'
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Ready to Turn Your To-Do<br />Into Done?
            </h2>
            <p className="text-2xl text-blue-100 mb-12 font-medium">
              Join Captain AI and automate your email and calendar in minutes.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="secondary"
                size="lg"
                onClick={handleGetStarted}
                className="text-xl px-12 py-8 h-auto bg-white text-blue-600 hover:bg-blue-50 shadow-2xl inline-flex items-center gap-4 group font-bold rounded-2xl"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="group-hover:translate-x-2 transition-transform">Get Started with Google</span>
              </Button>
            </motion.div>
            <p className="text-base text-blue-100 mt-8 flex items-center justify-center gap-6 flex-wrap font-medium">
              <span>✓ Free to get started</span>
              <span>•</span>
              <span>✓ No credit card required</span>
              <span>•</span>
              <span>✓ Cancel anytime</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <div className="mb-4 md:mb-0">
            © 2025 Captain AI. All rights reserved.
          </div>
          <div className="flex space-x-8">
            <motion.a
              href="/privacy"
              className="hover:text-white transition-colors"
              whileHover={{ scale: 1.1, color: '#ffffff' }}
            >
              Privacy
            </motion.a>
            <motion.a
              href="/terms"
              className="hover:text-white transition-colors"
              whileHover={{ scale: 1.1, color: '#ffffff' }}
            >
              Terms
            </motion.a>
          </div>
        </div>
      </footer>
    </div>
  );
}
