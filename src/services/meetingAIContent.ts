import { AIService } from './ai';
import { MeetingRequest } from './meetingDetection';
import { ParsedEmail } from '../types';
import { MeetingResponseContext } from './meetingResponseGenerator';

export interface AIContentRequest {
  action: 'accept' | 'conflict_calendly' | 'vague_calendly' | 'alternatives' | 'more_info';
  meetingRequest: MeetingRequest;
  email: ParsedEmail;
  context: MeetingResponseContext;
  timeFormatted?: string;
  schedulingLink?: string;
  suggestedTimes?: Array<{
    start: string;
    end: string;
    formatted: string;
    confidence: number;
  }>;
}

export interface AIContentResponse {
  responseText: string;
  confidence: number;
  aiGenerated: boolean;
  fallbackUsed: boolean;
}

export class MeetingAIContentService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * Generate AI-enhanced meeting response content
   */
  async generateEnhancedContent(request: AIContentRequest): Promise<AIContentResponse> {
    try {
      console.log(`🤖 [AI CONTENT] Generating ${request.action} response for ${request.meetingRequest.senderEmail}`);

      // Build AI prompt based on the action and context
      const systemPrompt = this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      // Generate AI response
      const aiResponse = await this.aiService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      const generatedContent = aiResponse.choices[0]?.message?.content || '';

      if (!generatedContent || generatedContent.length < 20) {
        throw new Error('AI generated content too short or empty');
      }

      // Basic safety validation
      const validation = this.validateAIContent(generatedContent, request);
      if (!validation.isValid) {
        throw new Error(`AI content validation failed: ${validation.reason}`);
      }

      console.log(`✅ [AI CONTENT] Generated ${generatedContent.length} character response`);

      return {
        responseText: generatedContent.trim(),
        confidence: 85,
        aiGenerated: true,
        fallbackUsed: false
      };

    } catch (error) {
      console.error('❌ [AI CONTENT] Error generating AI content:', error);

      // Return fallback indicator - calling code will use template
      return {
        responseText: '',
        confidence: 0,
        aiGenerated: false,
        fallbackUsed: true
      };
    }
  }

  /**
   * Build system prompt based on action and context
   */
  private buildSystemPrompt(request: AIContentRequest): string {
    const { action, context, meetingRequest } = request;

    let basePrompt = `You are responding to a meeting request email as a professional. `;

    // Add relationship context
    const relationship = context.senderRelationship || 'new_contact';
    const tone = context.userTone || 'professional';

    switch (tone) {
      case 'casual':
        basePrompt += `Use a friendly, casual tone that's still professional. `;
        break;
      case 'friendly':
        basePrompt += `Use a warm, friendly but professional tone. `;
        break;
      default:
        basePrompt += `Use a professional, courteous tone. `;
    }

    // Add relationship guidance
    switch (relationship) {
      case 'known_contact':
        basePrompt += `This is someone you know - be personable but maintain professionalism. `;
        break;
      case 'stranger':
        basePrompt += `This is a new contact - be welcoming and professional. `;
        break;
      default:
        basePrompt += `This is a business contact - maintain professional courtesy. `;
    }

    // Add action-specific guidance
    switch (action) {
      case 'accept':
        basePrompt += `You are ACCEPTING their meeting request. Confirm the time enthusiastically and reference the meeting purpose if mentioned.`;
        break;
      case 'conflict_calendly':
        basePrompt += `You have a CONFLICT with their suggested time. Politely decline the specific time but offer your scheduling link as an alternative.`;
        break;
      case 'vague_calendly':
        basePrompt += `They made a VAGUE meeting request without specific time. Respond positively and offer your scheduling link for them to book.`;
        break;
      case 'alternatives':
        basePrompt += `You have a CONFLICT with their time. Suggest specific alternative times provided.`;
        break;
      case 'more_info':
        basePrompt += `Their request needs MORE INFORMATION. Ask for clarification on timing while showing interest.`;
        break;
    }

    basePrompt += `\n\nIMPORTANT:
- Keep response concise (2-4 sentences max)
- Reference specific details from their email when relevant
- Sound natural and human
- Don't use overly formal business language
- Match their communication energy level`;

    return basePrompt;
  }

  /**
   * Build user prompt with meeting request details
   */
  private buildUserPrompt(request: AIContentRequest): string {
    const { meetingRequest, email, action, timeFormatted, schedulingLink, suggestedTimes } = request;

    let prompt = `Meeting Request Email:
FROM: ${meetingRequest.senderEmail}
SUBJECT: ${email.subject}
BODY: ${email.body}

Meeting Details Detected:
- Purpose: ${meetingRequest.subject || 'General meeting'}
- Requested Duration: ${meetingRequest.requestedDuration || 60} minutes
`;

    if (meetingRequest.preferredDates && meetingRequest.preferredDates.length > 0) {
      prompt += `- Requested Time: ${meetingRequest.preferredDates[0]}\n`;
    }

    // Add action-specific context
    switch (action) {
      case 'accept':
        if (timeFormatted) {
          prompt += `\nYour Response Context:
- You ARE available at: ${timeFormatted}
- You will confirm this time and show enthusiasm`;
        }
        break;

      case 'conflict_calendly':
        if (timeFormatted && schedulingLink) {
          prompt += `\nYour Response Context:
- You have a CONFLICT at: ${timeFormatted}
- Provide this scheduling link: ${schedulingLink}`;
        }
        break;

      case 'vague_calendly':
        if (schedulingLink) {
          prompt += `\nYour Response Context:
- No specific time was provided
- Provide this scheduling link: ${schedulingLink}`;
        }
        break;

      case 'alternatives':
        if (suggestedTimes && suggestedTimes.length > 0) {
          prompt += `\nYour Response Context:
- You have a conflict with their requested time
- Suggest these alternative times:
${suggestedTimes.map((time, i) => `  ${i + 1}. ${time.formatted}`).join('\n')}`;
        }
        break;

      case 'more_info':
        prompt += `\nYour Response Context:
- You need more information about timing
- Show interest but ask for specific time options`;
        break;
    }

    prompt += `\n\nGenerate a natural, professional meeting response that matches the context above.`;

    return prompt;
  }

  /**
   * Validate AI-generated content for basic safety and appropriateness
   */
  private validateAIContent(content: string, request: AIContentRequest): { isValid: boolean; reason?: string } {
    // Length validation
    if (content.length < 20) {
      return { isValid: false, reason: 'Content too short' };
    }

    if (content.length > 1000) {
      return { isValid: false, reason: 'Content too long' };
    }

    // Basic professionalism check
    const unprofessionalPatterns = [
      /\bf[u*]ck/i, /\bsh[i*]t/i, /\bdamn\b/i, /\bass[h*]ole/i,
      /^hey dude/i, /^sup\b/i, /\bidk\b/i, /\blol\b/i
    ];

    if (unprofessionalPatterns.some(pattern => pattern.test(content))) {
      return { isValid: false, reason: 'Unprofessional language detected' };
    }

    // Action-specific validation
    switch (request.action) {
      case 'conflict_calendly':
      case 'vague_calendly':
        if (request.schedulingLink && !content.includes(request.schedulingLink)) {
          return { isValid: false, reason: 'Missing required scheduling link' };
        }
        break;

      case 'accept':
        // For acceptance, just check that it's positive and doesn't decline
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('unfortunately') || lowerContent.includes('conflict') || lowerContent.includes('cannot')) {
          return { isValid: false, reason: 'Acceptance response contains declining language' };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{ status: string; aiReady: boolean }> {
    try {
      // Simple test call to verify AI service is working
      const testResponse = await this.aiService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      });

      return {
        status: 'healthy',
        aiReady: testResponse.choices.length > 0
      };
    } catch (error) {
      return {
        status: 'error',
        aiReady: false
      };
    }
  }
}