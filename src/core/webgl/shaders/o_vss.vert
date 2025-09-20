#version 300 es

in vec2 a_position;

uniform mat3 u_viewport_transform_matrix;
uniform mat3 u_object_transform_matrix;

uniform vec2 u_resolution;

void main() {
  vec3 position = u_viewport_transform_matrix * u_object_transform_matrix * vec3(a_position, 1.0);
  vec2 zeroToOne = position.xy / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  
  gl_Position = vec4(clipSpace, 0.0, 1.0);
}
