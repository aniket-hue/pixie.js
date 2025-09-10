#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec2 v_size;

uniform vec4 u_fill_color;
uniform vec4 u_stroke_color;
uniform float u_stroke_width; 
uniform int u_selected;

out vec4 outColor;

void main() {
    vec2 pixelSize = 1.0 / v_size;

    float selStroke = 2.0;

    vec2 selBorder = selStroke * pixelSize;
    vec2 strokeBorder = (u_stroke_width + selStroke) * pixelSize;

    vec2 dist = min(v_texCoord, 1.0 - v_texCoord);

    float inSel = step(selBorder.x, dist.x) * step(selBorder.y, dist.y);

    float inStroke = step(strokeBorder.x, dist.x) * step(strokeBorder.y, dist.y);

    if (inSel < 1.0) {
        outColor = (u_selected == 1) ? vec4(0.5, 1.0, 0.5, 1.0) : vec4(0.0);
    } else if (inStroke < 1.0) {
        outColor = u_stroke_color;
    } else {
        outColor = u_fill_color;
    }
}
