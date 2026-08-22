# Conway Android wallpaper prototype

This is the first phone-sized Conway renderer: one infinite `*442`-style square wallpaper and no wallpaper picker.

## Touch vocabulary

- one finger: pan across the infinite wallpaper
- two fingers, separation: zoom
- two fingers, relative angle: rotate
- two fingers, common translation: change color (horizontal hue, vertical saturation)
- three or more fingers, common translation: deform the motif while preserving the square wallpaper symmetry

The gesture state uses C `float` throughout the Android host.

## Renderer path

`shader/ConwayWallpaper.idric` is the source of the fragment program. CI builds `isomorphisms/idris-shader-backend`, which lowers the checked numerical program to GLSL ES 3.00. The Android NativeActivity loads that generated shader and passes only float uniforms for view, color, and form.

CI first builds the shader backend against `isomorphisms/Idric` so `.idric` is accepted by the Edriç front end. If that API integration fails, CI records the fallback and builds the same source as ordinary `.idr`; the Android APK still uses generated GLSL rather than a handwritten wallpaper shader.

The present Idris shader API spells its scalar input type `Double`, but the GLSL backend emits `float`. The Android host and GLES uniforms are 32-bit floats.

`edric/Touch.idric` records the intended Edriç gesture algebra. The bootstrap Android host mirrors it in C because Idris 2/Edriç currently does not provide a C-host `%export` path for these functions.
