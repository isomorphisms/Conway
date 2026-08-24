# Third-party and referenced material

`LICENSE` applies only to material that this repository's contributors have authority to license. Third-party dependencies and referenced mathematical works retain their own terms.

## Mathematical references

Books, papers, and other source material discussed or linked by this repository are references, not part of the Android application license grant unless a file explicitly says otherwise. The F-Droid Android build does not require those reference works.

## Edriç-generated shader artifact

`shader/ConwayWallpaper.idric` is the maintained wallpaper shader source. `app/src/main/assets/conway-wallpaper.frag` is the checked-in GLSL ES artifact consumed by Android. Separate CI verifies source/artifact agreement so the F-Droid release build can compile the Android app without downloading a compiler.

## Platform and toolchain

Android SDK/NDK components, Gradle, CMake, native_app_glue, system libraries, and OpenGL ES interfaces are external to this repository and remain under their upstream terms.
