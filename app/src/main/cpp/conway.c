#include <android/asset_manager.h>
#include <android/input.h>
#include <android/log.h>
#include <android/native_activity.h>
#include <android_native_app_glue.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl3.h>

#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

#include "gesture.h"

#define LOG_TAG "Conway"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

static const char *VERTEX_SHADER =
    "#version 300 es\n"
    "precision highp float;\n"
    "layout(location = 0) in vec2 a_position;\n"
    "out vec2 v_ndc;\n"
    "void main() {\n"
    "    v_ndc = a_position;\n"
    "    gl_Position = vec4(a_position, 0.0, 1.0);\n"
    "}\n";

struct engine {
    struct android_app *app;
    EGLDisplay display;
    EGLSurface surface;
    EGLContext context;
    int32_t width;
    int32_t height;

    GLuint program;
    GLuint vao;
    GLuint vbo;
    GLint center_location;
    GLint zoom_location;
    GLint angle_location;
    GLint hue_location;
    GLint saturation_location;
    GLint form_location;
    GLint aspect_location;

    struct conway_view view;
    struct conway_sample previous_sample;
    bool has_previous_sample;
    bool dirty;
    bool logged_first_frame;
};

static char *load_asset_text(AAssetManager *manager, const char *name) {
    AAsset *asset = AAssetManager_open(manager, name, AASSET_MODE_BUFFER);
    if (asset == NULL) {
        LOGE("could not open asset %s", name);
        return NULL;
    }

    off64_t length = AAsset_getLength64(asset);
    char *text = malloc((size_t)length + 1u);
    if (text == NULL) {
        AAsset_close(asset);
        return NULL;
    }

    off64_t offset = 0;
    while (offset < length) {
        int amount = AAsset_read(asset, text + offset, (size_t)(length - offset));
        if (amount <= 0) {
            free(text);
            AAsset_close(asset);
            return NULL;
        }
        offset += amount;
    }
    text[length] = '\0';
    AAsset_close(asset);
    return text;
}

static GLuint compile_shader(GLenum type, const char *source) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, NULL);
    glCompileShader(shader);

    GLint compiled = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) return shader;

    GLint length = 0;
    glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    char *log = length > 0 ? malloc((size_t)length) : NULL;
    if (log != NULL) {
        glGetShaderInfoLog(shader, length, NULL, log);
        LOGE("shader compilation failed: %s", log);
        free(log);
    } else {
        LOGE("shader compilation failed");
    }
    glDeleteShader(shader);
    return 0;
}

static GLuint link_program(GLuint vertex_shader, GLuint fragment_shader) {
    GLuint program = glCreateProgram();
    glAttachShader(program, vertex_shader);
    glAttachShader(program, fragment_shader);
    glLinkProgram(program);

    GLint linked = GL_FALSE;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    if (linked == GL_TRUE) return program;

    GLint length = 0;
    glGetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    char *log = length > 0 ? malloc((size_t)length) : NULL;
    if (log != NULL) {
        glGetProgramInfoLog(program, length, NULL, log);
        LOGE("program link failed: %s", log);
        free(log);
    } else {
        LOGE("program link failed");
    }
    glDeleteProgram(program);
    return 0;
}

static bool create_renderer(struct engine *engine) {
    static const GLfloat fullscreen_triangle[] = {
        -1.0f, -1.0f,
         3.0f, -1.0f,
        -1.0f,  3.0f
    };

    char *fragment_source = load_asset_text(
        engine->app->activity->assetManager,
        "conway-wallpaper.frag"
    );
    if (fragment_source == NULL) return false;

    GLuint vertex_shader = compile_shader(GL_VERTEX_SHADER, VERTEX_SHADER);
    GLuint fragment_shader = compile_shader(GL_FRAGMENT_SHADER, fragment_source);
    free(fragment_source);

    if (vertex_shader == 0 || fragment_shader == 0) {
        if (vertex_shader != 0) glDeleteShader(vertex_shader);
        if (fragment_shader != 0) glDeleteShader(fragment_shader);
        return false;
    }

    engine->program = link_program(vertex_shader, fragment_shader);
    glDeleteShader(vertex_shader);
    glDeleteShader(fragment_shader);
    if (engine->program == 0) return false;

    engine->center_location = glGetUniformLocation(engine->program, "u_center");
    engine->zoom_location = glGetUniformLocation(engine->program, "u_zoom");
    engine->angle_location = glGetUniformLocation(engine->program, "u_angle");
    engine->hue_location = glGetUniformLocation(engine->program, "u_hue");
    engine->saturation_location = glGetUniformLocation(engine->program, "u_saturation");
    engine->form_location = glGetUniformLocation(engine->program, "u_form");
    engine->aspect_location = glGetUniformLocation(engine->program, "u_aspect");

    glGenVertexArrays(1, &engine->vao);
    glBindVertexArray(engine->vao);
    glGenBuffers(1, &engine->vbo);
    glBindBuffer(GL_ARRAY_BUFFER, engine->vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(fullscreen_triangle), fullscreen_triangle, GL_STATIC_DRAW);
    glVertexAttribPointer(
        0,
        2,
        GL_FLOAT,
        GL_FALSE,
        2 * (GLsizei)sizeof(GLfloat),
        (const void *)0
    );
    glEnableVertexAttribArray(0);

    glDisable(GL_DEPTH_TEST);
    glDisable(GL_CULL_FACE);

    LOGI("renderer ready: GL_VERSION=%s GL_RENDERER=%s", glGetString(GL_VERSION), glGetString(GL_RENDERER));
    return true;
}

