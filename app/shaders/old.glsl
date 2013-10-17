precision highp float;

varying vec2 v_uv;
uniform sampler2D u_tex0;

uniform vec2 u_lensCenter;
uniform vec2 u_screenCenter;
uniform vec2 u_scale;
uniform vec4 u_hmdWarpParam;
uniform vec4 u_chromAbParam;

void main() {
    // move clip space to texture space
    vec2 theta = v_uv - u_lensCenter;
    float rSq = theta.x * theta.x + theta.y * theta.y;
    vec2 theta1 = theta * (u_hmdWarpParam.x + u_hmdWarpParam.y * rSq +
                  u_hmdWarpParam.z * rSq * rSq +
                  u_hmdWarpParam.w * rSq * rSq * rSq);

    vec2 thetaBlue = theta1 * (u_chromAbParam.z + u_chromAbParam.w * rSq);
    vec2 tcBlue = u_lensCenter + u_scale * thetaBlue;

    if (any(notEqual(clamp(tcBlue, u_screenCenter - vec2(1, 1),
        u_screenCenter + vec2(1, 1)) - tcBlue, vec2(0.0, 0.0)))) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    vec2 tcGreen = u_lensCenter + u_scale * theta1;
    vec2 thetaRed = theta1 * (u_chromAbParam.x + u_chromAbParam.y * rSq);
    vec2 tcRed = u_lensCenter + u_scale * thetaRed;

    gl_FragColor = vec4(
            texture2D(u_tex0, (tcRed + 1.0) / 2.0).r,
            texture2D(u_tex0, (tcGreen + 1.0) / 2.0).g,
            texture2D(u_tex0, (tcBlue + 1.0) / 2.0).b,
            texture2D(u_tex0, (tcGreen + 1.0) / 2.0).a);

    //gl_FragColor = vec4(
    //    texture2D(u_tex0, (tcRed + vec2(1, 0.6)) / 2.0 * vec2(1, 1.6)).r,
    //    texture2D(u_tex0, (tcGreen + vec2(1, 0.6)) / 2.0 * vec2(1, 1.6)).g,
    //    texture2D(u_tex0, (tcBlue + vec2(1, 0.6)) / 2.0 * vec2(1, 1.6)).b,
    //    texture2D(u_tex0, (tcGreen + vec2(1, 0.6)) / 2.0 * vec2(1, 1.6)).a);
}