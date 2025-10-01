# Meeting Response Popup System

## 🎯 **Project Overview**

Transform the current auto-booking meeting system into a user-controlled approval workflow using popups. Instead of automatically booking meetings when no conflicts exist, users will see a popup to approve, decline, or ignore meeting responses before any action is taken.

## 🔄 **Current vs Proposed Flow**

### **Current Flow (Auto-booking Issue):**
1. Email: "Let's meet at 2pm"
2. AI detects no calendar conflict
3. **Meeting gets AUTO-BOOKED to calendar** ❌
4. Draft response generated
5. User sees draft but meeting already committed

### **Proposed Flow (Draft-first approval):**
1. Email: "Let's meet at 2pm"
2. AI detects no calendar conflict
3. **Draft response generated (NO calendar booking yet)** ✅
4. User sees popup with meeting details + 3 options:
   - **Approve** → Books meeting + sends email
   - **Decline** → Sends decline email (no booking)
   - **Ignore** → Does nothing (no email, no booking)

## 🏷️ **Meeting Response Types to Tag**

All meeting-related emails get `type: "meeting_response"` tag:

1. **`accept`** - No conflict, accepting proposed time
2. **`conflict_calendly`** - Conflict, offering Calendly link
3. **`vague_calendly`** - No specific time, offering Calendly link
4. **`alternatives`** - Conflict, suggesting alternative times
5. **`more_info`** - Need more meeting details

## 📋 **Complete Implementation Plan**

### 🏗️ **Phase 1: Backend Foundation - Add Meeting Response Tagging**
*Goal: Tag all meeting responses and remove auto-booking*

#### **Phase 1A: Database & Draft Model Updates** ✅ **COMPLETED**
- [x] Add `type` field to drafts table (varchar: "regular", "meeting_response")
- [x] Add `meeting_context` JSONB field to store meeting details
- [x] Add `pending_user_action` to draft status enum
- [x] Update draft service to handle meeting context
- [x] Create specialized query methods for meeting drafts

#### **Phase 1B: Meeting Pipeline Integration** ✅ **COMPLETED**
- [x] Update `meetingResponseGenerator.ts` to create drafts with `type: "meeting_response"`
- [x] Store meeting context (original request, meeting type, proposed time)
- [x] Set initial status to `pending_user_action` for all meeting drafts
- [x] Ensure all meeting types get tagged properly

#### **Phase 1C: Remove Auto-booking Logic** ✅ **COMPLETED**
- [x] Modify no-conflict meeting flow to NOT auto-book to calendar
- [x] Calendar booking only happens on user approval
- [x] Update calendar integration service for conditional booking

---

### 🖥️ **Phase 2: Frontend Detection - Extend Existing Polling**
*Goal: Detect tagged meeting drafts using current polling system*

#### **Phase 2A: Meeting Detection Hook**
- [ ] Create `useMeetingPopups()` hook that monitors existing `useDrafts()` data
- [ ] Filter for `type: "meeting_response"` AND `status: "pending_user_action"`
- [ ] Track shown popups to avoid duplicates
- [ ] Trigger popup display for new meeting drafts

#### **Phase 2B: Basic Meeting Popup Component**
- [ ] Create `MeetingResponsePopup` component
- [ ] Display meeting context (sender, subject, generated response preview)
- [ ] Three action buttons: "Send Response", "Decline Meeting", "Ignore"
- [ ] Handle popup dismissal and state management
- [ ] Integrate with existing toast system for feedback

---

### 🤖 **Phase 3: Real-time Decline Generation**
*Goal: Generate decline responses using LLM when user chooses to decline*

#### **Phase 3A: Decline Generation API**
- [ ] Create `/api/meetings/generate-decline` endpoint
- [ ] Accept: original email, user reason (optional), meeting context
- [ ] Use optimized LLM prompt for polite decline responses
- [ ] Return generated decline email in <1 second
- [ ] Handle errors gracefully with fallback responses

#### **Phase 3B: Decline Flow Integration**
- [ ] Add decline reason modal to popup component
- [ ] Call decline generation API on user decline action
- [ ] Show loading state during generation
- [ ] Preview generated decline response before sending
- [ ] Update draft with decline content and send

---

### 🔧 **Phase 4: Complete Integration & Testing**
*Goal: End-to-end functionality with all meeting types*

#### **Phase 4A: Meeting Type Coverage**
- [ ] Test popup flow with all meeting response types:
  - `accept` (no conflict) - approve books meeting + sends
  - `conflict_calendly` - approve sends calendly link
  - `vague_calendly` - approve sends scheduling link
  - `alternatives` - approve sends alternative times
  - `more_info` - approve sends info request
- [ ] Ensure decline generation works for all types
- [ ] Verify ignore functionality (no action taken)

