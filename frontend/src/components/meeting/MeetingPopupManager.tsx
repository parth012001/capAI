import { useCallback } from 'react';
import { MeetingResponsePopup } from './MeetingResponsePopup';
import { useMeetingPopups } from '../../hooks/useMeetingPopups';
import { useApproveDraft, useDeleteDraft } from '../../hooks/useDrafts';

/**
 * Meeting Popup Manager
 * Handles the automatic display and management of meeting response popups
 * Integrates with existing draft management system
 */
export function MeetingPopupManager() {
  const {
    nextPopupDraft,
    activePopupId,
    setActivePopup,
    markPopupShown,
    getMeetingContext
  } = useMeetingPopups();

  const approveDraft = useApproveDraft();
  const deleteDraft = useDeleteDraft();

  // Handle approve action (send response + book calendar if needed)
  const handleApprove = useCallback(async (draftId: number) => {
    try {
      console.log('🎯 [MEETING POPUP] Approving meeting response:', draftId);

      // Use existing approve draft mutation
      await approveDraft.mutateAsync(draftId);

      // Mark popup as handled
      markPopupShown(draftId);
      setActivePopup(null);

      console.log('✅ [MEETING POPUP] Meeting response approved and sent');
    } catch (error) {
      console.error('❌ [MEETING POPUP] Failed to approve meeting response:', error);
      // TODO: Show error toast/notification
    }
  }, [approveDraft, markPopupShown, setActivePopup]);

  // Handle decline action (will generate decline response in Phase 3)
  const handleDecline = useCallback(async (draftId: number) => {
    try {
      console.log('🎯 [MEETING POPUP] Declining meeting:', draftId);

      // For Phase 2, we'll just delete the draft
      // In Phase 3, we'll generate a decline response instead
      console.log('📝 [MEETING POPUP] Phase 2: Deleting draft (Phase 3 will generate decline response)');
      await deleteDraft.mutateAsync(draftId);

      // Mark popup as handled
      markPopupShown(draftId);
      setActivePopup(null);

      console.log('✅ [MEETING POPUP] Meeting declined (draft deleted)');
      // TODO: Show success message about decline (Phase 3 will show "Decline response sent")
    } catch (error) {
      console.error('❌ [MEETING POPUP] Failed to decline meeting:', error);
      // TODO: Show error toast/notification
    }
  }, [deleteDraft, markPopupShown, setActivePopup]);

  // Handle ignore action (just dismiss)
  const handleIgnore = useCallback((draftId: number) => {
    console.log('👋 [MEETING POPUP] Ignoring meeting popup:', draftId);

    // Mark popup as shown but don't change draft status
    markPopupShown(draftId);
    setActivePopup(null);

    console.log('✅ [MEETING POPUP] Meeting popup dismissed');
  }, [markPopupShown, setActivePopup]);

  // No popup to show
  if (!nextPopupDraft || activePopupId !== nextPopupDraft.id) {
    return null;
  }

  // Extract meeting context
  const meetingContext = getMeetingContext(nextPopupDraft);

  return (
    <MeetingResponsePopup
      draft={nextPopupDraft}
      meetingContext={meetingContext}
      isOpen={true}
      onApprove={handleApprove}
      onDecline={handleDecline}
      onIgnore={handleIgnore}
      isLoading={approveDraft.isPending || deleteDraft.isPending}
    />
  );
}

/**
 * Hook to get popup manager status (useful for debugging/monitoring)
 */
export function useMeetingPopupManagerStatus() {
  const {
    totalMeetingDrafts,
    pendingPopups,
    shownPopupsCount,
    activePopupId,
    isLoading
  } = useMeetingPopups();

  return {
    totalMeetingDrafts,
    pendingPopups,
    shownPopupsCount,
    hasActivePopup: activePopupId !== null,
    isLoading,
    status: isLoading ? 'loading' :
           pendingPopups > 0 ? 'has-pending' :
           totalMeetingDrafts > 0 ? 'all-shown' :
           'no-meetings'
  };
}