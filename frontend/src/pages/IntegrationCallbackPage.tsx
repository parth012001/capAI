import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function IntegrationCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  const connectionId = searchParams.get('connection');
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');

  const isSuccess = status === 'active';
  const isError = !!reason;

  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (isSuccess && countdown === 0) {
      navigate('/integrations');
    }
  }, [isSuccess, countdown, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center px-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="text-center">
            {isSuccess && (
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {isError && (
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-900">
              {isSuccess && 'Connection Successful!'}
              {isError && 'Connection Failed'}
            </h1>
          </div>
        </CardHeader>

        <CardContent>
          {isSuccess && (
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                Your integration has been connected successfully.
              </p>

              {connectionId && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Connection ID</p>
                  <p className="text-sm font-mono text-slate-700">{connectionId}</p>
                </div>
              )}

              <div className="pt-4">
                <p className="text-sm text-slate-500">
                  Redirecting in {countdown} seconds...
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/integrations')}
              >
                Go to Integrations
              </Button>
            </div>
          )}

          {isError && (
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                We couldn't complete your integration connection.
              </p>

              {reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-900">
                    <strong>Reason:</strong> {reason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/integrations')}
                >
                  Try Again
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  If this problem persists, please contact support at support@getcaptainapp.com
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
