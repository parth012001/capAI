import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Badge, Spinner, Button } from '../ui';
import { formatDate, truncateText } from '../../lib/utils';
import { useLatestDraft, useSendDraft, useDeleteDraft, useUpdateDraft } from '../../hooks/useDrafts';
import { useToast } from '../../hooks/useToast';
import { useTopLearningInsight, useCurrentSuccessRate } from '../../hooks/useLearning';
import { FileText, Send, Edit3, Trash2, Clock, Target, Volume2, Save, X, Brain, TrendingUp, Calendar, Users, AlertTriangle, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

// Force hot reload - Enhanced DraftPanel with Meeting UI
console.log('🔄 [HOT RELOAD] Enhanced DraftPanel loaded with meeting UI');

export function DraftPanel() {
  const { data, isLoading, error, refetch } = useLatestDraft();
  const { mutate: sendDraft, isPending: isSending } = useSendDraft();
  const { mutate: deleteDraft, isPending: isDeleting } = useDeleteDraft();
  const { mutate: updateDraft, isPending: isUpdating } = useUpdateDraft();
  const { success, error: showError } = useToast();
  const { insight: topInsight, hasHighConfidenceInsight } = useTopLearningInsight();
  const { successRate, trend } = useCurrentSuccessRate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const latestDraft = data?.drafts?.[0];

  // Meeting detection and context - Enhanced detection logic
  const meetingContext = latestDraft?.contextUsed;
  const actionTaken = meetingContext?.actionTaken;
  const meetingRequest = meetingContext?.meetingRequest;
  const originalEmail = meetingContext?.originalEmail;

  // Multiple ways to detect meeting responses for better reliability
  const isMeetingResponse =
    latestDraft?.relationshipType === 'meeting_response' ||  // Primary detection
    meetingContext?.source === 'meeting_pipeline' ||        // Pipeline source detection
    meetingContext?.meetingRequest ||                       // Has meeting request data
    actionTaken ||                                          // Has meeting action
    (meetingContext && Object.keys(meetingContext).some(key =>
      key.includes('meeting') || key.includes('Meeting')    // Any meeting-related keys
    ));

  // Meeting status derived from context
  const getMeetingStatus = () => {
    if (!isMeetingResponse) return null;

    // If no actionTaken, return generic meeting response badge
    if (!actionTaken) {
      return { type: 'unknown', label: 'MEETING RESPONSE', color: 'blue' };
    }

    switch (actionTaken) {
      case 'accepted': return { type: 'accept', label: 'MEETING ACCEPTED', color: 'green' };
      case 'suggested_scheduling_link_conflict': return { type: 'conflict', label: 'TIME CONFLICT', color: 'red' };
      case 'suggested_scheduling_link_vague': return { type: 'unclear', label: 'TIME UNCLEAR', color: 'yellow' };
      case 'suggested_alternatives': return { type: 'alternatives', label: 'ALTERNATIVE TIMES', color: 'blue' };
      case 'requested_more_info': return { type: 'info', label: 'MORE INFO NEEDED', color: 'purple' };
      default: return { type: 'unknown', label: 'MEETING RESPONSE', color: 'blue' };
    }
  };

  const meetingStatus = getMeetingStatus();

  // Debug logging for meeting detection
  if (latestDraft && process.env.NODE_ENV === 'development') {
    console.log('🔍 [MEETING DEBUG] Draft data:', {
      draftId: latestDraft.id,
      relationshipType: latestDraft.relationshipType,
      contextUsed: latestDraft.contextUsed,
      isMeetingResponse,
      actionTaken,
      meetingStatus: meetingStatus?.label,
    });
  }

  // Format meeting time
  const formatMeetingTime = (dateStr: string) => {
    if (!dateStr) return 'Time not specified';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Initialize edit fields when draft changes or editing starts
  const initializeEditFields = () => {
    if (latestDraft) {
      setEditedSubject(latestDraft.subject || '');
      setEditedBody(latestDraft.body || '');
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = isEditing && latestDraft && (
    editedSubject !== latestDraft.subject ||
    editedBody !== latestDraft.body
  );

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSendApprove = () => {
    if (!latestDraft) return;

    const successMessage = isMeetingResponse && actionTaken === 'accepted'
      ? 'Meeting response sent and calendar event created!'
      : 'Email has been sent successfully';

    sendDraft(latestDraft.id, {
      onSuccess: () => {
        success('Draft Sent', successMessage);
        refetch();
      },
      onError: () => {
        showError('Failed to Send', 'Could not send the draft');
      },
    });
  };

  const handleDecline = () => {
    if (!latestDraft) return;

    // TODO: Implement decline functionality in Phase 3
    showError('Feature Coming Soon', 'Decline response generation will be available in the next update');
  };

  const handleDelete = () => {
    if (!latestDraft) return;
    
    deleteDraft(latestDraft.id, {
      onSuccess: () => {
        success('Draft Deleted', 'Draft has been removed');
        refetch();
      },
      onError: () => {
        showError('Failed to Delete', 'Could not delete the draft');
      },
    });
  };


  const handleEdit = () => {
    if (!latestDraft) return;
    initializeEditFields();
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!latestDraft) return;
    
    // Validate inputs
    if (!editedSubject.trim()) {
      showError('Validation Error', 'Subject cannot be empty');
      return;
    }
    
    if (!editedBody.trim()) {
      showError('Validation Error', 'Email body cannot be empty');
      return;
    }

    updateDraft({
      id: latestDraft.id,
      data: {
        subject: editedSubject.trim(),
        body: editedBody.trim()
      }
    }, {
      onSuccess: () => {
        success('Draft Updated', 'Your changes have been saved successfully');
        setIsEditing(false);
        refetch();
      },
      onError: (error: any) => {
        showError('Update Failed', error?.message || 'Could not save your changes');
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    initializeEditFields();
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-900">AI Draft</h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <Spinner size="lg" />
            <p className="text-slate-500">Loading latest draft...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-slate-900">AI Draft</h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Failed to load drafts
            </h3>
            <p className="text-slate-500 mb-4">
              Could not connect to draft service
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestDraft) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900">AI Draft</h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-slate-300 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No drafts available
            </h3>
            <p className="text-slate-500 mb-4">
              AI drafts will appear here when emails are processed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          {isMeetingResponse ? (
            <Calendar className="h-5 w-5 text-blue-600" />
          ) : (
            <FileText className="h-5 w-5 text-emerald-600" />
          )}
          <h2 className="text-xl font-semibold text-slate-900">
            {isMeetingResponse ? 'Meeting Response' : 'AI Draft'}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {/* Meeting Status Badge */}
          {isMeetingResponse && meetingStatus && (
            <Badge
              variant={
                meetingStatus.color === 'green' ? 'success' :
                meetingStatus.color === 'red' ? 'destructive' :
                meetingStatus.color === 'yellow' ? 'warning' :
                'secondary'
              }
              className={`
                ${meetingStatus.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                ${meetingStatus.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                ${meetingStatus.color === 'gray' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
              `}
            >
              {meetingStatus.color === 'green' && <CheckCircle className="h-3 w-3 mr-1" />}
              {meetingStatus.color === 'red' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {meetingStatus.color === 'yellow' && <Clock className="h-3 w-3 mr-1" />}
              {meetingStatus.color === 'blue' && <Calendar className="h-3 w-3 mr-1" />}
              {meetingStatus.color === 'purple' && <MessageCircle className="h-3 w-3 mr-1" />}
              {meetingStatus.label}
            </Badge>
          )}

          {hasHighConfidenceInsight && !isEditing && (
            <Badge variant="success" className="bg-purple-100 text-purple-800 border-purple-200">
              <Brain className="h-3 w-3 mr-1" />
              {topInsight?.confidence}% confident
            </Badge>
          )}
          {isEditing ? (
            <Badge variant="info" className="bg-blue-100 text-blue-800 border-blue-200">
              Editing
            </Badge>
          ) : (
            <Badge variant={latestDraft.status === 'pending' ? 'warning' : 'success'}>
              {latestDraft.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Meeting Context Info */}
        {isMeetingResponse && meetingRequest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2 text-blue-800">
              <Calendar className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Meeting Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Original Request</span>
                <p className="text-sm text-blue-900 mt-1">
                  {originalEmail?.subject || meetingRequest.subject || 'Meeting request'}
                </p>
              </div>
              {meetingRequest.preferredDates?.[0] && (
                <div>
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Proposed Time</span>
                  <p className="text-sm text-blue-900 mt-1">
                    {formatMeetingTime(meetingRequest.preferredDates[0])}
                  </p>
                </div>
              )}
              {originalEmail?.from && (
                <div>
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Meeting With</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-900">{originalEmail.from}</span>
                  </div>
                </div>
              )}
              {meetingRequest.duration && (
                <div>
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Duration</span>
                  <p className="text-sm text-blue-900 mt-1">
                    {meetingRequest.duration} minutes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Draft Metadata */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center space-x-2 text-sm">
            <Volume2 className="h-4 w-4 text-blue-500" />
            <span className="text-slate-600">Tone:</span>
            <Badge variant="outline" className="text-xs">
              {latestDraft.tone || 'Professional'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Target className="h-4 w-4 text-amber-500" />
            <span className="text-slate-600">Urgency:</span>
            <Badge variant="outline" className="text-xs">
              {latestDraft.urgencyLevel || 'Medium'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">Generated:</span>
            <span className="text-xs text-slate-500">
              {formatDate(latestDraft.createdAt)}
            </span>
          </div>
        </div>

        {/* Draft Content */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Subject
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter email subject..."
                  disabled={isUpdating}
                />
              ) : (
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {latestDraft.subject}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Email Body
              </label>
              {isEditing ? (
                <div className="mt-1">
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical"
                    placeholder="Enter email body..."
                    rows={8}
                    disabled={isUpdating}
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                    <span>{editedBody.length} characters</span>
                    <span>Use Shift+Enter for line breaks</span>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {isExpanded 
                      ? latestDraft.body 
                      : truncateText(latestDraft.body, 300)
                    }
                  </p>
                  {latestDraft.body && latestDraft.body.length > 300 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-blue-600 text-xs mt-2 hover:underline"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {isEditing ? (
            // Edit Mode Buttons
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSave}
                disabled={isUpdating || !editedSubject.trim() || !editedBody.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
              >
                {isUpdating ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isUpdating}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 font-medium transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              {/* Send Edited Version */}
              <Button
                onClick={() => {
                  if (!latestDraft) return;

                  // Validate inputs
                  if (!editedSubject.trim() || !editedBody.trim()) {
                    showError('Validation Error', 'Subject and body cannot be empty');
                    return;
                  }

                  // Save and then send
                  updateDraft({
                    id: latestDraft.id,
                    data: {
                      subject: editedSubject.trim(),
                      body: editedBody.trim()
                    }
                  }, {
                    onSuccess: () => {
                      success('Draft Updated', 'Changes saved successfully');
                      setIsEditing(false);
                      refetch();
                      // After successful save, send the draft
                      const successMessage = isMeetingResponse && actionTaken === 'accepted'
                        ? 'Meeting response sent and calendar event created!'
                        : 'Your edited draft has been sent successfully';

                      sendDraft(latestDraft.id, {
                        onSuccess: () => {
                          success('Email Sent', successMessage);
                        },
                        onError: () => {
                          showError('Send Failed', 'Could not send the edited draft');
                        },
                      });
                    },
                    onError: (error: any) => {
                      showError('Update Failed', error?.message || 'Could not save your changes');
                    },
                  });
                }}
                disabled={isUpdating || isSending || !editedSubject.trim() || !editedBody.trim()}
                variant="outline"
                className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-600 font-medium shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2"
                title={
                  isMeetingResponse && actionTaken === 'accepted'
                    ? 'Save changes and send meeting acceptance with calendar booking'
                    : 'Save changes and send the draft'
                }
              >
                {isUpdating || isSending ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isMeetingResponse && actionTaken === 'accepted' && <Calendar className="h-4 w-4 mr-1" />}
                  </>
                )}
                {isMeetingResponse ? 'Save & Send Response' : 'Save & Send'}
              </Button>
            </div>
          ) : (
            // View Mode Buttons - Enhanced for Meeting Responses
            <div className="flex items-center space-x-3">
              {isMeetingResponse ? (
                // Meeting Response Buttons
                <>
                  <Button
                    onClick={handleSendApprove}
                    disabled={isSending || latestDraft.status !== 'pending'}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
                    title={
                      actionTaken === 'accepted'
                        ? 'Send acceptance email and create calendar event'
                        : 'Send meeting response email'
                    }
                  >
                    {isSending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <>
                        {actionTaken === 'accepted' ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                      </>
                    )}
                    {actionTaken === 'accepted' ? 'Approve Meeting' : 'Send Response'}
                  </Button>

                  <Button
                    onClick={handleDecline}
                    disabled={isSending || latestDraft.status !== 'pending'}
                    variant="outline"
                    className="border-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 font-medium shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2"
                    title="Generate and send a polite decline response (coming soon)"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline Meeting
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={isSending || isDeleting || isUpdating}
                    className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 font-medium transition-all duration-200"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Response
                  </Button>
                </>
              ) : (
                // Regular Draft Buttons
                <>
                  <Button
                    onClick={handleSendApprove}
                    disabled={isSending || latestDraft.status !== 'pending'}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
                  >
                    {isSending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Draft
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={isSending || isDeleting || isUpdating}
                    className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 font-medium transition-all duration-200"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Delete button (always visible) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || isSending || isUpdating}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
            title={isMeetingResponse ? 'Delete meeting response without sending' : 'Delete draft'}
          >
            {isDeleting ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Draft Stats */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span>ID: {latestDraft.id}</span>
            {latestDraft.originalEmailId && (
              <span>Reply to: #{latestDraft.originalEmailId}</span>
            )}
          </div>
          <span>Processing time: {latestDraft.processingTime || '0ms'}</span>
        </div>

        {/* Learning Stats Footer */}
        {successRate > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">Success Rate: {successRate.toFixed(1)}%</span>
              </div>
              {trend !== 'stable' && (
                <span className={`font-medium ${
                  trend === 'improving' ? 'text-green-600' : 'text-red-600'
                }`}>
                  ({trend})
                </span>
              )}
            </div>
            {topInsight && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Brain className="h-3 w-3" />
                <span className="font-medium">Learning: {topInsight.pattern} patterns</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}