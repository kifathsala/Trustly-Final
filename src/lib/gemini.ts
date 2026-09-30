import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK with runtime injected or environment API Key
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || (typeof window !== 'undefined' ? (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY : '') || '';

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

export interface ConversationStarterResult {
  feeling: string;
  discuss: string;
  starter: string;
  isSafetyAlert?: boolean;
  safetyGuidance?: string;
}

export async function buildConversationStarter(
  category: string,
  userReflection: string
): Promise<ConversationStarterResult> {
  const text = userReflection.toLowerCase();

  // Safety clause check: threats, violence, physical intimidation, severe coercion
  const safetyKeywords = [
    'hit me', 'beat me', 'struck me', 'violence', 'violent', 
    'physical abuse', 'threatened to kill', 'threatened to hurt', 
    'afraid for my life', 'afraid he will hurt', 'afraid she will hurt', 
    'scared he might hurt', 'scared she might hurt', 'forced me to',
    'choking', 'pushed me down', 'bruise'
  ];

  const triggersSafety = safetyKeywords.some(k => text.includes(k));
  if (triggersSafety) {
    return {
      feeling: "I am feeling unsafe and in need of support.",
      discuss: "Prioritizing physical safety and reaching out to trusted support services.",
      starter: "I need to take space right now to ensure my personal well-being.",
      isSafetyAlert: true,
      safetyGuidance: "Your physical and emotional safety is the ultimate priority. If you or someone you know is experiencing threats, intimidation, coercion, or violence, please know you are not alone and help is available. You can reach out discreetly to the National Domestic Violence Hotline by calling 1-800-799-SAFE (7233) or texting 'START' to 88788 (free, confidential, 24/7), or contact local emergency services if you are in immediate danger."
    };
  }

  // Attempt to call Gemini if client or key is available
  if (apiKey || process.env.GEMINI_API_KEY) {
    try {
      const client = aiClient || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || apiKey });
      const prompt = `Topic Category: ${category}
User's Situation or Thoughts: "${userReflection.trim() || 'No additional details provided'}"

Instructions:
Create a calm, respectful, non-accusatory conversation starter based on this input.
STRICT RULES:
- Never accuse the partner of cheating, lying, or malice.
- Avoid absolute statements like "You always...", "You never...", or "You don't care".
- Frame with vulnerable, constructive "I" statements.
- Return EXACTLY a JSON object with three keys:
  "feeling": Concise summary of what the user is experiencing (e.g. "I've been feeling a little distant lately")
  "discuss": What the user wants to constructively explore together (e.g. "I'd like us to find intentional time together")
  "starter": A gentle, warm way to open the talk in person (e.g. "Can we talk about how we've been feeling lately? I miss having more time together.")
Do not include markdown codeblocks if possible, or provide valid JSON only.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.6,
        }
      });

      if (response.text) {
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.feeling && parsed.discuss && parsed.starter) {
            return {
              feeling: parsed.feeling,
              discuss: parsed.discuss,
              starter: parsed.starter,
              isSafetyAlert: false
            };
          }
        } catch {
          // Continue to fallback
        }
      }
    } catch (e) {
      console.warn("Notice in Gemini conversation starter call:", e);
    }
  }

  // Curated generator fallback based on category and reflection
  return generateCuratedConversationStarter(category, userReflection);
}

function generateCuratedConversationStarter(category: string, reflection: string): ConversationStarterResult {
  const trimmed = reflection.trim();

  switch (category) {
    case 'Communication':
      return {
        feeling: trimmed ? `I've been feeling a bit disconnected when we talk lately.` : `I've been noticing moments where our communication feels rushed.`,
        discuss: `I want to find a calm rhythm where both of us feel heard without feeling defensive.`,
        starter: `Can we set aside 15 quiet minutes tonight to check in? I value our connection and want to hear how you're feeling too.`,
        isSafetyAlert: false
      };

    case 'Quality Time':
      return {
        feeling: trimmed ? `I've been missing dedicated, focused time together.` : `I miss having moments together where neither of us is distracted by screens or work.`,
        discuss: `I'd love for us to schedule intentional date time or downtime just for the two of us.`,
        starter: `I've really been missing you lately. Could we pick an evening this week to do something just for us, phones put away?`,
        isSafetyAlert: false
      };

    case 'Affection':
      return {
        feeling: trimmed ? `I've been feeling a craving for more warmth and closeness between us.` : `I've been feeling a bit vulnerable and craving more physical and emotional warmth.`,
        discuss: `Finding small everyday ways to express tenderness that feel comfortable for both of us.`,
        starter: `I wanted to share that I've been craving extra hugs and closeness lately. You mean a lot to me and I love feeling close to you.`,
        isSafetyAlert: false
      };

    case 'Trust':
      return {
        feeling: trimmed ? `I've noticed some quiet anxiety on my mind around transparency and reassurance.` : `I've noticed some uncertainty on my mind and want to ground myself in honesty.`,
        discuss: `Having open clarity on our agreements and reassuring each other with openness.`,
        starter: `I have a vulnerable reflection on my mind that I want to share with you calmly. Can we talk through something gently so I don't hold onto unnecessary worry?`,
        isSafetyAlert: false
      };

    case 'Money':
      return {
        feeling: trimmed ? `I've been feeling some stress around how we're handling shared finances or future planning.` : `I've been feeling some pressure around budgeting and want us to feel aligned on our plans.`,
        discuss: `Reviewing our financial goals calmly so we both feel secure and respected.`,
        starter: `Could we sit down this weekend with a warm cup of coffee and review our plans together? I want to make sure we're on the same page and supporting each other.`,
        isSafetyAlert: false
      };

    case 'Family':
      return {
        feeling: trimmed ? `I've been navigating some complex feelings regarding family dynamics or expectations.` : `I've been feeling the weight of family commitments and want to make sure our bond comes first.`,
        discuss: `Setting mutual boundaries and supporting each other during family events or obligations.`,
        starter: `I wanted to check in about upcoming family plans. Can we talk about how we can support each other and feel like a team?`,
        isSafetyAlert: false
      };

    case 'Future':
      return {
        feeling: trimmed ? `I've been thinking about what's ahead for us and wanting clarity on our shared vision.` : `I've been daydreaming about our future and wanting to understand where you're at.`,
        discuss: `Sharing our hopes and timelines openly without pressure.`,
        starter: `I'd love to hear what's been on your heart regarding our future together. When you have a peaceful moment, can we talk about what you're hoping for?`,
        isSafetyAlert: false
      };

    case 'Personal Feelings':
      return {
        feeling: trimmed ? `I've been experiencing some emotional vulnerability and wanted to be transparent with you.` : `I've had some personal worries on my mind that I didn't want to carry alone.`,
        discuss: `Sharing what I'm walking through so you know where my headspace is.`,
        starter: `I wanted to let you know what's been going on in my head lately. It's not about anything you did wrong—I just feel closer when I can share it with you.`,
        isSafetyAlert: false
      };

    default:
      return {
        feeling: trimmed ? `I've been holding some reflections on my mind that I'd love to talk through.` : `I've been thinking about our relationship dynamic and wanting to check in.`,
        discuss: `Exploring this topic together with warmth and open curiosity.`,
        starter: `There's something on my mind that I'd really love to share with you when you have a quiet moment. Is tonight a good time for a calm chat?`,
        isSafetyAlert: false
      };
  }
}

