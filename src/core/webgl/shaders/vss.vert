#version 300 es

in vec2 a_position;

in mat3 a_instance_matrix; 
in vec2 a_instance_size;
in vec4 a_instance_fill_color;
in vec4 a_instance_stroke_color;
in float a_instance_stroke_width;

uniform vec2 u_resolution;
uniform mat3 u_viewport_transform_matrix;
uniform float u_zoom_level;

out vec2 v_texCoord; 
out vec2 v_size;
out float v_zoom_level;
out vec4 v_fill_color;
out vec4 v_stroke_color;
out float v_stroke_width;
out vec2 v_scale;

void main() {
    vec2 scaledPosition = a_position * a_instance_size;
    vec2 position = (u_viewport_transform_matrix * a_instance_matrix * vec3(scaledPosition, 1.0)).xy;
    
    vec2 scaleX = (u_viewport_transform_matrix * a_instance_matrix * vec3(1.0, 0.0, 0.0)).xy;
    vec2 scaleY = (u_viewport_transform_matrix * a_instance_matrix * vec3(0.0, 1.0, 0.0)).xy;
    v_scale = vec2(length(scaleX), length(scaleY)) / u_zoom_level;
    
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
   
    gl_Position = vec4(clipSpace, 0.0, 1.0);
    
    v_texCoord = a_position + 0.5;
    v_size = a_instance_size;
    v_zoom_level = u_zoom_level;
    v_fill_color = a_instance_fill_color;
    v_stroke_color = a_instance_stroke_color;
    v_stroke_width = a_instance_stroke_width;
}