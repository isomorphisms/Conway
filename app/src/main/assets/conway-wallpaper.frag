#version 300 es
precision highp float;
precision highp int;

in vec2 v_ndc;
uniform vec2 u_pan;
uniform float u_aspect;
layout(location = 0) out vec4 _idris_fragColor;

void main() {
    vec2 world = vec2(v_ndc.x * u_aspect, v_ndc.y) * 2.0 + u_pan;
    vec2 cell = fract(world);
    vec2 delta = cell - vec2(0.5);
    float radius = length(delta);
    float disc = 1.0 - step(0.34, radius);
    float diagonal = 0.5 + 0.5 * sin((world.x + world.y) * 3.14159265359);

    float r = 0.08 + disc * (0.72 + 0.12 * diagonal);
    float g = 0.12 + disc * (0.32 + 0.10 * diagonal);
    float b = 0.20 + (1.0 - disc) * (0.34 + 0.10 * diagonal);
    _idris_fragColor = vec4(r, g, b, 1.0);
}
