import { AIService } from './ai';
import { MeetingRequest } from './meetingDetection';
import { ParsedEmail } from '../types';
import type { MeetingResponseContext } from './meetingResponseGenerator';

export interface AIContentRequest {
  action: 'accept' | 'conflict_calendly' | 'vague_calendly' | 'alternatives' | 'more_info' | 'decline';
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
  declineReason?: string; // User's reason for declining the meeting
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

      // Generate AI response with JSON format
      const aiResponse = await this.aiService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 400
      });

      const generatedContent = aiResponse.choices[0]?.message?.content || '';

      if (!generatedContent || generatedContent.length < 20) {
        throw new Error('AI generated content too short or empty');
      }

      // Parse JSON response
      const parsedResponse = await this.parseAndValidateJsonResponse(generatedContent, request);

      // Basic safety validation on the email body
      const validation = this.validateAIContent(parsedResponse.emailBody, request);
      if (!validation.isValid) {
        throw new Error(`AI content validation failed: ${validation.reason}`);
      }

      console.log(`✅ [AI CONTENT] Generated ${parsedResponse.emailBody.length} character response`);
      console.log(`📊 [AI CONTENT] Confidence: ${parsedResponse.confidence}, Reasoning: ${parsedResponse.reasoning}`);

      return {
        responseText: parsedResponse.emailBody.trim(),
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

    // Add action-specific guidance with human tone
    switch (action) {
      case 'accept':
        basePrompt += `You are ACCEPTING their meeting request. Show genuine enthusiasm! Confirm the time in a natural way and reference what you'll be discussing if they mentioned it. Match their excitement level - if they seem eager, be eager back!`;
        break;
      case 'conflict_calendly':
        basePrompt += `You have a CONFLICT with their suggested time. Be genuinely apologetic but positive. Acknowledge their specific time, explain you're not available, then offer your scheduling link as a helpful alternative. Keep it friendly and solution-focused.`;
        break;
      case 'vague_calendly':
        basePrompt += `They want to meet but didn't suggest a specific time. Show you're interested and make it easy for them by offering your scheduling link. Be welcoming and mention you're looking forward to connecting.`;
        break;
      case 'alternatives':
        basePrompt += `You have a CONFLICT with their suggested time. Be apologetic about the conflict, then suggest the alternative times in a friendly way. Present the options clearly and ask which works best for them.`;
        break;
      case 'more_info':
        basePrompt += `Their request needs MORE INFORMATION about timing. Show interest in meeting while asking for clarification. Be helpful and suggest what information would be useful (specific times, duration, etc.).`;
        break;
      case 'decline':
        basePrompt += `You are POLITELY DECLINING their meeting request. Your goal is to maintain the relationship while being honest.

DECLINE RESPONSE STRUCTURE (follow this order):
1. **Greeting** - Match their style (if they said "Hey" → use "Hi", if "Dear" → use "Hello")
2. **Gratitude** - Thank them genuinely for thinking of you/reaching out
3. **Direct but Kind Decline** - Be clear you can't make it, no corporate jargon
4. **Brief Reason** - Natural explanation (1 sentence max, don't over-justify)
5. **Future Door Open** - Show interest in connecting another time (be specific if possible)
6. **Warm Sign-off** - End with appropriate closing based on their formality

TONE MATCHING:
- Mirror their communication style closely
- If they're enthusiastic → show warmth in your regret
- If they're formal → be polite but still human
- If they're casual → keep it friendly and conversational

EXAMPLES OF GOOD DECLINE RESPONSES:

Example 1 (Casual):
"Hey [Name]!

Thanks so much for reaching out about meeting next week! Unfortunately, I won't be able to make it since I'll be traveling during that time.

I'd definitely love to connect when I'm back though. Would the following week work for you?

Best,
[Your name]"

Example 2 (Professional):
"Hi [Name],

Thank you for the invitation to discuss [topic]. I appreciate you thinking of me for this.

Unfortunately, I won't be available during that timeframe due to prior commitments. However, I'm definitely interested in connecting and would love to find another time that works.

Would you be open to meeting in early [next month]?

Best regards,
[Your name]"

CRITICAL RULES:
- MUST include a sign-off (Best, Best regards, Thanks, Cheers, etc. based on formality)
- Reference specific details from their email when possible
- Keep it conversational and human
- Don't say "I hope this email finds you well" or other corporate clichés
- Be genuinely warm, even while declining`;
        break;
    }

    basePrompt += `\n\nSTEP 1: ANALYZE THE SENDER'S COMMUNICATION STYLE:
- Formality level: formal ("Dear", "Best regards") vs casual ("Hey", "Thanks!")
- Energy level: excited ("can't wait!", multiple exclamation marks) vs neutral vs urgent
- Length preference: brief vs detailed explanations
- Greeting style: warm ("Hope you're doing well") vs direct business approach
- Enthusiasm indicators: exclamation marks, positive language, eager phrasing

STEP 2: MIRROR & MATCH THEIR STYLE:
- If they use exclamation marks, show enthusiasm back (but don't overdo it)
- If they're casual ("Hey"), be casual back ("Hi!" or "Hello!")
- If they're excited about meeting, show genuine enthusiasm in your response
- If they're formal, maintain professionalism while being human
- Mirror their sentence length and complexity level
- Match their level of detail (brief vs explanatory)

STEP 3: WRITE LIKE A HUMAN, NOT A CORPORATE BOT:
❌ Avoid: "Thank you for reaching out regarding the meeting request."
✅ Use: "Thanks for reaching out!" or "Thanks for getting in touch!"

❌ Avoid: "I confirm my availability for the proposed time slot."
✅ Use: "That time works great for me!" or "Perfect, I'm free then!"

❌ Avoid: "Please advise of your preferred scheduling alternative."
✅ Use: "What other times work for you?" or "When else works?"

❌ Avoid: "I look forward to our productive discussion."
✅ Use: "Looking forward to chatting!" or "Excited to meet!"

RESPONSE GUIDELINES:
- Keep response concise (2-4 sentences max)
- Reference specific details from their email when relevant
- Sound genuinely human and conversational
- Match their enthusiasm level authentically
- Use contractions naturally (I'll, that's, let's)
- Be warm but not overly familiar with new contacts

OUTPUT FORMAT: You MUST respond with valid JSON in this exact format:
{
  "emailBody": "complete email body response (do not include subject line)",
  "reasoning": "brief explanation of your response approach and style matching",
  "confidence": "your confidence level in this response (high/medium/low)"
}

CRITICAL: Generate ONLY the email body content in the emailBody field. Do NOT include or reference the subject line in the email body.`;

    return basePrompt;
  }

  /**
   * Build user prompt with meeting request details
   */
  private buildUserPrompt(request: AIContentRequest): string {
    const { meetingRequest, email, action, timeFormatted, schedulingLink, suggestedTimes } = request;

    let prompt = `MEETING REQUEST CONTEXT (for understanding only):
From: ${meetingRequest.senderEmail}
Subject: ${email.subject}
Email Body: ${email.body}

MEETING DETAILS DETECTED:
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

      case 'decline':
        if (request.declineReason) {
          prompt += `\n\n=== ANALYZE THEIR EMAIL STYLE FIRST ===
Read their email carefully and note:
- How formal/casual is their language?
- What greeting did they use?
- How enthusiastic are they? (exclamation marks, positive words)
- What specific details did they mention about the meeting?
- How long/short are their sentences?

Their Original Email Body:
"""
${email.body}
"""

=== NOW CRAFT YOUR DECLINE RESPONSE ===

Your Response Context:
- You CANNOT attend this meeting
- Your honest reason: ${request.declineReason}
- You want to maintain a positive relationship
- You're open to meeting another time

INSTRUCTIONS:
1. Start with a greeting that MATCHES their style (if they said "Hey" use "Hi", if "Dear" use "Hello")
2. Thank them genuinely (reference something specific from their email if possible)
3. Clearly state you can't make it (be direct but kind)
4. Give your reason naturally (1 sentence, don't over-explain: "${request.declineReason}")
5. Show interest in connecting later (be specific if you can)
6. End with a warm sign-off appropriate to their formality level (REQUIRED: Best/Best regards/Thanks/Cheers based on their tone)

CRITICAL: Your response should feel like it's written by someone who actually READ their email and is responding naturally.`;
        }
        break;
    }

    prompt += `\n\nGenerate a natural, professional meeting response in JSON format. The emailBody should contain only the email body content without any subject line references.`;

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

      case 'decline':
        // For decline, ensure it's actually declining
        const declineContent = content.toLowerCase();
        const hasDeclineLanguage =
          declineContent.includes('unable') ||
          declineContent.includes('cannot') ||
          declineContent.includes('can\'t') ||
          declineContent.includes('unfortunately') ||
          declineContent.includes('decline') ||
          declineContent.includes('not available') ||
          declineContent.includes('won\'t be able');

        if (!hasDeclineLanguage) {
          return { isValid: false, reason: 'Decline response doesn\'t actually decline the meeting' };
        }

        // Ensure it's polite (has gratitude or appreciation)
        const hasGratitude =
          declineContent.includes('thank') ||
          declineContent.includes('appreciate') ||
          declineContent.includes('grateful');

        if (!hasGratitude) {
          return { isValid: false, reason: 'Decline response should express gratitude' };
        }

        // Ensure it has a sign-off (Best, Best regards, Thanks, Cheers, etc.)
        const hasSignOff =
          declineContent.includes('best,') ||
          declineContent.includes('best regards,') ||
          declineContent.includes('thanks,') ||
          declineContent.includes('cheers,') ||
          declineContent.includes('warm regards,') ||
          declineContent.includes('sincerely,') ||
          declineContent.includes('regards,') ||
          declineContent.includes('thank you,');

        if (!hasSignOff) {
          return { isValid: false, reason: 'Decline response must include a sign-off (Best, Best regards, Thanks, etc.)' };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Parse and validate JSON response from AI
   */
  private async parseAndValidateJsonResponse(
    generatedContent: string,
    request: AIContentRequest
  ): Promise<{ emailBody: string; reasoning: string; confidence: string }> {
    try {
      console.log('🔍 [AI CONTENT] Parsing AI response as JSON...');

      // Parse JSON response
      const parsed = JSON.parse(generatedContent);

      // Validate required fields
      if (!parsed.emailBody) {
        throw new Error('Missing required field: emailBody');
      }

      // Ensure emailBody is not empty and reasonable
      if (typeof parsed.emailBody !== 'string' || parsed.emailBody.trim().length < 10) {
        throw new Error('Invalid emailBody: too short or not a string');
      }

      // Basic subject line contamination check
      const emailSubject = request.email.subject.toLowerCase();
      const emailBodyLower = parsed.emailBody.toLowerCase();

      // Check if the email body starts with or contains the subject line
      if (emailBodyLower.includes(emailSubject) && emailSubject.length > 5) {
        console.warn('⚠️ [AI CONTENT] Possible subject line contamination detected, but proceeding');
        // Don't throw error - let it through but log warning
      }

      const result = {
        emailBody: parsed.emailBody.trim(),
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: parsed.confidence || 'medium'
      };

      console.log('✅ [AI CONTENT] JSON response parsed successfully');
      return result;

    } catch (error) {
      console.error('❌ [AI CONTENT] Failed to parse JSON response:', error);
      console.log('Raw AI response:', generatedContent);

      // Fallback: try to extract plain text as emailBody
      const fallbackBody = this.extractFallbackEmailBody(generatedContent);

      return {
        emailBody: fallbackBody,
        reasoning: 'Fallback parsing used due to JSON parse error',
        confidence: 'low'
      };
    }
  }

  /**
   * Extract email body from plain text response as fallback
   */
  private extractFallbackEmailBody(content: string): string {
    console.log('🔄 [AI CONTENT] Using fallback text extraction...');

    // Clean up common JSON parsing artifacts
    let cleanContent = content
      .replace(/^```json\s*/i, '')  // Remove markdown json blocks
      .replace(/\s*```$/i, '')
      .replace(/^{.*?"emailBody":\s*"/i, '')  // Remove partial JSON
      .replace(/".*}$/i, '')
      .trim();

    // If still looks like JSON, try to extract the value
    if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
      cleanContent = cleanContent.slice(1, -1);
    }

    // Basic cleanup
    cleanContent = cleanContent
      .replace(/\\n/g, '\n')        // Unescape newlines
      .replace(/\\"/g, '"')         // Unescape quotes
      .trim();

    // Ensure minimum length
    if (cleanContent.length < 10) {
      cleanContent = "Thank you for your email. I'll review the details and get back to you soon.";
    }

    console.log(`🔄 [AI CONTENT] Fallback extraction produced ${cleanContent.length} character response`);
    return cleanContent;
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