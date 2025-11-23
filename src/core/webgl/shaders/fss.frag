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
in vec4 v_filters1; // brightness, contrast, saturation, hue
in vec2 v_filters2; // sepia, invert

uniform sampler2D u_texture;

out vec4 outColor;

// Helper functions for filters
vec3 applyHue(vec3 color, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    vec3 k = vec3(0.57735);
    float dot_k_color = dot(k, color);
    return color * c + cross(k, color) * s + k * dot_k_color * (1.0 - c);
}

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
            vec3 color = textureColor.rgb;

            // Apply filters
            float brightness = v_filters1.x;
            float contrast = v_filters1.y;
            float saturation = v_filters1.z;
            float hue = v_filters1.w;
            float sepia = v_filters2.x;
            float invert = v_filters2.y;

            // Brightness
            color *= brightness;

            // Contrast
            color = (color - 0.5) * contrast + 0.5;

            // Saturation
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(gray), color, saturation);

            // Hue
            if (hue != 0.0) {
                color = applyHue(color, hue);
            }

            // Sepia
            if (sepia > 0.0) {
                vec3 sepiaColor = vec3(
                    dot(color, vec3(0.393, 0.769, 0.189)),
                    dot(color, vec3(0.349, 0.686, 0.168)),
                    dot(color, vec3(0.272, 0.534, 0.131))
                );
                color = mix(color, sepiaColor, sepia);
            }

            // Invert
            if (invert > 0.0) {
                color = mix(color, 1.0 - color, invert);
            }

            outColor = vec4(color, textureColor.a);
        } else {
            // Regular rectangle - use fill color
            outColor = v_fill_color;
        }
    }
}