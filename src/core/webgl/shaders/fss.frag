#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec2 v_size;
in float v_zoom_level;
in vec4 v_fill_color;
in vec4 v_stroke_color;
in float v_stroke_width;
in vec2 v_scale;
in float v_has_texture;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
    vec2 pixelCoord = v_texCoord * v_size;
    
    vec2 adjustedStrokeWidth = vec2(v_stroke_width) / v_scale;
    
    float distLeft = pixelCoord.x;
    float distRight = v_size.x - pixelCoord.x;
    float distBottom = pixelCoord.y;
    float distTop = v_size.y - pixelCoord.y;
    
    bool inStrokeHorizontal = (distLeft < adjustedStrokeWidth.x || distRight < adjustedStrokeWidth.x);
    bool inStrokeVertical = (distBottom < adjustedStrokeWidth.y || distTop < adjustedStrokeWidth.y);
    
    bool inStroke = inStrokeHorizontal || inStrokeVertical;
    
    if (inStroke && v_stroke_width > 0.0) {
        // Show stroke color
        outColor = v_stroke_color;
    } else {
        // Check if this instance has a texture
        if (v_has_texture > 0.5) {
            // Sample the texture
            vec4 textureColor = texture(u_texture, v_texCoord);
            outColor = textureColor;
        } else {
            // Regular rectangle - use fill color
            outColor = v_fill_color;
        }
    }
}