/**
 * Birthday Message Coach Assistant:
 * Creates a heartfelt, genuine birthday message based strictly on what the user provides.
 * Principle: Never invents private facts or hallucinates details.
 */
export async function generateBirthdayMessageCoach(
  partnerName: string,
  userNotes: string,
  tone: 'heartfelt' | 'playful' | 'deeply_romantic' | 'grateful' = 'heartfelt'
): Promise<string> {
  const safePartner = partnerName || 'my love';
  const cleanNotes = userNotes.trim();

  const prompt = `You are TRUSTLY Relationship Coach helping a partner write a personalized, warm, and authentic birthday message for their partner (${safePartner}).
  
User's personal notes/feelings to incorporate:
"${cleanNotes || 'I am so grateful for them and want them to feel truly celebrated and loved today.'}"

Tone style: ${tone}

STRICT GUIDELINES:
1. Write directly to the partner from the first-person perspective ("Happy birthday...", "I love how...").
2. Only reference specific details or memories if explicitly mentioned in the user's notes above. DO NOT make up fake trips, pet names, or unmentioned facts.
3. Keep it sincere, deeply appreciative, and emotionally uplifting (2 to 4 sentences).
4. Do not wrap in quotes or add conversational preamble. Return only the message text.`;

  if (apiKey || process.env.GEMINI_API_KEY) {
    try {
      const client = aiClient || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || apiKey });
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.warn("Gemini birthday message generator error, falling back to template:", err);
    }
  }

  // Graceful fallback templates if AI is offline
  if (cleanNotes) {
    return `Happy Birthday, ${safePartner}! 🎉 ${cleanNotes} I'm so grateful for you every single day and so excited to celebrate you today. Here's to making this your most beautiful year yet. ❤️`;
  }
  return `Happy Birthday, ${safePartner}! 🎉 Thank you for bringing so much warmth, joy, and meaning into my life. Today is all about celebrating the wonderful person you are. Wishing you the happiest day and a beautiful year ahead! ❤️`;
}

