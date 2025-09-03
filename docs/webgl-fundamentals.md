# WebGL Fundamentals for 2D Graphics

WebGL (Web Graphics Library) is a JavaScript API for rendering interactive 2D and 3D graphics within any compatible web browser without the use of plug-ins. This guide explains WebGL concepts specifically for creating 2D graphics like our infinite canvas.

## Table of Contents

1. [What is WebGL?](#what-is-webgl)
2. [Core Concepts](#core-concepts)
3. [The Rendering Pipeline](#the-rendering-pipeline)
4. [Coordinate Systems](#coordinate-systems)
5. [Shaders](#shaders)
6. [Buffers and Attributes](#buffers-and-attributes)
7. [Uniforms](#uniforms)
8. [Matrix Transformations](#matrix-transformations)
9. [Building a Simple Renderer](#building-a-simple-renderer)
10. [Camera System Implementation](#camera-system-implementation)

## What is WebGL?

WebGL is based on OpenGL ES 2.0 and provides low-level access to the GPU (Graphics Processing Unit). Unlike the Canvas 2D API, WebGL can:

- **Utilize GPU acceleration** for high-performance rendering
- **Handle thousands of objects** efficiently
- **Apply complex transformations** using matrix math
- **Render custom shaders** for advanced visual effects

### Why WebGL for 2D?

While WebGL is designed for 3D, it's excellent for 2D because:
- **Performance**: GPU parallelization handles many objects simultaneously
- **Flexibility**: Complete control over rendering pipeline
- **Scalability**: No performance degradation with complex scenes
- **Effects**: Access to fragment shaders for advanced visual effects

## Core Concepts

### 1. Context and Canvas

```javascript
// Get WebGL context from canvas
const canvas = document.getElementById('myCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    console.error('WebGL not supported');
}
```

### 2. Vertices and Primitives

WebGL works with **vertices** (points in space) that form **primitives**:

```javascript
// Triangle vertices (x, y coordinates)
const triangleVertices = [
    0.0,  0.5,   // Top vertex
   -0.5, -0.5,   // Bottom left
    0.5, -0.5    // Bottom right
];
```

**Primitive types:**
- `gl.POINTS` - Individual points
- `gl.LINES` - Line segments (2 vertices each)
- `gl.TRIANGLES` - Triangles (3 vertices each)
- `gl.TRIANGLE_STRIP` - Connected triangles

### 3. Normalized Device Coordinates (NDC)

WebGL uses a coordinate system where:
- **X axis**: -1 (left) to +1 (right)
- **Y axis**: -1 (bottom) to +1 (top)
- **Z axis**: -1 (near) to +1 (far)

```
      Y
      ↑
      1
      |
-1 ———┼——— 1  X
      |
     -1
```

## The Rendering Pipeline

The WebGL pipeline transforms your data through several stages:

```
Vertices → Vertex Shader → Primitive Assembly → Rasterization → Fragment Shader → Framebuffer
```

### 1. Vertex Processing
- **Input**: Vertex attributes (position, color, etc.)
- **Output**: Transformed vertex positions
- **Purpose**: Transform vertices to screen space

### 2. Primitive Assembly
- Groups vertices into primitives (triangles, lines)
- Performs clipping (removes off-screen geometry)

### 3. Rasterization
- Converts primitives into fragments (potential pixels)
- Determines which pixels are covered

### 4. Fragment Processing
- **Input**: Fragment data from rasterization
- **Output**: Final pixel color
- **Purpose**: Calculate final pixel colors

## Coordinate Systems

Understanding coordinate transformations is crucial for 2D graphics:

### 1. World Coordinates
Your application's coordinate system (e.g., pixels, units):
```javascript
// Rectangle at (100, 200) with size 50x30 pixels
const rect = { x: 100, y: 200, width: 50, height: 30 };
```

### 2. Camera/View Coordinates
After applying camera transformation:
```javascript
// Apply camera offset and zoom
const viewX = (worldX + camera.x) * camera.zoom;
const viewY = (worldY + camera.y) * camera.zoom;
```

### 3. Normalized Device Coordinates
Final WebGL coordinate system (-1 to +1):
```javascript
// Convert from view to NDC
const ndcX = (viewX / canvasWidth) * 2 - 1;
const ndcY = -((viewY / canvasHeight) * 2 - 1); // Flip Y
```

## Shaders

Shaders are small programs that run on the GPU. WebGL requires two types:

### Vertex Shader
Processes each vertex individually:

```glsl
// Vertex shader (GLSL)
attribute vec2 a_position;     // Input: vertex position
uniform vec2 u_resolution;     // Canvas resolution
uniform vec2 u_translation;    // Camera translation
uniform float u_scale;         // Camera zoom

void main() {
    // Apply camera transformation
    vec2 transformed = (a_position + u_translation) * u_scale;
    
    // Convert to normalized device coordinates
    vec2 clipSpace = ((transformed / u_resolution) * 2.0) - 1.0;
    
    // Set final position (flip Y coordinate)
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
```

### Fragment Shader
Processes each pixel:

```glsl
// Fragment shader (GLSL)
precision mediump float;       // Set precision
uniform vec4 u_color;          // Input: color

void main() {
    gl_FragColor = u_color;    // Output: pixel color
}
```

### Creating Shaders in JavaScript

```javascript
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}
```

## Buffers and Attributes

Buffers store vertex data on the GPU:

### Creating and Using Buffers

```javascript
// 1. Create buffer
const positionBuffer = gl.createBuffer();

// 2. Bind buffer as current array buffer
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// 3. Upload data to buffer
const vertices = new Float32Array([
    0, 0,     // Vertex 1
    100, 0,   // Vertex 2
    0, 100    // Vertex 3
]);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// 4. Get attribute location from shader
const positionLocation = gl.getAttribLocation(program, 'a_position');

// 5. Enable and configure attribute
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
    positionLocation,  // Attribute location
    2,                 // Components per vertex (x, y)
    gl.FLOAT,         // Data type
    false,            // Normalize?
    0,                // Stride (bytes between vertices)
    0                 // Offset (bytes to first component)
);
```

### Buffer Usage Patterns

- `gl.STATIC_DRAW` - Data won't change (backgrounds, UI)
- `gl.DYNAMIC_DRAW` - Data changes occasionally (animated objects)
- `gl.STREAM_DRAW` - Data changes every frame (particles)

## Uniforms

Uniforms are global variables passed to shaders:

```javascript
// Get uniform locations
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const colorLocation = gl.getUniformLocation(program, 'u_color');
const translationLocation = gl.getUniformLocation(program, 'u_translation');

// Set uniform values
gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
gl.uniform4f(colorLocation, 1.0, 0.0, 0.0, 1.0); // Red
gl.uniform2f(translationLocation, camera.x, camera.y);
```

### Uniform Types

- `uniform1f` - Single float
- `uniform2f` - Two floats (vec2)
- `uniform3f` - Three floats (vec3)
- `uniform4f` - Four floats (vec4)
- `uniformMatrix4fv` - 4x4 matrix

## Matrix Transformations

For more complex transformations, use matrices:

### 2D Transformation Matrix

```javascript
// Create 2D transformation matrix
function createTransformMatrix(translateX, translateY, scaleX, scaleY, rotation) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    return [
        scaleX * cos,  scaleX * sin, 0,
        -scaleY * sin, scaleY * cos, 0,
        translateX,    translateY,   1
    ];
}

// Use in vertex shader
// uniform mat3 u_transform;
// vec3 transformed = u_transform * vec3(a_position, 1.0);
// vec2 position = transformed.xy;
```

## Building a Simple Renderer

Here's a step-by-step implementation:

### Step 1: Initialize WebGL

```javascript
class SimpleRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.initializeShaders();
        this.initializeBuffers();
        this.setupWebGL();
    }
    
    setupWebGL() {
        const gl = this.gl;
        
        // Set viewport
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Use our shader program
        gl.useProgram(this.program);
    }
}
```

### Step 2: Create Render Methods

```javascript
class SimpleRenderer {
    // ... previous code ...
    
    clear(r = 0, g = 0, b = 0, a = 1) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    
    drawRectangle(x, y, width, height, color = [1, 0, 0, 1]) {
        const gl = this.gl;
        
        // Create rectangle vertices
        const vertices = new Float32Array([
            x, y,
            x + width, y,
            x, y + height,
            x, y + height,
            x + width, y,
            x + width, y + height
        ]);
        
        // Upload vertices
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        
        // Set color
        gl.uniform4f(this.colorLocation, ...color);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
```

### Step 3: Animation Loop

```javascript
class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.renderer = new SimpleRenderer(this.canvas);
        this.animate();
    }
    
    animate() {
        // Clear canvas
        this.renderer.clear(0.95, 0.95, 0.95, 1);
        
        // Draw objects
        this.renderer.drawRectangle(100, 100, 50, 50, [1, 0, 0, 1]);
        this.renderer.drawRectangle(200, 150, 30, 80, [0, 1, 0, 1]);
        
        // Continue animation
        requestAnimationFrame(() => this.animate());
    }
}

// Start application
new App();
```

## Camera System Implementation

### Basic Camera Class

```javascript
class Camera {
    constructor() {
        this.x = 0;      // Pan X
        this.y = 0;      // Pan Y
        this.zoom = 1;   // Zoom level
    }
    
    pan(deltaX, deltaY) {
        // Adjust for zoom level
        this.x += deltaX / this.zoom;
        this.y += deltaY / this.zoom;
    }
    
    zoomAt(factor, screenX, screenY, canvas) {
        // Convert screen position to world position
        const worldPos = this.screenToWorld(screenX, screenY, canvas);
        
        // Apply zoom
        this.zoom *= factor;
        
        // Convert back to screen and adjust camera
        const newWorldPos = this.screenToWorld(screenX, screenY, canvas);
        this.x += worldPos.x - newWorldPos.x;
        this.y += worldPos.y - newWorldPos.y;
    }
    
    screenToWorld(screenX, screenY, canvas) {
        // Convert screen coordinates to world coordinates
        const ndcX = (screenX / canvas.width) * 2 - 1;
        const ndcY = -((screenY / canvas.height) * 2 - 1);
        
        const worldX = (ndcX * canvas.width / 2) / this.zoom - this.x;
        const worldY = (ndcY * canvas.height / 2) / this.zoom - this.y;
        
        return { x: worldX, y: worldY };
    }
}
```

### Integrating Camera with Renderer

```javascript
// In your vertex shader, add camera uniforms:
const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    uniform vec2 u_camera_translation;
    uniform float u_camera_zoom;
    
    void main() {
        // Apply camera transformation
        vec2 transformed = (a_position + u_camera_translation) * u_camera_zoom;
        
        // Convert to clip space
        vec2 clipSpace = ((transformed / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

// In your renderer, update camera uniforms before drawing:
updateCamera(camera) {
    const gl = this.gl;
    gl.uniform2f(this.cameraTranslationLocation, camera.x, camera.y);
    gl.uniform1f(this.cameraZoomLocation, camera.zoom);
}
```

## Performance Tips

### 1. Batch Rendering
Group similar objects to minimize state changes:

```javascript
// Bad: Multiple draw calls
objects.forEach(obj => {
    setColor(obj.color);
    drawRectangle(obj.x, obj.y, obj.width, obj.height);
});

// Good: Batch by color
const objectsByColor = groupBy(objects, 'color');
objectsByColor.forEach((objs, color) => {
    setColor(color);
    objs.forEach(obj => drawRectangle(obj.x, obj.y, obj.width, obj.height));
});
```

### 2. Use Instanced Rendering
For many similar objects:

```javascript
// Upload all positions at once
const positions = objects.flatMap(obj => [obj.x, obj.y]);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, objects.length);
```

### 3. Frustum Culling
Only render visible objects:

```javascript
function isInView(object, camera, canvas) {
    const screenBounds = getScreenBounds(camera, canvas);
    return intersects(object.bounds, screenBounds);
}

const visibleObjects = objects.filter(obj => isInView(obj, camera, canvas));
```

## Debugging WebGL

### Common Issues and Solutions

1. **Black Screen**
   - Check shader compilation errors
   - Verify buffer data is uploaded correctly
   - Ensure viewport is set properly

2. **Nothing Visible**
   - Check coordinate ranges (must be in -1 to +1 for NDC)
   - Verify vertex order (counter-clockwise for front-facing)
   - Check if objects are behind the camera

3. **Performance Issues**
   - Minimize state changes
   - Use appropriate buffer usage patterns
   - Implement frustum culling

### Debugging Tools

```javascript
// Check for WebGL errors
function checkGLError(gl, operation) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error(`WebGL error after ${operation}: ${error}`);
    }
}

// Log shader info
function logShaderInfo(gl, shader) {
    console.log('Shader info log:', gl.getShaderInfoLog(shader));
}
```

## Next Steps

Now that you understand the fundamentals, you can:

1. **Implement basic shapes** (rectangles, circles, lines)
2. **Add object selection** with mouse picking
3. **Create a scene graph** for hierarchical objects
4. **Add text rendering** using texture atlases
5. **Implement advanced features** like shadows, gradients, and effects

The infinite canvas implementation in this project demonstrates these concepts in practice. Study the code alongside this documentation to see how theory translates to implementation.

## Resources

- [WebGL Fundamentals](https://webglfundamentals.org/) - Comprehensive WebGL tutorials
- [MDN WebGL Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) - Official documentation
- [OpenGL ES 2.0 Reference](https://www.khronos.org/opengles/sdk/docs/reference_cards/) - GLSL reference
- [Real-Time Rendering](https://www.realtimerendering.com/) - Advanced graphics techniques
