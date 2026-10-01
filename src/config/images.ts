/**
 * Centralized TRUSTLY Image Configuration
 * Uses Vite-compatible static asset imports for 100% production and Vercel reliability.
 */

// Connection Type Cards
import partnerCard from '../assets/images/partner_card_1790841232180.jpg';
import parentCard from '../assets/images/parent_card_1790841247252.jpg';
import familyCard from '../assets/images/family_card_1790841263241.jpg';
import bestFriendCard from '../assets/images/best_friend_card_1790841276366.jpg';
import friendCard from '../assets/images/friend_card_1790841293395.jpg';
import crushCard from '../assets/images/crush_card_1790841309809.jpg';
import otherCard from '../assets/images/other_card_1790841326419.jpg';

// Human Expression Reaction Cards
import reactionAppreciated from '../assets/images/reaction_appreciated_1790853426261.jpg';
import reactionConnected from '../assets/images/reaction_connected_1790853448898.jpg';
import reactionGood from '../assets/images/reaction_good_1790853466537.jpg';
import reactionNeutral from '../assets/images/reaction_neutral_1790853484325.jpg';
import reactionDistant from '../assets/images/reaction_distant_1790853500336.jpg';
import reactionWorried from '../assets/images/reaction_worried_1790853522739.jpg';
import reactionFrustrated from '../assets/images/reaction_frustrated_1790853539935.jpg';
import reactionUnsure from '../assets/images/reaction_unsure_1790853559188.jpg';

export const CONNECTION_IMAGES = {
  partner: partnerCard,
  parent: parentCard,
  family: familyCard,
  best_friend: bestFriendCard,
  friend: friendCard,
  crush: crushCard,
  other: otherCard
} as const;

export const REACTION_IMAGES = {
  appreciated: reactionAppreciated,
  connected: reactionConnected,
  good: reactionGood,
  neutral: reactionNeutral,
  distant: reactionDistant,
  worried: reactionWorried,
  frustrated: reactionFrustrated,
  unsure: reactionUnsure
} as const;

export type ReactionImageKey = keyof typeof REACTION_IMAGES;
export type ConnectionImageKey = keyof typeof CONNECTION_IMAGES;

export function getReactionImage(feeling?: string): string {
  if (!feeling) return REACTION_IMAGES.connected;
  const lower = feeling.toLowerCase().trim();
  if (lower.includes('appreciat')) return REACTION_IMAGES.appreciated;
  if (lower.includes('connect')) return REACTION_IMAGES.connected;
  if (lower.includes('good')) return REACTION_IMAGES.good;
  if (lower.includes('neutral') || lower.includes('okay')) return REACTION_IMAGES.neutral;
  if (lower.includes('distant')) return REACTION_IMAGES.distant;
  if (lower.includes('worr')) return REACTION_IMAGES.worried;
  if (lower.includes('frustrat')) return REACTION_IMAGES.frustrated;
  if (lower.includes('unsure') || lower.includes('mind')) return REACTION_IMAGES.unsure;
  return REACTION_IMAGES.connected;
}

export function getConnectionTypeImage(type?: string): string {
  if (!type) return CONNECTION_IMAGES.other;
  const lower = type.toLowerCase().trim();
  if (lower in CONNECTION_IMAGES) {
    return CONNECTION_IMAGES[lower as ConnectionImageKey];
  }
  return CONNECTION_IMAGES.other;
}
