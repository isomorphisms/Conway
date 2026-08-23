#version 300 es
precision highp float;
precision highp int;

in vec2 v_ndc;
uniform vec2 u_pan;
uniform float u_aspect;
layout(location = 0) out vec4 _idris_fragColor;

void main() {
  float _idris_t0 = v_ndc.x;
  float _idris_t1 = (_idris_t0 * u_aspect);
  float _idris_t2 = (_idris_t1 * 2.0);
  float _idris_t3 = u_pan.x;
  float _idris_t4 = (_idris_t2 + _idris_t3);
  float _idris_t5 = v_ndc.y;
  float _idris_t6 = (_idris_t5 * 2.0);
  float _idris_t7 = u_pan.y;
  float _idris_t8 = (_idris_t6 + _idris_t7);
  float _idris_t9 = fract(_idris_t4);
  float _idris_t10 = (_idris_t9 - 0.5);
  float _idris_t11 = fract(_idris_t8);
  float _idris_t12 = (_idris_t11 - 0.5);
  float _idris_t13 = (_idris_t10 * _idris_t10);
  float _idris_t14 = (_idris_t12 * _idris_t12);
  float _idris_t15 = (_idris_t13 + _idris_t14);
  float _idris_t16 = sqrt(_idris_t15);
  bool _idris_t17 = (_idris_t16 < 0.34);
  float _idris_t18 = (_idris_t17 ? 1.0 : 0.0);
  float _idris_t19 = (_idris_t4 + _idris_t8);
  float _idris_t20 = (_idris_t19 * 3.14159265359);
  float _idris_t21 = sin(_idris_t20);
  float _idris_t22 = (0.5 * _idris_t21);
  float _idris_t23 = (0.5 + _idris_t22);
  float _idris_t24 = (0.12 * _idris_t23);
  float _idris_t25 = (0.72 + _idris_t24);
  float _idris_t26 = (_idris_t18 * _idris_t25);
  float _idris_t27 = (0.08 + _idris_t26);
  float _idris_t28 = (0.1 * _idris_t23);
  float _idris_t29 = (0.32 + _idris_t28);
  float _idris_t30 = (_idris_t18 * _idris_t29);
  float _idris_t31 = (0.12 + _idris_t30);
  float _idris_t32 = (1.0 - _idris_t18);
  float _idris_t34 = (0.34 + _idris_t28);
  float _idris_t35 = (_idris_t32 * _idris_t34);
  float _idris_t36 = (0.2 + _idris_t35);
  vec4 _idris_t37 = vec4(_idris_t27, _idris_t31, _idris_t36, 1.0);
  _idris_fragColor = _idris_t37;
}
