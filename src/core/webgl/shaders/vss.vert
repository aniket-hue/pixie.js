#version 300 es

in vec2 a_position;

in mat3 a_instance_matrix; 
in vec2 a_instance_size;
in vec4 a_instance_fill_color;
in vec4 a_instance_stroke_color;
in float a_instance_stroke_width;
in float a_instance_selected;

uniform vec2 u_resolution;
uniform mat3 u_viewport_transform_matrix;
uniform float u_zoom_level;

out vec2 v_texCoord; 
out vec2 v_size;
out float v_zoom_level;
out vec4 v_fill_color;
out vec4 v_stroke_color;
out float v_stroke_width;
out float v_selected;

void main() {
    float selected_stroke_width = a_instance_selected > 0.5 ? 4.0 : 0.0;
    vec2 expandedSize = a_instance_size + selected_stroke_width;
    
    vec2 scaledPosition = a_position * expandedSize;
    
    vec2 position = (u_viewport_transform_matrix * a_instance_matrix * vec3(scaledPosition, 1.0)).xy;
    
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
   
    gl_Position = vec4(clipSpace, 0.0, 1.0);
    
    v_texCoord = a_position + 0.5;
    v_size = expandedSize;
    v_zoom_level = u_zoom_level;
    v_fill_color = a_instance_fill_color;
    v_stroke_color = a_instance_stroke_color;
    v_stroke_width = a_instance_stroke_width;
    v_selected = a_instance_selected;
}