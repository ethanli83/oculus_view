attribute vec2 a_xy;
attribute vec2 a_uv;
varying vec2 v_uv;
uniform mat4 u_texMatrix;
void main() {
    gl_Position = vec4(2.0 * a_xy - 1.0, 0.0, 1.0);
    v_uv = (u_texMatrix * vec4(a_uv, 0.0, 1.0)).xy;
}