import { CONNECTION_TYPE_OPTIONS } from '../types';
import { getConnectionTypeImage } from '../config/images';

/**
 * Returns a human-friendly label for a given connectionType string.
 * Defaults to "Connection" if not specified, avoiding hardcoded "Partner".
 */
export function getConnectionLabel(connectionType?: string): string {
  if (!connectionType) return 'Connection';
  const matched = CONNECTION_TYPE_OPTIONS.find(
    opt => opt.type === connectionType || opt.label.toLowerCase() === connectionType.toLowerCase()
  );
  if (matched) return matched.label;

  switch (connectionType.toLowerCase()) {
    case 'partner': return 'Partner / Lover';
    case 'parent': return 'Parent';
    case 'family': return 'Family';
    case 'best_friend': return 'Best Friend';
    case 'friend': return 'Friend';
    case 'crush': return 'Crush';
    case 'other': return 'Other';
    default: return 'Connection';
  }
}

/**
 * Returns the card image for the connection type.
 */
export function getConnectionImage(connectionType?: string): string {
  return getConnectionTypeImage(connectionType);
}

/**
 * Kept for backwards compatibility, returns empty string or clean icon key instead of emoji.
 */
export function getConnectionEmoji(connectionType?: string): string {
  return '';
}
