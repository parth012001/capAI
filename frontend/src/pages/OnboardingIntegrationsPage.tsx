import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComposioStatus, useConnectGmail, useConnectCalendar } from '../hooks/useComposio';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Calendar, AlertCircle } from 'lucide-react';

/**
 * OnboardingIntegrationsPage - Mandatory integration step for new users
 *
 * This page is inserted into the onboarding flow after Google OAuth but before
 * profile setup. It requires users to connect both Gmail and Calendar via Composio
 * before they can proceed.
 *
 * Flow: Google OAuth → /onboarding/integrations (this page) → /profile-setup → /dashboard
 */
export default function OnboardingIntegrationsPage() {
  const navigate = useNavigate();
  const { data: status, isLoading: statusLoading } = useComposioStatus();
  const connectGmail = useConnectGmail();
  const connectCalendar = useConnectCalendar();

  // Check if both integrations are connected
  const isGmailConnected = status?.authMethod === 'composio' && status?.connectedAccountId;
  const isCalendarConnected = false; // TODO: Backend doesn't track calendar separately yet

  // For now, we only require Gmail to be connected (Calendar integration coming in future phase)
  const canProceed = isGmailConnected;

  // Auto-redirect if user somehow already has connections (shouldn't happen in normal flow)
  useEffect(() => {
    if (canProceed && !statusLoading) {
      console.log('✅ Integrations already connected - allowing proceed');
    }
  }, [canProceed, statusLoading]);

  const handleConnectGmail = () => {
    console.log('🔗 Initiating Gmail connection via Composio');
    connectGmail.mutate();
  };

  const handleConnectCalendar = () => {
    console.log('🔗 Initiating Calendar connection via Composio');
    connectCalendar.mutate();
  };

  const handleContinue = () => {
    if (!canProceed) {
      alert('Please connect Gmail before continuing');
      return;
    }
    console.log('✅ Proceeding to profile setup');
    navigate('/profile-setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient orbs */}
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

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-blue-200/50">
            <img src="/Logo.png" alt="Captain AI" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Connect Your Integrations
          </h1>
          <p className="text-slate-600 text-lg">
            Connect Gmail and Calendar to let Captain AI manage your inbox and schedule
          </p>
        </motion.div>

        {/* Integration Cards */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Gmail Card */}
          <Card className="relative overflow-hidden">
            {isGmailConnected && (
              <div className="absolute top-4 right-4 z-10">
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">Gmail</h3>
                  <p className="text-sm text-slate-600">Required for email management</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">
                Connect your Gmail to let Captain AI read incoming emails and send AI-generated responses.
              </p>

              {isGmailConnected ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-emerald-900">Gmail Connected</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Your Gmail is connected and ready to use.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleConnectGmail}
                  loading={connectGmail.isPending}
                  disabled={statusLoading}
                >
                  {connectGmail.isPending ? 'Connecting...' : 'Connect Gmail'}
                </Button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <strong>Permissions:</strong> Read emails, send emails, manage labels
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Card */}
          <Card className="relative overflow-hidden opacity-60">
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">Calendar</h3>
                  <p className="text-sm text-slate-600">Optional for scheduling</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">
                Connect your Google Calendar to enable smart meeting scheduling and availability checks.
              </p>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleConnectCalendar}
                loading={connectCalendar.isPending}
                disabled={true}
              >
                Connect Calendar (Coming Soon)
              </Button>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <strong>Permissions:</strong> Read events, create events, check availability
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Secure OAuth with Composio
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your connections are secured through Composio's OAuth implementation. Captain AI never stores your Google passwords.
                    You can revoke access at any time through your Google Account settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="flex items-center gap-4">
            {!canProceed && (
              <div className="flex items-center gap-2 text-orange-600 text-sm flex-1">
                <AlertCircle className="w-4 h-4" />
                <span>Please connect Gmail to continue</span>
              </div>
            )}
            <Button
              variant="primary"
              onClick={handleContinue}
              disabled={!canProceed || statusLoading}
              className="px-8"
            >
              {canProceed ? 'Continue to Profile Setup' : 'Waiting for Gmail...'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
