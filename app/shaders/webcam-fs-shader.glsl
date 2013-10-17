precision highp float;

varying vec2 v_uv;
uniform sampler2D u_tex0;

uniform vec2 u_lensCenter;
uniform vec2 u_screenCenter;
uniform vec2 u_scale;
uniform vec2 u_scaleIn;
uniform vec4 u_hmdWarpParam;
uniform vec4 u_chromAbParam;

uniform float u_offset;
uniform float u_video_aspect;

void main() {
    vec2 theta = (v_uv - u_lensCenter) * u_scaleIn; // Scales to [-1, 1]

    float rSq = theta.x * theta.x + theta.y * theta.y;
    vec2 theta1 = theta * (u_hmdWarpParam.x + u_hmdWarpParam.y * rSq +
                           u_hmdWarpParam.z * rSq * rSq +
                           u_hmdWarpParam.w * rSq * rSq * rSq);

    vec2 thetaBlue = theta1 * (u_chromAbParam.z + u_chromAbParam.w * rSq);
    vec2 tcBlue = u_lensCenter + u_scale * thetaBlue;
    if (any(notEqual(clamp(tcBlue, u_screenCenter - vec2(0.25, 0.5),
        u_screenCenter + vec2(0.25, 0.5)) - tcBlue, vec2(0.0, 0.0)))) {
        gl_FragColor = vec4(0.5, 0.5, 0.5, 1);
        return;
    }

    vec2 tcGreen = u_lensCenter + u_scale * theta1;
    vec2 thetaRed = theta1 * (u_chromAbParam.x + u_chromAbParam.y * rSq);
    vec2 tcRed = u_lensCenter + u_scale * thetaRed;
    gl_FragColor = vec4(
        texture2D(u_tex0, tcRed * vec2(2.0, 2.0 * u_video_aspect) - vec2(u_offset, u_video_aspect - 0.5)).r,
        texture2D(u_tex0, tcGreen * vec2(2.0, 2.0 * u_video_aspect) - vec2(u_offset, u_video_aspect - 0.5)).g,
        texture2D(u_tex0, tcBlue * vec2(2.0, 2.0 * u_video_aspect) - vec2(u_offset, u_video_aspect - 0.5)).b,
        texture2D(u_tex0, tcGreen * vec2(2.0, 2.0 * u_video_aspect) - vec2(u_offset, u_video_aspect - 0.5)).a);
}