import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface SchedulingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchedulingLinkModal({ isOpen, onClose }: SchedulingLinkModalProps) {
  const [schedulingLink, setSchedulingLink] = useState('');
  const [currentLink, setCurrentLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { tokens, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated && tokens) {
      loadCurrentLink();
    }
  }, [isOpen, isAuthenticated, tokens]);

  const loadCurrentLink = async () => {
    if (!tokens) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/user/scheduling-link', {
        headers: {
          'Authorization': `Bearer ${tokens.jwt_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const link = data.schedulingLink || '';
        setCurrentLink(link);
        setSchedulingLink(link);
      }
    } catch (error) {
      console.error('Error loading scheduling link:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!tokens) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/user/scheduling-link', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.jwt_token}`,
        },
        body: JSON.stringify({ schedulingLink: schedulingLink.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentLink(schedulingLink.trim());
        setMessage({ type: 'success', text: 'Scheduling link updated successfully!' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update scheduling link' });
      }
    } catch (error) {
      console.error('Error saving scheduling link:', error);
      setMessage({ type: 'error', text: `Network error: ${error instanceof Error ? error.message : 'Please try again.'}` });
    }

    setIsSaving(false);
  };

  const handleRemove = async () => {
    if (!tokens) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/user/scheduling-link', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.jwt_token}`,
        },
      });

      if (response.ok) {
        setCurrentLink('');
        setSchedulingLink('');
        setMessage({ type: 'success', text: 'Scheduling link removed successfully!' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to remove scheduling link' });
      }
    } catch (error) {
      console.error('Error removing scheduling link:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }

    setIsSaving(false);
  };

  const hasChanges = schedulingLink.trim() !== currentLink;
  const isValidUrl = schedulingLink.trim() === '' || isValidSchedulingUrl(schedulingLink.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheduling Link" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Set up your scheduling link (Calendly, Cal.com, etc.) to handle meeting requests
            when specific times aren't mentioned.
          </p>

          <label htmlFor="scheduling-link" className="block text-sm font-medium text-gray-700 mb-2">
            Scheduling Link
          </label>

          <input
            id="scheduling-link"
            type="url"
            value={schedulingLink}
            onChange={(e) => setSchedulingLink(e.target.value)}
            placeholder="https://calendly.com/yourname or https://cal.com/yourname"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              schedulingLink && !isValidUrl
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            disabled={isLoading || isSaving}
          />

          {schedulingLink && !isValidUrl && (
            <p className="mt-1 text-sm text-red-600">
              Please enter a valid URL from a supported scheduling platform
            </p>
          )}

          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Supported platforms: Calendly, Cal.com, Acuity Scheduling, Microsoft Bookings,
              TidyCal, YouCanBook.me, Koalendar, SimplyBook.me, Appointlet
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <div>
            {currentLink && (
              <Button
                onClick={handleRemove}
                disabled={isSaving || isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
              >
                {isSaving ? 'Removing...' : 'Remove Link'}
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              disabled={isSaving}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValidUrl || isSaving || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function isValidSchedulingUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const supportedPlatforms = [
      'calendly.com',
      'cal.com',
      'acuityscheduling.com',
      'bookings.microsoft.com',
      'tidycal.com',
      'youcanbook.me',
      'koalendar.com',
      'simplybook.me',
      'appt.link'
    ];

    return supportedPlatforms.some(platform =>
      urlObj.hostname.toLowerCase().includes(platform.toLowerCase())
    );
  } catch {
    return false;
  }
}