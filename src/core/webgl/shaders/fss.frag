#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec2 v_size;
in float v_zoom_level;
in vec4 v_fill_color;
in vec4 v_stroke_color;
in float v_stroke_width;
in float v_selected;

out vec4 outColor;

void main() {
    vec2 pixelSize = 1.0 / v_size;

    float selStroke = 2.0;

    vec2 selBorder = selStroke * pixelSize;
    vec2 strokeBorder = (v_stroke_width + selStroke) * pixelSize;

    vec2 dist = min(v_texCoord, 1.0 - v_texCoord);

    float inSel = step(selBorder.x, dist.x) * step(selBorder.y, dist.y);

    float inStroke = step(strokeBorder.x, dist.x) * step(strokeBorder.y, dist.y);

    if (inSel < 1.0) {
        outColor = (v_selected > 0.5) ? vec4(0.5, 1.0, 0.5, 1.0) : vec4(0.0);
    } else if (inStroke < 1.0) {
        outColor = v_stroke_color;
    } else {
        outColor = v_fill_color;
    }
}