# Android prototype

This directory builds the smallest useful phone experiment:

- one bundled periodic wallpaper
- GLES 3 fullscreen rendering
- one-finger drag to pan through the wallpaper
- two `float` values for pan state
- wallpaper source in `wallpapers/ConwayWallpaper.idric`

There is deliberately no pinch, rotation, color gesture, form deformation, wallpaper picker, or Android live-wallpaper service in this APK.

The build down-compiles the `.idric` source to GLSL ES and packages the generated fragment shader as an Android asset. The build fails if that Edric path fails.

CI installs the debug APK in a phone-sized emulator, captures a frame, performs a one-finger swipe, captures another frame, and requires the rendered image to change.

Run Gradle from the repository root with `gradle -p boilerplate/android :app:assembleDebug`.
