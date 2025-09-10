#version 300 es

in vec2 a_position;

uniform vec2 u_resolution;
uniform mat3 u_viewport_transform_matrix;
uniform mat3 u_object_transformation_matrix;
uniform vec2 u_size; 

out vec2 v_texCoord; 
out vec2 v_size;

void main() {
    float selected_stroke_width = 2.0; // In pixels
    vec2 scaledPosition = a_position * (u_size);

    vec2 position = (u_viewport_transform_matrix * u_object_transformation_matrix * vec3(scaledPosition, 1)).xy;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
   
    gl_Position = vec4(clipSpace, 0.0, 1.0);
    v_texCoord = a_position + 0.5;
    v_size = u_size;
}