static bool initialize_display(struct engine *engine) {
    if (engine->app->window == NULL) return false;

    const EGLint config_attributes[] = {
        EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT_KHR,
        EGL_RED_SIZE, 8,
        EGL_GREEN_SIZE, 8,
        EGL_BLUE_SIZE, 8,
        EGL_ALPHA_SIZE, 8,
        EGL_NONE
    };
    const EGLint context_attributes[] = {
        EGL_CONTEXT_CLIENT_VERSION, 3,
        EGL_NONE
    };

    EGLDisplay display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (display == EGL_NO_DISPLAY || !eglInitialize(display, NULL, NULL)) {
        LOGE("eglInitialize failed: 0x%x", eglGetError());
        return false;
    }

    EGLConfig config = NULL;
    EGLint config_count = 0;
    if (!eglChooseConfig(display, config_attributes, &config, 1, &config_count) || config_count != 1) {
        LOGE("could not choose GLES3 EGL config: 0x%x", eglGetError());
        eglTerminate(display);
        return false;
    }

    EGLint format = 0;
    eglGetConfigAttrib(display, config, EGL_NATIVE_VISUAL_ID, &format);
    ANativeWindow_setBuffersGeometry(engine->app->window, 0, 0, format);

    EGLSurface surface = eglCreateWindowSurface(display, config, engine->app->window, NULL);
    EGLContext context = eglCreateContext(display, config, EGL_NO_CONTEXT, context_attributes);
    if (surface == EGL_NO_SURFACE || context == EGL_NO_CONTEXT) {
        LOGE("could not create EGL surface/context: 0x%x", eglGetError());
        if (surface != EGL_NO_SURFACE) eglDestroySurface(display, surface);
        if (context != EGL_NO_CONTEXT) eglDestroyContext(display, context);
        eglTerminate(display);
        return false;
    }

    if (!eglMakeCurrent(display, surface, surface, context)) {
        LOGE("eglMakeCurrent failed: 0x%x", eglGetError());
        eglDestroyContext(display, context);
        eglDestroySurface(display, surface);
        eglTerminate(display);
        return false;
    }

    engine->display = display;
    engine->surface = surface;
    engine->context = context;
    eglQuerySurface(display, surface, EGL_WIDTH, &engine->width);
    eglQuerySurface(display, surface, EGL_HEIGHT, &engine->height);

    if (!create_renderer(engine)) {
        eglMakeCurrent(display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
        eglDestroyContext(display, context);
        eglDestroySurface(display, surface);
        eglTerminate(display);
        engine->display = EGL_NO_DISPLAY;
        engine->surface = EGL_NO_SURFACE;
        engine->context = EGL_NO_CONTEXT;
        return false;
    }

    glViewport(0, 0, engine->width, engine->height);
    engine->dirty = true;
    return true;
}

static void terminate_display(struct engine *engine) {
    if (engine->display == EGL_NO_DISPLAY) return;

    if (engine->vbo != 0) glDeleteBuffers(1, &engine->vbo);
    if (engine->vao != 0) glDeleteVertexArrays(1, &engine->vao);
    if (engine->program != 0) glDeleteProgram(engine->program);

    eglMakeCurrent(engine->display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
    if (engine->context != EGL_NO_CONTEXT) eglDestroyContext(engine->display, engine->context);
    if (engine->surface != EGL_NO_SURFACE) eglDestroySurface(engine->display, engine->surface);
    eglTerminate(engine->display);

    engine->display = EGL_NO_DISPLAY;
    engine->surface = EGL_NO_SURFACE;
    engine->context = EGL_NO_CONTEXT;
    engine->program = 0;
    engine->vao = 0;
    engine->vbo = 0;
}

static void update_surface_size(struct engine *engine) {
    if (engine->display == EGL_NO_DISPLAY || engine->surface == EGL_NO_SURFACE) return;
    eglQuerySurface(engine->display, engine->surface, EGL_WIDTH, &engine->width);
    eglQuerySurface(engine->display, engine->surface, EGL_HEIGHT, &engine->height);
    glViewport(0, 0, engine->width, engine->height);
    engine->dirty = true;
}

static void draw_frame(struct engine *engine) {
    if (
        engine->display == EGL_NO_DISPLAY ||
        engine->program == 0 ||
        engine->width <= 0 ||
        engine->height <= 0
    ) {
        return;
    }

    float aspect = (float)engine->width / (float)engine->height;
    glUseProgram(engine->program);
    glUniform2f(engine->center_location, engine->view.center_x, engine->view.center_y);
    glUniform1f(engine->zoom_location, engine->view.zoom);
    glUniform1f(engine->angle_location, engine->view.angle);
    glUniform1f(engine->hue_location, engine->view.hue);
    glUniform1f(engine->saturation_location, engine->view.saturation);
    glUniform2f(engine->form_location, engine->view.form_x, engine->view.form_y);
    glUniform1f(engine->aspect_location, aspect);

    glBindVertexArray(engine->vao);
    glDrawArrays(GL_TRIANGLES, 0, 3);

    if (!engine->logged_first_frame) {
        GLubyte pixel[4] = {0, 0, 0, 0};
        glReadPixels(engine->width / 2, engine->height / 2, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel);
        LOGI("first frame: rgba=%u,%u,%u,%u glError=0x%x", pixel[0], pixel[1], pixel[2], pixel[3], glGetError());
        engine->logged_first_frame = true;
    }

    if (!eglSwapBuffers(engine->display, engine->surface)) {
        LOGE("eglSwapBuffers failed: 0x%x", eglGetError());
    }
    engine->dirty = false;
}

static void sample_from_event(
    const AInputEvent *event,
    int skip_index,
    struct conway_sample *sample
) {
    sample->count = 0;
    size_t pointer_count = AMotionEvent_getPointerCount(event);
    for (size_t i = 0; i < pointer_count && sample->count < CONWAY_MAX_POINTERS; ++i) {
        if ((int)i == skip_index) continue;
        size_t out = sample->count++;
        sample->pointers[out].id = AMotionEvent_getPointerId(event, i);
        sample->pointers[out].x = AMotionEvent_getX(event, i);
        sample->pointers[out].y = AMotionEvent_getY(event, i);
    }
}

static int32_t handle_input(struct android_app *app, AInputEvent *event) {
    struct engine *engine = app->userData;
    if (AInputEvent_getType(event) != AINPUT_EVENT_TYPE_MOTION) return 0;

    int32_t action = AMotionEvent_getAction(event);
    int32_t masked_action = action & AMOTION_EVENT_ACTION_MASK;

    switch (masked_action) {
        case AMOTION_EVENT_ACTION_DOWN:
        case AMOTION_EVENT_ACTION_POINTER_DOWN:
            sample_from_event(event, -1, &engine->previous_sample);
            engine->has_previous_sample = engine->previous_sample.count > 0;
            return 1;

        case AMOTION_EVENT_ACTION_MOVE: {
            struct conway_sample current = {0};
            sample_from_event(event, -1, &current);
            if (engine->has_previous_sample) {
                conway_apply_motion(
                    &engine->view,
                    &engine->previous_sample,
                    &current,
                    (float)engine->width,
                    (float)engine->height
                );
                engine->dirty = true;
            }
            engine->previous_sample = current;
            engine->has_previous_sample = current.count > 0;
            return 1;
        }

        case AMOTION_EVENT_ACTION_POINTER_UP: {
            int pointer_index = (action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK)
                >> AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT;
            sample_from_event(event, pointer_index, &engine->previous_sample);
            engine->has_previous_sample = engine->previous_sample.count > 0;
            return 1;
        }

        case AMOTION_EVENT_ACTION_UP:
        case AMOTION_EVENT_ACTION_CANCEL:
            engine->has_previous_sample = false;
            engine->previous_sample.count = 0;
            return 1;

        default:
            return 0;
    }
}

static void handle_command(struct android_app *app, int32_t command) {
    struct engine *engine = app->userData;

    switch (command) {
        case APP_CMD_INIT_WINDOW:
            if (app->window != NULL && engine->display == EGL_NO_DISPLAY) {
                initialize_display(engine);
            }
            break;
        case APP_CMD_TERM_WINDOW:
            terminate_display(engine);
            break;
        case APP_CMD_WINDOW_RESIZED:
        case APP_CMD_CONTENT_RECT_CHANGED:
        case APP_CMD_CONFIG_CHANGED:
            update_surface_size(engine);
            break;
        case APP_CMD_GAINED_FOCUS:
            engine->dirty = true;
            break;
        default:
            break;
    }
}

void android_main(struct android_app *app) {
    struct engine engine = {
        .app = app,
        .display = EGL_NO_DISPLAY,
        .surface = EGL_NO_SURFACE,
        .context = EGL_NO_CONTEXT,
        .dirty = true,
        .logged_first_frame = false,
        .has_previous_sample = false
    };
    conway_view_reset(&engine.view);

    app->userData = &engine;
    app->onAppCmd = handle_command;
    app->onInputEvent = handle_input;

    while (true) {
        int events = 0;
        struct android_poll_source *source = NULL;
        int timeout = engine.dirty && engine.display != EGL_NO_DISPLAY ? 0 : -1;
        int ident = ALooper_pollOnce(timeout, NULL, &events, (void **)&source);

        if (ident >= 0 && source != NULL) source->process(app, source);

        if (app->destroyRequested != 0) {
            terminate_display(&engine);
            return;
        }

        if (engine.dirty) draw_frame(&engine);
    }
}
