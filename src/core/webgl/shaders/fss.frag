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
    float one_pixel_width = 1.0 / v_size.x;
    float one_pixel_height = 1.0 / v_size.y;

    float selected_stroke_width = 2.0; // In pixels
    float border_width_x = one_pixel_width * selected_stroke_width;
    float border_width_y = one_pixel_height * selected_stroke_width;

    float stroke_width_x = (selected_stroke_width + u_stroke_width) * one_pixel_width;
    float stroke_width_y = (selected_stroke_width + u_stroke_width) * one_pixel_height;

    bool v1 = v_texCoord.x > border_width_x && v_texCoord.x < 1.0 - border_width_x;
    bool v2 = v_texCoord.y > border_width_y && v_texCoord.y < 1.0 - border_width_y;

    bool v3 = v_texCoord.x > stroke_width_x && v_texCoord.x < 1.0 - stroke_width_x;
    bool v4 = v_texCoord.y > stroke_width_y && v_texCoord.y < 1.0 - stroke_width_y;

    if (v1 == false || v2 == false) {
        outColor = u_selected == 1 ? vec4(0.5, 1.0, 0.5, 1.0) : vec4(0.0, 0.0, 0.0, 0.0);
    } else if (v3 == false || v4 == false) {     
        outColor = u_stroke_color;
    } else{
        outColor = u_fill_color;
    }
}
