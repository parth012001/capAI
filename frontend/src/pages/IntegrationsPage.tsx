import React from 'react';
import { useComposioStatus, useConnectGmail, useConnectCalendar } from '../hooks/useComposio';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function IntegrationsPage() {
  const { data: status, isLoading: statusLoading } = useComposioStatus();
  const connectGmail = useConnectGmail();
  const connectCalendar = useConnectCalendar();

  const handleConnectGmail = () => {
    connectGmail.mutate();
  };

  const handleConnectCalendar = () => {
    connectCalendar.mutate();
  };

  const isGmailConnected = status?.authMethod === 'composio' && status?.connectedAccountId;
  const isCalendarConnected = false; // Will be implemented when backend tracks this separately

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Integrations
              </h1>
              <p className="text-slate-600 mt-1">
                Connect your Gmail and Calendar to get started
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Status Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Integration Status
              </h2>
              {statusLoading ? (
                <Badge variant="secondary">Loading...</Badge>
              ) : status?.hasComposioEntity ? (
                <Badge variant="success">Setup Complete</Badge>
              ) : (
                <Badge variant="secondary">Not Configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Entity ID</p>
                    <p className="text-sm text-slate-600">
                      {status?.entityId || 'Not created'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Auth Method</p>
                    <p className="text-sm text-slate-600">
                      {status?.authMethod === 'composio' ? 'Composio' : 'Google OAuth'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Migration Status</p>
                    <p className="text-sm text-slate-600 capitalize">
                      {status?.migrationStatus || 'pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Gmail Integration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">Gmail</h3>
                  <p className="text-sm text-slate-600">Connect your Gmail account</p>
                </div>
                {isGmailConnected && (
                  <Badge variant="success">Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">
                Allow Chief AI to read your emails and send responses on your behalf using Composio's secure OAuth.
              </p>

              {isGmailConnected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium text-emerald-900">Gmail Connected</p>
                        <p className="text-sm text-emerald-700 mt-1">
                          Your Gmail is connected via Composio. Chief AI can now process your emails.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleConnectGmail}
                    loading={connectGmail.isPending}
                  >
                    Reconnect Gmail
                  </Button>
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

          {/* Calendar Integration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">Calendar</h3>
                  <p className="text-sm text-slate-600">Connect your Google Calendar</p>
                </div>
                {isCalendarConnected && (
                  <Badge variant="success">Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">
                Enable smart meeting scheduling by connecting your Google Calendar. Chief AI will check availability and suggest meeting times.
              </p>

              {isCalendarConnected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium text-emerald-900">Calendar Connected</p>
                        <p className="text-sm text-emerald-700 mt-1">
                          Your calendar is connected via Composio. Chief AI can now manage your schedule.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleConnectCalendar}
                    loading={connectCalendar.isPending}
                  >
                    Reconnect Calendar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleConnectCalendar}
                  loading={connectCalendar.isPending}
                  disabled={statusLoading}
                >
                  {connectCalendar.isPending ? 'Connecting...' : 'Connect Calendar'}
                </Button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <strong>Permissions:</strong> Read events, create events, check availability
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Card className="mt-8">
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
                  Your connections are secured through Composio's OAuth implementation. Chief AI never stores your Google passwords.
                  You can revoke access at any time through your Google Account settings or by disconnecting here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