#### **Phase 4B: Edge Cases & Polish**
- [ ] Handle multiple meeting popups (queue system)
- [ ] Prevent popup spam (rate limiting)
- [ ] Add keyboard shortcuts (Escape to dismiss, Enter to approve)
- [ ] Improve popup positioning and mobile responsiveness
- [ ] Add popup animations and smooth transitions
- [ ] Error handling for network failures during actions

---

## 🛠️ **Technical Architecture**

### **Database Schema Changes**
```sql
-- New fields added to existing drafts table
ALTER TABLE drafts ADD COLUMN type VARCHAR(50) DEFAULT 'regular';
ALTER TABLE drafts ADD COLUMN meeting_context JSONB;
ALTER TABLE drafts ADD CONSTRAINT drafts_status_check
    CHECK (status IN ('pending', 'approved', 'sent', 'declined', 'pending_user_action'));
```

### **Meeting Context Structure**
```javascript
{
  "meetingType": "accept",
  "originalRequest": "Let's meet at 2pm tomorrow",
  "proposedTime": "2024-12-30T14:00:00Z",
  "hasConflict": false,
  "schedulingLink": "https://calendly.com/user/30min",
  "suggestedTimes": [
    {
      "start": "2024-12-30T15:00:00Z",
      "end": "2024-12-30T16:00:00Z",
      "formatted": "Tomorrow at 3:00 PM",
      "confidence": 85
    }
  ]
}
```

### **Frontend Integration Strategy**
- **Leverage Existing Polling:** Use current `useDrafts()` hook with smart filtering
- **Popup Detection:** Monitor draft data for `type: "meeting_response"` + `status: "pending_user_action"`
- **No New API Calls:** Piggyback on existing React Query polling system
- **Minimal UI Changes:** Popup overlays existing draft panel

### **User Experience Flow**
```
Email Received → Meeting Detected → Draft Created (tagged) → Existing Polling Fetches →
Frontend Detects Meeting Tag → Popup Appears → User Chooses Action →
Action Executed → Status Updated → Next Poll Cycle (no more popup)
```

## 📊 **Success Criteria**

### **Phase 1 Complete When:**
- [x] All meeting drafts created with `type: "meeting_response"`
- [x] No auto-booking occurs for any meeting type
- [x] Meeting context stored and retrievable

### **Phase 2 Complete When:**
- [ ] Popup appears immediately when meeting draft created
- [ ] All three actions work (approve, decline, ignore)
- [ ] No duplicate popups shown

### **Phase 3 Complete When:**
- [ ] Decline generation works in <1 second
- [ ] Generated declines are polite and contextual
- [ ] User can preview and edit before sending

### **Phase 4 Complete When:**
- [ ] All meeting types work end-to-end
- [ ] Edge cases handled gracefully
- [ ] User experience is smooth and intuitive

## 🔒 **Integration Safeguards**

### **Zero Breaking Changes:**
- Regular emails process exactly as before
- Existing drafts display and work normally
- Current UI functionality preserved
- API compatibility maintained
- Database queries continue working

### **Backward Compatibility:**
- Existing drafts without `type` field default to 'regular'
- Current draft panel works unchanged for non-meeting emails
- All existing endpoints remain functional

## 🎯 **Current Status**

**✅ COMPLETED:**
- ✅ **Phase 1: Backend Foundation** - All meeting response tagging complete
- Phase 1A: Database schema and TypeScript models updated
- Phase 1B: Meeting pipeline integration with tagged drafts
- Phase 1C: Auto-booking removal - draft-first approval system
- Meeting draft tagging infrastructure ready
- Specialized query methods for popup system

**🔄 NEXT:**
- Phase 2: Frontend Detection using existing polling system
- Build meeting popup components and user approval workflow

## 🚧 **Implementation Notes**

### **Database Migration Status** ✅ **COMPLETED**
- Migration script created: `scripts/database/meeting_draft_enhancement.sql`
- **✅ Migration APPLIED SUCCESSFULLY** - database schema updated
- Executed via Node.js migration utility: `npm run db:migrate`

### **Key Files Modified** ✅ **COMPLETED**
- ✅ `src/models/Draft.ts` - Extended with meeting fields and methods
- ✅ `scripts/database/meeting_draft_enhancement.sql` - Schema changes
- ✅ `src/services/meetingPipeline.ts` - Updated to use tagged meeting drafts
- ✅ `src/services/meetingResponseGenerator.ts` - Removed auto-booking, draft-first approach

### **Next Files to Modify**
- Frontend popup components and hooks
- Meeting detection and polling system integration

---

*Last Updated: December 30, 2024*
*Status: Phase 1 (Backend Foundation) Complete - Ready for Phase 2 (Frontend Integration)*