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
    
    // Calculate distances to each edge in world units
    float distLeft = pixelCoord.x;
    float distRight = v_size.x - pixelCoord.x;
    float distBottom = pixelCoord.y;
    float distTop = v_size.y - pixelCoord.y;
    
    // Find minimum distance to any edge (in world units)
    float minDist = min(min(distLeft, distRight), min(distBottom, distTop));
    
    // Calculate stroke width accounting for scale
    // v_scale represents pixels per world unit after transformation
    // We want stroke to scale with zoom but maintain minimum 1 pixel visibility
    float avgScale = (v_scale.x + v_scale.y) * 0.5;
    
    // Convert stroke width to world units that will render as at least 1 pixel
    // If scaled stroke would be < 1 pixel, use 1 pixel equivalent in world units
    float strokeWidthInPixels = v_stroke_width * avgScale;
    float effectiveStrokeWidth = strokeWidthInPixels < 1.0 
        ? 1.0 / avgScale  // Use 1 pixel equivalent in world units
        : v_stroke_width; // Use original stroke width
    
    // Check if we're within stroke width of any edge
    bool inStroke = minDist < effectiveStrokeWidth && v_stroke_width > 0.0;
    
    if (inStroke) {
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