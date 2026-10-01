# TRUSTLY Play Store Release Checklist

## 1. Store Listing Info
- **App Name**: TRUSTLY
- **Short Description**: Relationships deserve clarity.
- **Full Description**: TRUSTLY is a private space for the relationships that matter to you. Build meaningful connections, share memories, set goals, manage important dates, and navigate your dynamic together with clarity and confidence. TRUSTLY offers private conversations, check-ins, and a supportive AI coach to help you communicate more effectively. Private by default, shared by choice.
- **Category**: Lifestyle / Social
- **Support Contact**: support@trustly.app (Placeholder - update)
- **Privacy Policy URL**: https://trustly.app/privacy (Placeholder - update)
- **Terms of Service URL**: https://trustly.app/terms (Placeholder - update)

## 2. Technical Configuration
- **Application ID**: `com.trustly.app`
- **Minimum Android API**: 26
- **Target Android API**: 34
- **Signing**: Release keys stored in secure keystore (Not in Git).

## 3. Data Safety Checklist
- **Account Info**: Collected for Auth.
- **Profile Info**: Name, photo, bio (User-provided).
- **User-Created Content**: Check-ins, notes, memories (Shared/Private).
- **Images**: Uploaded to Firebase Storage.
- **Connection Data**: Metadata for relationship management.

## 4. Account Deletion Process
- User navigates to Privacy Center -> Delete Account.
- Confirmation step required.
- Triggers Firebase Auth deletion and Firestore cleanup of user records.
