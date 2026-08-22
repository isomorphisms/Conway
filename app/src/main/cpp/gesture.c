#include "gesture.h"

#include <math.h>

#define PI_F 3.14159265358979323846f
#define TWO_PI_F 6.28318530717958647692f

static float clampf(float value, float low, float high) {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

static float wrap01(float value) {
    value = fmodf(value, 1.0f);
    if (value < 0.0f) value += 1.0f;
    return value;
}

static const struct conway_pointer *pointer_with_id(
    const struct conway_sample *sample,
    int id
) {
    for (size_t i = 0; i < sample->count; ++i) {
        if (sample->pointers[i].id == id) return &sample->pointers[i];
    }
    return NULL;
}

static int same_pointer_set(
    const struct conway_sample *a,
    const struct conway_sample *b
) {
    if (a->count != b->count) return 0;
    for (size_t i = 0; i < a->count; ++i) {
        if (pointer_with_id(b, a->pointers[i].id) == NULL) return 0;
    }
    return 1;
}

static void centroid(
    const struct conway_sample *sample,
    float *x,
    float *y
) {
    float sum_x = 0.0f;
    float sum_y = 0.0f;
    for (size_t i = 0; i < sample->count; ++i) {
        sum_x += sample->pointers[i].x;
        sum_y += sample->pointers[i].y;
    }
    float count = sample->count > 0 ? (float)sample->count : 1.0f;
    *x = sum_x / count;
    *y = sum_y / count;
}

static float pointer_distance(
    const struct conway_pointer *a,
    const struct conway_pointer *b
) {
    return hypotf(b->x - a->x, b->y - a->y);
}

static float pointer_angle(
    const struct conway_pointer *a,
    const struct conway_pointer *b
) {
    return atan2f(b->y - a->y, b->x - a->x);
}

static float angle_delta(float current, float previous) {
    float delta = current - previous;
    while (delta > PI_F) delta -= TWO_PI_F;
    while (delta < -PI_F) delta += TWO_PI_F;
    return delta;
}

void conway_view_reset(struct conway_view *view) {
    view->center_x = 0.0f;
    view->center_y = 0.0f;
    view->zoom = 1.0f;
    view->angle = 0.0f;
    view->hue = 0.08f;
    view->saturation = 0.82f;
    view->form_x = 0.5f;
    view->form_y = 0.5f;
}

void conway_apply_motion(
    struct conway_view *view,
    const struct conway_sample *previous,
    const struct conway_sample *current,
    float width,
    float height
) {
    if (
        view == NULL || previous == NULL || current == NULL ||
        width <= 0.0f || height <= 0.0f ||
        current->count == 0 || current->count > CONWAY_MAX_POINTERS ||
        !same_pointer_set(previous, current)
    ) {
        return;
    }

    if (current->count == 1) {
        const struct conway_pointer *old_pointer = &previous->pointers[0];
        const struct conway_pointer *new_pointer = pointer_with_id(current, old_pointer->id);
        if (new_pointer == NULL) return;

        float dx = new_pointer->x - old_pointer->x;
        float dy = new_pointer->y - old_pointer->y;
        float aspect = width / height;
        view->center_x -= 2.0f * dx * aspect / (height * view->zoom);
        view->center_y += 2.0f * dy / (height * view->zoom);
        return;
    }

    if (current->count == 2) {
        const struct conway_pointer *old_a = &previous->pointers[0];
        const struct conway_pointer *old_b = &previous->pointers[1];
        const struct conway_pointer *new_a = pointer_with_id(current, old_a->id);
        const struct conway_pointer *new_b = pointer_with_id(current, old_b->id);
        if (new_a == NULL || new_b == NULL) return;

        float old_distance = pointer_distance(old_a, old_b);
        float new_distance = pointer_distance(new_a, new_b);
        if (old_distance > 1.0f && new_distance > 1.0f) {
            view->zoom = clampf(
                view->zoom * (new_distance / old_distance),
                0.08f,
                80.0f
            );
        }

        view->angle += angle_delta(
            pointer_angle(new_a, new_b),
            pointer_angle(old_a, old_b)
        );

        float old_x = 0.0f;
        float old_y = 0.0f;
        float new_x = 0.0f;
        float new_y = 0.0f;
        centroid(previous, &old_x, &old_y);
        centroid(current, &new_x, &new_y);
        view->hue = wrap01(view->hue + (new_x - old_x) / width);
        view->saturation = clampf(
            view->saturation - (new_y - old_y) / height,
            0.0f,
            1.0f
        );
        return;
    }

    float old_x = 0.0f;
    float old_y = 0.0f;
    float new_x = 0.0f;
    float new_y = 0.0f;
    centroid(previous, &old_x, &old_y);
    centroid(current, &new_x, &new_y);
    view->form_x = clampf(view->form_x + (new_x - old_x) / width, 0.0f, 1.0f);
    view->form_y = clampf(view->form_y - (new_y - old_y) / height, 0.0f, 1.0f);
}
