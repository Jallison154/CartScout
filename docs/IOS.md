# Getting the CartScout app running on iOS

You can run the app on the **iOS Simulator** (no device needed) or on a **physical iPhone**. Two ways to run it:

---

## Option A: Expo Go (fastest – recommended for testing)

Uses the **Expo Go** app in the simulator. No native build, no Xcode project to maintain.

### 1. Prerequisites (Mac only)

- **Node.js 18+**  
  `node -v`  
  Install from [nodejs.org](https://nodejs.org) or with `nvm`.

- **Xcode** (from the Mac App Store)  
  Needed for the iOS Simulator. After installing:
  - Open **Xcode** once and accept the license.
  - Ensure **Command Line Tools** are set:  
    **Xcode → Settings → Locations → Command Line Tools** = your Xcode version.

### 2. Install dependencies

From the **project root** (CartScout folder):

```bash
npm install
```

### 3. Start the app (with mock API – no server)

```bash
npm run test:app
```

Or, to use the real API later:

```bash
npm run mobile
```

### 4. Open on the iOS Simulator

When the Expo dev server is running:

- Press **`i`** in the terminal to open the app in the **iOS Simulator**.

The first time you press **`i`**, Expo will boot a simulator and install **Expo Go** on it if needed, then load your app. After that, the app runs in the simulator like on a phone.

### 5. If the simulator doesn’t open

- **List simulators:**  
  `xcrun simctl list devices`  
  Pick an available iPhone (e.g. iPhone 16).

- **Start a specific simulator:**  
  `open -a Simulator`  
  Then in Expo’s terminal press **`i`** again.

- **Expo Go not installed in simulator:**  
  Press **`i`** again; Expo usually installs it. Or install Expo Go from the App Store in the simulator (same Apple ID as your Mac).

---

## Option B: Development build (native iOS app)

Builds a **standalone iOS app** (no Expo Go). Use this if you need custom native code or want to test a build that’s closer to the App Store.

### 1. Do steps 1–2 from Option A

(Prerequisites + `npm install`.)

### 2. Install CocoaPods (if not already)

```bash
sudo gem install cocoapods
```

Or with Homebrew:  
`brew install cocoapods`

### 3. Run the app on the simulator

From the **project root**:

```bash
cd apps/mobile
npx expo run:ios
```

The first run will:

- Create the native `ios/` project (if it doesn’t exist).
- Run `pod install`.
- Build the app and open it in the iOS Simulator.

This can take several minutes the first time. Later runs are faster.

### 4. Run on a physical iPhone

1. Connect the iPhone with USB.
2. In Xcode, open `apps/mobile/ios/CartScout.xcworkspace` (or the generated `.xcworkspace`).
3. Select your iPhone as the run destination.
4. In **Signing & Capabilities**, choose your **Team** (Apple ID).
5. Build and run (▶️).

Or from the command line after `expo run:ios` has generated the project:

```bash
cd apps/mobile
npx expo run:ios --device
```

Pick your device when prompted.

---

## Quick reference

| Goal                         | Command              | Notes                          |
|-----------------------------|----------------------|--------------------------------|
| Test app, no server         | `npm run test:app`   | Mock API; then press **`i`**   |
| Test app with real API      | `npm run mobile`     | Set `EXPO_PUBLIC_API_URL`      |
| Open iOS Simulator (Expo)   | Press **`i`**       | While Expo dev server is running |
| Native build in simulator   | `cd apps/mobile && npx expo run:ios` | First time: slow      |
| Native build on device     | `cd apps/mobile && npx expo run:ios --device` | Requires Apple ID / signing |

---

## Troubleshooting

### “No iOS devices available in Simulator.app”

This means no **iOS Simulator runtimes** are installed. Install at least one:

1. **Open Xcode** (from the Mac App Store or Applications).
2. Go to **Xcode → Settings** (or **Preferences** on older Xcode) → **Platforms** (or **Components** on older Xcode).
3. Click the **+** or **Get** button and choose an **iOS** version (e.g. **iOS 18.0** or **iOS 17.x**).
4. Wait for the download and installation to finish (can be several GB).
5. Quit Xcode, then in Terminal run:
   ```bash
   xcrun simctl list devices available
   ```
   You should see at least one iPhone (e.g. iPhone 16, iPhone 15).
6. Start the Expo app again and press **`i`** to launch the simulator.

If **Platforms** is empty or the download fails, try **Window → Devices and Simulators → Simulators**, then the **+** at the bottom to add a simulator and pick an OS version to download.

---

- **“Expo Go” or “Unable to connect”**  
  Simulator and Mac must be on the same network. For simulator, the dev server URL is usually correct by default. Restart the dev server and try **`i`** again.

- **“No simulators found”**  
  Same as above: install a simulator runtime via **Xcode → Settings → Platforms** (or **Window → Devices and Simulators**).

- **Build errors with `expo run:ios`**  
  Try:  
  `cd apps/mobile && npx expo prebuild --clean`  
  then  
  `npx expo run:ios`  
  again.

- **App shows “Using mock API”**  
  That’s expected when you use `npm run test:app` or have `EXPO_PUBLIC_USE_MOCK_API=true`. To use the real API, run `npm run mobile` and set `EXPO_PUBLIC_API_URL` to your server.
