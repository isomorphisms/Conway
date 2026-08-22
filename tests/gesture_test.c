#include <assert.h>
#include <math.h>
#include <stdio.h>

#include "gesture.h"

static int near(float a, float b, float epsilon) {
    return fabsf(a - b) <= epsilon;
}

static struct conway_sample sample1(int id, float x, float y) {
    struct conway_sample s = {0};
    s.count = 1;
    s.pointers[0] = (struct conway_pointer){id, x, y};
    return s;
}

static struct conway_sample sample2(
    int id0, float x0, float y0,
    int id1, float x1, float y1
) {
    struct conway_sample s = {0};
    s.count = 2;
    s.pointers[0] = (struct conway_pointer){id0, x0, y0};
    s.pointers[1] = (struct conway_pointer){id1, x1, y1};
    return s;
}

static struct conway_sample sample3(
    float ax, float ay,
    float bx, float by,
    float cx, float cy
) {
    struct conway_sample s = {0};
    s.count = 3;
    s.pointers[0] = (struct conway_pointer){10, ax, ay};
    s.pointers[1] = (struct conway_pointer){11, bx, by};
    s.pointers[2] = (struct conway_pointer){12, cx, cy};
    return s;
}

int main(void) {
    struct conway_view view;
    conway_view_reset(&view);

    struct conway_sample one_old = sample1(7, 100.0f, 100.0f);
    struct conway_sample one_new = sample1(7, 120.0f, 90.0f);
    conway_apply_motion(&view, &one_old, &one_new, 720.0f, 1280.0f);
    assert(view.center_x < 0.0f);
    assert(view.center_y < 0.0f);

    conway_view_reset(&view);
    struct conway_sample two_old = sample2(1, 100.0f, 200.0f, 2, 200.0f, 200.0f);
    struct conway_sample two_new = sample2(1, 80.0f, 220.0f, 2, 240.0f, 220.0f);
    conway_apply_motion(&view, &two_old, &two_new, 720.0f, 1280.0f);
    assert(near(view.zoom, 1.6f, 0.001f));
    assert(view.hue > 0.08f);
    assert(view.saturation < 0.82f);

    conway_view_reset(&view);
    struct conway_sample rotate_old = sample2(1, 100.0f, 100.0f, 2, 200.0f, 100.0f);
    struct conway_sample rotate_new = sample2(1, 150.0f, 50.0f, 2, 150.0f, 150.0f);
    conway_apply_motion(&view, &rotate_old, &rotate_new, 720.0f, 1280.0f);
    assert(near(view.angle, 1.5707963f, 0.001f));

    conway_view_reset(&view);
    struct conway_sample three_old = sample3(100,100, 200,100, 150,200);
    struct conway_sample three_new = sample3(172,228, 272,228, 222,328);
    conway_apply_motion(&view, &three_old, &three_new, 720.0f, 1280.0f);
    assert(near(view.form_x, 0.6f, 0.001f));
    assert(near(view.form_y, 0.4f, 0.001f));

    puts("gesture tests passed");
    return 0;
}
