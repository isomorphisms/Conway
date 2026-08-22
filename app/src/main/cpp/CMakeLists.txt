cmake_minimum_required(VERSION 3.22.1)
project(conway LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(NATIVE_APP_GLUE "${ANDROID_NDK}/sources/android/native_app_glue")

add_library(
    conway
    SHARED
    conway.c
    "${NATIVE_APP_GLUE}/android_native_app_glue.c"
)

target_include_directories(conway PRIVATE "${NATIVE_APP_GLUE}")
target_link_libraries(conway android EGL GLESv3 log)
