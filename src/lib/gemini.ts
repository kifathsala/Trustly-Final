import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK with runtime injected API Key
const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY : '') || '';

let aiClient: GoogleGenAI | null = null;
try {
  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.warn("AI Client init notice:", e);
}

export interface CoachPromptOptions {
  userQuery: string;
  contextMode: 'conversation_starter' | 'rewrite_message' | 'understand_situation' | 'prepare_difficult' | 'resolve_argument' | 'general';
}

const SYSTEM_INSTRUCTION = `
You are TRUSTLY Coach, a compassionate, emotionally intelligent, and objective relationship communication advisor.

STRICT PRINCIPLES:
1. Relationships deserve clarity, kindness, and emotional safety.
2. DISTINGUISH FEELINGS FROM FACTS: Acknowledge that feelings of anxiety, distance, or worry are valid, but they do not prove wrongdoing, disloyalty, or infidelity.
3. NEVER DECLARE GUILT OR ACCUSE: Never accuse a partner of cheating, lying, or bad faith based on guesses or feelings.
4. If a user asks "Is my partner cheating?" or mentions suspicion:
   State clearly: "TRUSTLY can't determine whether someone is cheating. We can help you separate what you know from what you're worried about and prepare a respectful conversation."
5. AVOID PSYCHOLOGICAL DIAGNOSES: Never label a partner as "narcissist," "gaslighter," or "sociopath."
6. NEVER ENCOURAGE SNOOPING OR MANIPULATION: Explicitly discourage snooping on phones, hacking accounts, checking private messages, or tracking location without consent.
7. ENCOURAGE RESPECTFUL "I" STATEMENTS: Frame difficult emotions using "I feel...", "I've noticed...", "I'd love to understand..." rather than accusatory "You always..." or "You did...".
8. SAFETY CLAUSE: If domestic violence, physical intimidation, or dangerous abuse is mentioned, gently and warmly advise prioritizing immediate physical and emotional safety, offering professional helpline resources.
9. Keep responses structured, warm, grounded, and concise (under 250 words) with actionable phrase suggestions.
`;

export async function askTrustlyCoach(options: CoachPromptOptions): Promise<string> {
  const { userQuery, contextMode } = options;

  // Check if user is asking about cheating / suspicion
  const lowerQuery = userQuery.toLowerCase();
  const suspicionKeywords = ['cheat', 'cheating', 'unfaithful', 'affair', 'sleeping with', 'lying to me about where'];
  const hasSuspicion = suspicionKeywords.some(k => lowerQuery.includes(k));

  if (hasSuspicion && (lowerQuery.includes('is he') || lowerQuery.includes('is she') || lowerQuery.includes('are they') || lowerQuery.includes('how to know'))) {
    return `TRUSTLY can't determine whether someone is cheating. We can help you separate what you know from what you're worried about and prepare a respectful conversation.\n\nWhen we feel insecure or sense a change in patterns, our minds naturally imagine the worst scenarios to protect ourselves. \n\nInstead of making an accusation, consider opening with:\n"I’ve noticed some distance between us lately, and I’m feeling unsettled. Could we set aside quiet time tonight to talk about how things are feeling between us?"`;
  }

  // Attempt to call Gemini API if key is available
  if (apiKey || process.env.GEMINI_API_KEY) {
    try {
      const client = aiClient || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || apiKey });
      const prompt = `Context Action: ${contextMode}\nUser asks: "${userQuery}"\n\nPlease provide supportive, non-accusatory advice with example respectful words they can say.`;
      
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn("Gemini API call returned error, switching to built-in empathetic coach model:", err);
    }
  }

  // Intelligent empathetic fallback matching the startup design
  return generateCuratedCoachResponse(userQuery, contextMode);
}

function generateCuratedCoachResponse(query: string, mode: CoachPromptOptions['contextMode']): string {
  const q = query.toLowerCase();

  if (mode === 'rewrite_message') {
    return `Here is a respectful rewrite focusing on clarity rather than blame:\n\nOriginal tone often sounds accusatory when we are hurt. Try this instead:\n\n"Hey, I value our connection and have felt a little disconnected over the past couple of days. When you have a moment, I'd really love to hear how you're doing and share what's on my mind."\n\n💡 Why this works: It opens the door without triggering defensiveness.`;
  }

  if (mode === 'resolve_argument' || q.includes('argument') || q.includes('fight')) {
    return `When resolving a heated disagreement, the goal is reconnection, not winning:\n\n1. Take a brief pause: "I want to solve this with you, but I feel overwhelmed right now. Can we take 20 minutes to breathe and return to this?"\n2. Reaffirm the bond: "You matter more to me than being right about this."\n3. Clarify their view: "What was the hardest part of that for you?"`;
  }

  if (mode === 'prepare_difficult' || q.includes('difficult') || q.includes('boundaries')) {
    return `To prepare for a vulnerable conversation:\n\n• Choose a neutral moment when neither of you is hungry, tired, or rushed.\n• State your positive intention first: "I'm bringing this up because our relationship is really important to me and I want us to feel safe together."\n• Stick to observable experiences: "When plans change without notice, I feel anxious about our time together."`;
  }

  if (q.includes('avoid') || q.includes('distant') || q.includes('ignoring')) {
    return `Instead of starting with an accusation, you could say:\n\n"I’ve felt a little distant from you recently, and I’d like to understand how you're feeling. Are you feeling overwhelmed by work or life, or is there something between us we should talk through?"\n\nNotice that this separates your observation of distance from assuming bad intent.`;
  }

  return `Relationships grow when we choose curiosity over assumption.\n\nA helpful way to express this is:\n"I’ve been reflecting on our dynamic lately and wanted to check in. I want to make sure you feel heard and supported, and also share what I've been feeling."\n\nFocus on how you want to grow together rather than past shortcomings.`;
}
