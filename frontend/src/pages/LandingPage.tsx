import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Header } from '../components/landing/Header';
import { Footer } from '../components/landing/Footer';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { SecuritySection } from '../components/landing/SecuritySection';
import { FinalCTASection } from '../components/landing/FinalCTASection';
import { InboxCard } from '../components/landing/InboxCard';
import { AIProcessingCard } from '../components/landing/AIProcessingCard';
import { DraftCard } from '../components/landing/DraftCard';
import { CalendarCard } from '../components/landing/CalendarCard';
import { UserEditCard } from '../components/landing/UserEditCard';
import { AILearningCard } from '../components/landing/AILearningCard';
import { SuccessCheckmark } from '../components/landing/SuccessCheckmark';
import { getWorkflowContent } from '../config/landingContent';
import type { AnimationCycle } from '../config/animations';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [animationCycle, setAnimationCycle] = React.useState<AnimationCycle>('meeting');

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

  const handleGetStarted = () => {
    navigate('/signup');
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
      <Header isScrolled={isScrolled} onSignIn={handleSignIn} onNavigate={scrollToSection} />

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
              <InboxCard
                cycle={animationCycle}
                {...getWorkflowContent(animationCycle).inbox}
              />

              {/* AI Processing Card */}
              <AIProcessingCard cycle={animationCycle} />

              {/* Draft Card */}
              <DraftCard cycle={animationCycle} {...getWorkflowContent(animationCycle).draft} />

              {/* Calendar Card - Only for Meeting Cycle */}
              {animationCycle === 'meeting' && (
                <CalendarCard {...(getWorkflowContent(animationCycle) as any).calendar} />
              )}

              {/* User Edit Card - Only for Regular Cycle */}
              {animationCycle === 'regular' && (
                <UserEditCard {...(getWorkflowContent(animationCycle) as any).userEdit} />
              )}

              {/* AI Learning Card - Only for Regular Cycle */}
              {animationCycle === 'regular' && (
                <AILearningCard {...(getWorkflowContent(animationCycle) as any).aiLearning} />
              )}

              {/* Success Checkmark */}
              {animationCycle === 'meeting' && (
                <SuccessCheckmark cycle={animationCycle} />
              )}
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
      <HowItWorksSection />

      {/* Key Features Section */}
      <FeaturesSection />

      {/* Security Trust Section */}
      <SecuritySection />

      {/* Final CTA Section */}
      <FinalCTASection onGetStarted={handleGetStarted} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
