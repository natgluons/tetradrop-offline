# APK Wrapper

This project includes an Android wrapper under `android/` that loads the web app from local assets.

## Build steps

1. Run `node copy-web-assets.js` from the project root to copy the PWA files into the Android assets folder.
2. Open the `android/` folder in Android Studio.
3. Build the `app` module to generate an APK.

## Notes

- The wrapper uses a `WebView` to load `index.html` from `android/app/src/main/assets/www/index.html`.
- If you want the wrapped app to behave like a PWA, keep the web app files copied into the assets folder before building.
