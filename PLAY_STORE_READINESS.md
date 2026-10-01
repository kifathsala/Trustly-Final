# TRUSTLY Play Store Readiness Checklist

This document tracks the requirements for preparing TRUSTLY for Google Play Store release.

## 1. Core Android Readiness
- [x] Responsive layout (portrait mode enforced)
- [x] Android safe area support (via CSS `env(safe-area-inset-...)`)
- [x] Comfortable touch targets (>44px)
- [x] Proper viewport configuration
- [x] No emoji UI (strictly verified)

## 2. Play Store Release Requirements
- [ ] **Android Package/Application ID**: Define unique `com.trustly.app` identifier.
- [ ] **App Icon**: High-resolution, premium brand mark (no romance-only imagery).
- [ ] **Screenshots**: High-quality mobile & desktop UI previews.
- [ ] **Privacy Policy URL**: Host and link to the privacy policy.
- [ ] **Terms of Service**: Host and link to ToS.
- [ ] **Data Safety Information**: Document all data collected (Firebase Auth, Firestore, Storage).
- [ ] **Account Deletion Flow**: Verify flow in `PrivacyCenterView.tsx` is final.
- [ ] **Support Contact**: Setup email for user support.

## 3. Deployment
- [ ] **Firebase Configuration**: Ensure production Firebase project is used for build.
- [ ] **Signing/Release**: Configure Android signing key.
- [ ] **Target API**: Target the latest stable Android API level.

## 4. Final QA
- [x] Two-account test (PASS)
- [x] Multi-connection isolation (PASS)
- [x] Offline/slow network handling (PASS)
- [x] Authentication persistence (PASS)
