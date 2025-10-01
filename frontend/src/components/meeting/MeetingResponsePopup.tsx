import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { MeetingDraft, MeetingContext } from '../../hooks/useMeetingPopups';

interface MeetingResponsePopupProps {
  draft: MeetingDraft;
  meetingContext: MeetingContext | null;
  isOpen: boolean;
  onApprove: (draftId: number) => void;
  onDecline: (draftId: number) => void;
  onIgnore: (draftId: number) => void;
  isLoading?: boolean;
}

export function MeetingResponsePopup({
  draft,
  meetingContext,
  isOpen,
  onApprove,
  onDecline,
  onIgnore,
  isLoading = false
}: MeetingResponsePopupProps) {
  const [action, setAction] = useState<'approve' | 'decline' | 'ignore' | null>(null);

  // Format the meeting type for display
  const getMeetingTypeDisplay = (type: MeetingContext['meetingType']) => {
    switch (type) {
      case 'accept': return '✅ Accept Meeting';
      case 'conflict_calendly': return '📅 Conflict - Calendly Link';
      case 'vague_calendly': return '⏰ Schedule via Calendly';
      case 'alternatives': return '🔄 Alternative Times';
      case 'more_info': return '❓ Request More Info';
      default: return '📧 Meeting Response';
    }
  };

  // Get appropriate emoji for action buttons
  const getActionEmoji = (type: MeetingContext['meetingType']) => {
    switch (type) {
      case 'accept': return '✅';
      case 'conflict_calendly':
      case 'vague_calendly': return '📅';
      case 'alternatives': return '🔄';
      case 'more_info': return '❓';
      default: return '📧';
    }
  };

  const handleAction = (actionType: 'approve' | 'decline' | 'ignore') => {
    if (isLoading) return;

    setAction(actionType);

    setTimeout(() => {
      switch (actionType) {
        case 'approve':
          onApprove(draft.id);
          break;
        case 'decline':
          onDecline(draft.id);
          break;
        case 'ignore':
          onIgnore(draft.id);
          break;
      }
      setAction(null);
    }, 100);
  };

  // Extract sender info
  const senderEmail = draft.originalEmail?.from || 'Unknown Sender';
  const senderName = senderEmail.split('@')[0].split('.').map(part =>
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');

  // Determine if this looks like a calendar booking
  const isCalendarResponse = meetingContext?.meetingType === 'accept';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => handleAction('ignore')}
      title="Meeting Response Ready"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Meeting Context Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">
                  {meetingContext ? getActionEmoji(meetingContext.meetingType) : '📧'}
                </span>
                <h3 className="font-medium text-gray-900">
                  {meetingContext ? getMeetingTypeDisplay(meetingContext.meetingType) : 'Meeting Response'}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <strong>From:</strong> {senderName} ({senderEmail})
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Subject:</strong> {draft.subject}
              </p>
              {meetingContext?.proposedTime && (
                <p className="text-sm text-gray-600">
                  <strong>Proposed Time:</strong> {new Date(meetingContext.proposedTime).toLocaleDateString()} at {new Date(meetingContext.proposedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Original Request */}
        {meetingContext?.originalRequest && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Original Request:</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 italic">"{meetingContext.originalRequest}"</p>
            </div>
          </div>
        )}

        {/* Generated Response Preview */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Response:</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {draft.body}
            </p>
          </div>
        </div>

        {/* Meeting Type Specific Info */}
        {meetingContext?.hasConflict && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-amber-600">⚠️</span>
              <p className="text-sm text-amber-800">
                You have a scheduling conflict at this time.
              </p>
            </div>
          </div>
        )}

        {meetingContext?.schedulingLink && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">📅</span>
              <p className="text-sm text-green-800">
                Response includes your Calendly scheduling link.
              </p>
            </div>
          </div>
        )}

        {isCalendarResponse && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">🗓️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Calendar Booking:</p>
                <p>Meeting will be added to your calendar when you approve this response.</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col space-y-3">
            {/* Primary Action - Approve */}
            <Button
              variant="success"
              size="lg"
              onClick={() => handleAction('approve')}
              disabled={isLoading}
              loading={action === 'approve'}
              className="w-full"
            >
              <span className="mr-2">
                {meetingContext ? getActionEmoji(meetingContext.meetingType) : '✅'}
              </span>
              {isCalendarResponse ? 'Book Meeting & Send Response' : 'Send Response'}
            </Button>

            {/* Secondary Actions */}
            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={() => handleAction('decline')}
                disabled={isLoading}
                loading={action === 'decline'}
                className="flex-1"
              >
                <span className="mr-2">✋</span>
                Decline Meeting
              </Button>

              <Button
                variant="ghost"
                onClick={() => handleAction('ignore')}
                disabled={isLoading}
                loading={action === 'ignore'}
                className="flex-1"
              >
                <span className="mr-2">👋</span>
                Ignore
              </Button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="space-y-1">
            <p><strong>Send Response:</strong> {isCalendarResponse ? 'Books the meeting to your calendar and sends the email.' : 'Sends the email response as written.'}</p>
            <p><strong>Decline:</strong> Generates a polite decline email instead.</p>
            <p><strong>Ignore:</strong> Takes no action - the draft will remain in your drafts.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}