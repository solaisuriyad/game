# Build APK — Verdant Hollow (v9.2)

You now have a real Android project using Capacitor.

## Option 1: Build APK on your PC (Recommended)

### Requirements
- Node.js 18+
- Android Studio installed (includes Android SDK + Java 17)
- `JAVA_HOME` set

### Steps
1. Download latest ZIP:
   `https://github.com/solaisuriyad/game/archive/88783d22b4dd04b6930a2d4b34594901f293208c.zip`
2. Extract, open terminal in folder
3. Install deps:
   ```
   npm install
   ```
4. Sync web assets + Capacitor:
   ```
   npm run cap:sync
   ```
   This copies `index.html`, `vendor/`, `src/` into `www/` and into Android assets.
5. Open Android Studio:
   ```
   npm run cap:open
   ```
   Or open `android/` folder in Android Studio.
6. In Android Studio: Build → Build APK → Debug
   - APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`
   - Copy to phone and install (allow Unknown Sources)

Or build from command line (if SDK setup):
```
npm run build:apk
```

APK details:
- App ID: `com.verdanthollow.game`
- App Name: Verdant Hollow
- Defaults to 3D + mobile joysticks (no need for ?3d=1)
- Single-player works offline
- Multiplayer: enter your server IP in title screen (e.g. `192.168.1.10:3000`)

## Option 2: GitHub Actions auto-build APK (No Android Studio needed)

Because the Arena bot cannot push workflow files, add this file manually on GitHub:

1. Go to your repo on GitHub: `https://github.com/solaisuriyad/game`
2. Switch to branch `arena/019ff9d6-game`
3. Click Add file → Create new file
4. Path: `.github/workflows/android.yml`
5. Paste this:

```yaml
name: Build Android APK

on:
  push:
    branches: [ "arena/019ff9d6-game", "main" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install deps
        run: npm ci || npm install

      - name: Sync www
        run: |
          rm -rf www
          mkdir -p www
          cp -r index.html manifest.json vendor src www/
          echo "www synced"

      - name: Capacitor sync
        run: npx cap sync android

      - name: Build Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: verdant-hollow-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

6. Commit → GitHub Actions will build APK automatically
7. Go to Actions tab → click latest run → download artifact `verdant-hollow-debug-apk` → unzip → `app-debug.apk` → install on phone

## Option 3: Quick PWA install (No APK, but installs like app)

On phone Chrome:
- Open `http://YOUR_IP:3000/?3d=1&mobile=1`
- Menu → Add to Home Screen
- Opens fullscreen, no browser bar, with joysticks

## Troubleshooting
- APK install blocked: Settings → Security → Allow Unknown Sources
- White screen: ensure you ran `npm run sync:www` before build
- Multiplayer not connecting: APK offline uses file://, so WebSocket to localhost fails. Enter your server IP (e.g. `192.168.1.5:3000`) in title screen server box, and make sure phone + PC on same WiFi and firewall allows port 3000
- Performance: mobile build already uses low pixel ratio (0.8-1.0) and reduced cull (1800 entities, 3000 trees)
