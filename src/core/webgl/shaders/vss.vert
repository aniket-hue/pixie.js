#version 300 es

in vec2 a_position;

uniform vec2 u_resolution;
uniform mat3 u_viewport_transform_matrix;
uniform mat3 u_object_transformation_matrix;
uniform vec2 u_size; 

void main() {
    vec2 position = (u_viewport_transform_matrix * u_object_transformation_matrix * vec3(a_position * u_size, 1)).xy;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace, 0.0, 1.0);
}
