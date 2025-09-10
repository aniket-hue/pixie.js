#version 300 es

precision mediump float;

in vec2 v_texCoord; 
in vec2 v_size;

out vec4 outColor;

uniform vec4 u_stroke_color;
uniform vec4 u_color;
uniform float u_stroke_width;
uniform bool u_selected;

void main() {
    float one_pixel_width = 1.0 / v_size.x;
    float one_pixel_height = 1.0 / v_size.y;

    float border_width_x = one_pixel_width * u_stroke_width;
    float border_width_y = one_pixel_height * u_stroke_width;

    bool is_in_x = v_texCoord.x > border_width_x && v_texCoord.x < 1.0 - border_width_x;
    bool is_in_y = v_texCoord.y > border_width_y && v_texCoord.y < 1.0 - border_width_y;

    if (is_in_x == false || is_in_y == false) {
        outColor = u_stroke_color;
    } else {
        outColor = u_color;
    }
}
