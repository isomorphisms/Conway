#ifndef CONWAY_GESTURE_H
#define CONWAY_GESTURE_H

#include <stddef.h>

#define CONWAY_MAX_POINTERS 8

struct conway_pointer {
    int id;
    float x;
    float y;
};

struct conway_sample {
    size_t count;
    struct conway_pointer pointers[CONWAY_MAX_POINTERS];
};

struct conway_view {
    float center_x;
    float center_y;
    float zoom;
    float angle;
    float hue;
    float saturation;
    float form_x;
    float form_y;
};

void conway_view_reset(struct conway_view *view);
void conway_apply_motion(
    struct conway_view *view,
    const struct conway_sample *previous,
    const struct conway_sample *current,
    float width,
    float height
);

#endif
