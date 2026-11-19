# Strength by Bram

A personal-training app: the coach builds programs and assigns them to clients; clients see their next session, log sets (kg × reps), and track their history.

## Status — Stage 1

- Coach dashboard: add clients, build programs (days, exercises, sets, reps, coaching notes), assign a program to each client, view each client's logged workouts.
- Client view: "Up next" session (cycles through the program days), workout logger with last-session weights pre-filled, finish-workout summary with sets, volume and duration, workout history.
- Data is stored on the device for now (stage 2 moves it online so coach and clients share it).

## Try it on your phone (no computer needed)

1. Install **Expo Go** from the App Store / Play Store.
2. Open this link on your phone or computer:
   [Open in Expo Snack](https://snack.expo.dev/?name=Strength%20by%20Bram&platform=mydevice&dependencies=%40react-native-async-storage%2Fasync-storage%2Creact-native-safe-area-context%2Cexpo-status-bar&sourceUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fstrengthbybram%2FTester%2Fmain%2FApp.js)
3. Choose **My Device** and scan the QR code with your phone camera (iPhone) or Expo Go (Android).

## Run locally

```bash
npm install
npx expo install --fix   # aligns package versions with your Expo SDK
npx expo start           # scan the QR code with Expo Go
```

## Roadmap

1. ~~Programs + workout logging~~ (stage 1)
2. Accounts + online database (Supabase) so each client logs in on their own phone; progress tracking (bodyweight, measurements, PRs, charts)
3. Subscriptions / payments (Stripe)
4. App Store + Google Play release (EAS Build, TestFlight)
