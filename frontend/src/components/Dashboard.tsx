// React import not needed for modern JSX transform
import { useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar } from './layout/StatusBar';
import { EmailPanel } from './email/EmailPanel';
import { DraftPanel } from './draft/DraftPanel';
import { PromotionalEmailsPanel } from './email/PromotionalEmailsPanel';
import { LearningPanel } from './learning/LearningPanel';
import { CalendarPanel } from './calendar/CalendarPanel';
import { DashboardTabs } from './navigation/DashboardTabs';
import { Toast } from './ui/Toast';
import { ProfileButton } from './ui/ProfileButton';
// import { MeetingPopupManager } from './meeting'; // Disabled - using enhanced draft panel instead
import { useToast } from '../hooks/useToast';
import { useUnreadPromotionalEmailCount } from '../hooks/usePromotionalEmails';
import { usePendingDraftCount } from '../hooks/useDrafts';
import type { DashboardTab } from '../types/promotionalEmail';

export default function Dashboard() {
  const { toasts } = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>('active');
  const { unreadCount } = useUnreadPromotionalEmailCount();
  const { pendingCount } = usePendingDraftCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Gradient Orbs - Performance Optimized */}
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
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-300 to-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 90, 180]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{ willChange: 'transform' }}
      />

      {/* Status Bar */}
      <div className="relative z-10">
        <StatusBar />
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Chief AI Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Monitor your automated email assistant and manage AI-generated responses
            </p>
          </div>
          <ProfileButton />
        </div>
        
        {/* Tab Navigation */}
        <DashboardTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadPromotionalCount={unreadCount}
          pendingDraftCount={pendingCount}
        />
        
        {/* Content based on active tab */}
        {activeTab === 'active' ? (
          /* Two-Panel Layout for Active Emails */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-16rem)]">
            {/* Left Panel - Latest Email */}
            <div className="flex flex-col h-full">
              <EmailPanel />
            </div>

            {/* Right Panel - AI Draft */}
            <div className="flex flex-col h-full">
              <DraftPanel />
            </div>
          </div>
        ) : activeTab === 'promotional' ? (
          /* Single Panel Layout for Promotional Emails */
          <div className="h-[calc(100vh-16rem)]">
            <PromotionalEmailsPanel />
          </div>
        ) : activeTab === 'learning' ? (
          /* Single Panel Layout for AI Learning */
          <div className="h-[calc(100vh-16rem)] overflow-y-auto">
            <LearningPanel />
          </div>
        ) : (
          /* Single Panel Layout for Calendar */
          <div className="h-[calc(100vh-16rem)]">
            <CalendarPanel />
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      {/* Meeting Response Popups - Disabled: Using enhanced draft panel instead */}
      {/* <MeetingPopupManager /> */}
    </div>
  );
}