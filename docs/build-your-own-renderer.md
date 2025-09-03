# Build Your Own WebGL 2D Renderer

This tutorial walks you through building a complete 2D WebGL renderer from scratch. By the end, you'll have a working infinite canvas similar to Figma.

## Prerequisites

Basic knowledge of:
- JavaScript/TypeScript
- HTML Canvas
- Basic linear algebra (vectors, matrices)

## Tutorial Structure

1. [Setting Up the Canvas](#step-1-setting-up-the-canvas)
2. [Creating Basic Shaders](#step-2-creating-basic-shaders)
3. [Drawing Your First Triangle](#step-3-drawing-your-first-triangle)
4. [Adding Color](#step-4-adding-color)
5. [Drawing Rectangles](#step-5-drawing-rectangles)
6. [Implementing Camera System](#step-6-implementing-camera-system)
7. [Adding Mouse Interaction](#step-7-adding-mouse-interaction)
8. [Performance Optimization](#step-8-performance-optimization)

---

## Step 1: Setting Up the Canvas

First, create a basic HTML file with a canvas element:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebGL 2D Renderer</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #333;
        }
        canvas {
            display: block;
            background: white;
        }
    </style>
</head>
<body>
    <canvas id="canvas" width="800" height="600"></canvas>
    <script src="renderer.js"></script>
</body>
</html>
```

Now create the basic renderer class:

```javascript
// renderer.js
class WebGL2DRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported in this browser');
        }
        
        console.log('WebGL initialized successfully!');
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // Set the viewport to match canvas size
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        // Set clear color to light gray
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        console.log('Renderer initialized');
    }
}

// Initialize the renderer
const renderer = new WebGL2DRenderer('canvas');
```

**What's happening here?**
- We get the WebGL context from the canvas
- We set the viewport to match our canvas dimensions
- We clear the canvas with a light gray color

---

## Step 2: Creating Basic Shaders

Shaders are small programs that run on the GPU. We need two types:

```javascript
class WebGL2DRenderer {
    constructor(canvasId) {
        // ... previous code ...
        this.initShaders();
    }
    
    initShaders() {
        const gl = this.gl;
        
        // Vertex shader source code
        const vertexShaderSource = `
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            
            void main() {
                // Convert from pixels to normalized device coordinates (-1 to +1)
                vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
                
                // Flip Y coordinate (WebGL Y goes up, screen Y goes down)
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;
        
        // Fragment shader source code  
        const fragmentShaderSource = `
            precision mediump float;
            uniform vec4 u_color;
            
            void main() {
                gl_FragColor = u_color;
            }
        `;
        
        // Create and compile shaders
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create shader program
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Get attribute and uniform locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
        
        // Create position buffer
        this.positionBuffer = gl.createBuffer();
        
        console.log('Shaders created successfully');
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        // Check for compilation errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compilation error: ' + error);
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // Check for linking errors
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            throw new Error('Program linking error: ' + error);
        }
        
        return program;
    }
}
```

**Key Concepts:**
- **Vertex Shader**: Transforms vertex positions from pixel coordinates to WebGL's coordinate system
- **Fragment Shader**: Sets the color of each pixel
- **Uniforms**: Global variables we can set from JavaScript
- **Attributes**: Per-vertex data (like position)

---

## Step 3: Drawing Your First Triangle

Now let's draw something visible:

```javascript
class WebGL2DRenderer {
    // ... previous code ...
    
    drawTriangle(x1, y1, x2, y2, x3, y3) {
        const gl = this.gl;
        
        // Triangle vertices
        const vertices = new Float32Array([
            x1, y1,  // First vertex
            x2, y2,  // Second vertex  
            x3, y3   // Third vertex
        ]);
        
        // Use our shader program
        gl.useProgram(this.program);
        
        // Set the resolution uniform
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        // Bind and upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Set up the position attribute
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Set color to red
        gl.uniform4f(this.colorLocation, 1.0, 0.0, 0.0, 1.0);
        
        // Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    
    clear() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}

// Test the triangle
renderer.clear();
renderer.drawTriangle(100, 100, 200, 100, 150, 200);
```

You should now see a red triangle on your canvas!

**What's happening:**
1. We create an array of vertex positions in pixel coordinates
2. We upload this data to a GPU buffer
3. We tell WebGL how to interpret the buffer data
4. We set the color uniform and draw

---

## Step 4: Adding Color

Let's make our renderer more flexible with color support:

```javascript
class WebGL2DRenderer {
    // ... previous code ...
    
    drawTriangle(x1, y1, x2, y2, x3, y3, color = [1, 0, 0, 1]) {
        const gl = this.gl;
        
        const vertices = new Float32Array([x1, y1, x2, y2, x3, y3]);
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Use the provided color
        gl.uniform4f(this.colorLocation, color[0], color[1], color[2], color[3]);
        
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}

// Test with different colors
renderer.clear();
renderer.drawTriangle(100, 100, 200, 100, 150, 200, [1, 0, 0, 1]); // Red
renderer.drawTriangle(250, 150, 350, 150, 300, 250, [0, 1, 0, 1]); // Green
renderer.drawTriangle(400, 200, 500, 200, 450, 300, [0, 0, 1, 1]); // Blue
```

---

## Step 5: Drawing Rectangles

Rectangles are more useful for UI elements. We'll draw them as two triangles:

```javascript
class WebGL2DRenderer {
    // ... previous code ...
    
    drawRectangle(x, y, width, height, color = [0, 0, 1, 1]) {
        const gl = this.gl;
        
        // Rectangle as two triangles
        const vertices = new Float32Array([
            // First triangle
            x, y,                    // Bottom left
            x + width, y,            // Bottom right  
            x, y + height,           // Top left
            
            // Second triangle
            x, y + height,           // Top left
            x + width, y,            // Bottom right
            x + width, y + height    // Top right
        ]);
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform4f(this.colorLocation, color[0], color[1], color[2], color[3]);
        
        // Draw 6 vertices (2 triangles)
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    drawLine(x1, y1, x2, y2, color = [0, 0, 0, 1]) {
        const gl = this.gl;
        
        const vertices = new Float32Array([x1, y1, x2, y2]);
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform4f(this.colorLocation, color[0], color[1], color[2], color[3]);
        
        gl.drawArrays(gl.LINES, 0, 2);
    }
}

// Test rectangles and lines
renderer.clear();
renderer.drawRectangle(100, 100, 150, 100, [1, 0.5, 0, 1]); // Orange rectangle
renderer.drawRectangle(300, 150, 80, 120, [0.5, 0, 1, 1]);  // Purple rectangle
renderer.drawLine(50, 50, 750, 550, [0, 0, 0, 1]);          // Black diagonal line
```

---

## Step 6: Implementing Camera System

Now for the infinite canvas magic - a camera system that allows panning and zooming:

```javascript
class Camera {
    constructor() {
        this.x = 0;      // Pan offset X
        this.y = 0;      // Pan offset Y  
        this.zoom = 1;   // Zoom level
    }
    
    pan(deltaX, deltaY) {
        // Adjust pan based on zoom level (smaller movements when zoomed in)
        this.x += deltaX / this.zoom;
        this.y += deltaY / this.zoom;
    }
    
    zoomAt(factor, centerX, centerY, canvas) {
        // Get world position of zoom center before zoom
        const worldPos = this.screenToWorld(centerX, centerY, canvas);
        
        // Apply zoom
        const oldZoom = this.zoom;
        this.zoom *= factor;
        this.zoom = Math.max(0.1, Math.min(10, this.zoom)); // Clamp zoom
        
        // Get world position of zoom center after zoom
        const newWorldPos = this.screenToWorld(centerX, centerY, canvas);
        
        // Adjust camera position so point under cursor doesn't move
        this.x += worldPos.x - newWorldPos.x;
        this.y += worldPos.y - newWorldPos.y;
    }
    
    screenToWorld(screenX, screenY, canvas) {
        // Convert screen coordinates to world coordinates
        const ndcX = (screenX / canvas.width) * 2 - 1;
        const ndcY = -((screenY / canvas.height) * 2 - 1); // Flip Y
        
        // Apply inverse camera transform
        const worldX = (ndcX * canvas.width / 2) / this.zoom - this.x;
        const worldY = (ndcY * canvas.height / 2) / this.zoom - this.y;
        
        return { x: worldX, y: worldY };
    }
}

// Update the renderer to use camera
class WebGL2DRenderer {
    constructor(canvasId) {
        // ... previous constructor code ...
        this.camera = new Camera();
    }
    
    initShaders() {
        // Update vertex shader to include camera transform
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
        
        // ... rest of shader code ...
        
        // Get camera uniform locations
        this.cameraTranslationLocation = gl.getUniformLocation(this.program, 'u_camera_translation');
        this.cameraZoomLocation = gl.getUniformLocation(this.program, 'u_camera_zoom');
    }
    
    updateCameraUniforms() {
        const gl = this.gl;
        gl.uniform2f(this.cameraTranslationLocation, this.camera.x, this.camera.y);
        gl.uniform1f(this.cameraZoomLocation, this.camera.zoom);
    }
    
    drawRectangle(x, y, width, height, color = [0, 0, 1, 1]) {
        const gl = this.gl;
        
        const vertices = new Float32Array([
            x, y, x + width, y, x, y + height,
            x, y + height, x + width, y, x + width, y + height
        ]);
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        // Update camera uniforms
        this.updateCameraUniforms();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform4f(this.colorLocation, color[0], color[1], color[2], color[3]);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    // Update other draw methods similarly...
}
```

---

## Step 7: Adding Mouse Interaction

Let's add mouse controls for panning and zooming:

```javascript
class InputHandler {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMousePos.x;
                const deltaY = e.clientY - this.lastMousePos.y;
                
                this.camera.pan(-deltaX, deltaY); // Negative X for natural feel
                
                this.lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
        
        // Zoom with mouse wheel
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoomAt(zoomFactor, mouseX, mouseY, this.canvas);
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Set initial cursor
        this.canvas.style.cursor = 'grab';
    }
}

// Add to your initialization
const renderer = new WebGL2DRenderer('canvas');
const inputHandler = new InputHandler(renderer.canvas, renderer.camera);

// Create an animation loop
function animate() {
    renderer.clear();
    
    // Draw a grid for reference
    drawGrid(renderer);
    
    // Draw some test objects
    renderer.drawRectangle(-100, -100, 200, 150, [1, 0.5, 0, 1]);
    renderer.drawRectangle(300, 200, 100, 100, [0, 1, 0.5, 1]);
    renderer.drawRectangle(-500, 300, 80, 200, [0.5, 0, 1, 1]);
    
    requestAnimationFrame(animate);
}

function drawGrid(renderer) {
    const gridSize = 100;
    const extent = 2000;
    
    for (let x = -extent; x <= extent; x += gridSize) {
        renderer.drawLine(x, -extent, x, extent, [0.8, 0.8, 0.8, 1]);
    }
    for (let y = -extent; y <= extent; y += gridSize) {
        renderer.drawLine(-extent, y, extent, y, [0.8, 0.8, 0.8, 1]);
    }
}

animate();
```

---

## Step 8: Performance Optimization

For better performance, let's implement batching:

```javascript
class WebGL2DRenderer {
    constructor(canvasId) {
        // ... previous code ...
        this.batch = [];
    }
    
    // Add objects to batch instead of drawing immediately
    addRectangle(x, y, width, height, color = [0, 0, 1, 1]) {
        this.batch.push({
            type: 'rectangle',
            x, y, width, height, color
        });
    }
    
    addLine(x1, y1, x2, y2, color = [0, 0, 0, 1]) {
        this.batch.push({
            type: 'line',
            x1, y1, x2, y2, color
        });
    }
    
    // Render all batched objects
    renderBatch() {
        const gl = this.gl;
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        this.updateCameraUniforms();
        
        // Group by type for efficiency
        const rectangles = this.batch.filter(item => item.type === 'rectangle');
        const lines = this.batch.filter(item => item.type === 'line');
        
        // Render all rectangles
        if (rectangles.length > 0) {
            const vertices = [];
            const colors = [];
            
            rectangles.forEach(rect => {
                // Add rectangle vertices
                vertices.push(
                    rect.x, rect.y,
                    rect.x + rect.width, rect.y,
                    rect.x, rect.y + rect.height,
                    rect.x, rect.y + rect.height,
                    rect.x + rect.width, rect.y,
                    rect.x + rect.width, rect.y + rect.height
                );
            });
            
            // Upload all rectangle vertices at once
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            
            gl.enableVertexAttribArray(this.positionLocation);
            gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Draw each rectangle with its color
            rectangles.forEach((rect, i) => {
                gl.uniform4f(this.colorLocation, ...rect.color);
                gl.drawArrays(gl.TRIANGLES, i * 6, 6);
            });
        }
        
        // Similar batching for lines...
        
        // Clear batch for next frame
        this.batch = [];
    }
}

// Updated animation loop
function animate() {
    renderer.clear();
    
    // Add objects to batch
    addGridToBatch(renderer);
    renderer.addRectangle(-100, -100, 200, 150, [1, 0.5, 0, 1]);
    renderer.addRectangle(300, 200, 100, 100, [0, 1, 0.5, 1]);
    renderer.addRectangle(-500, 300, 80, 200, [0.5, 0, 1, 1]);
    
    // Render everything in one go
    renderer.renderBatch();
    
    requestAnimationFrame(animate);
}

function addGridToBatch(renderer) {
    const gridSize = 100;
    const extent = 2000;
    
    for (let x = -extent; x <= extent; x += gridSize) {
        renderer.addLine(x, -extent, x, extent, [0.8, 0.8, 0.8, 1]);
    }
    for (let y = -extent; y <= extent; y += gridSize) {
        renderer.addLine(-extent, y, extent, y, [0.8, 0.8, 0.8, 1]);
    }
}
```

## Advanced Features to Add

Now that you have a working infinite canvas, consider adding:

1. **Object Selection**
   ```javascript
   function getObjectAt(x, y) {
       const worldPos = camera.screenToWorld(x, y, canvas);
       return objects.find(obj => pointInObject(worldPos, obj));
   }
   ```

2. **Frustum Culling**
   ```javascript
   function getVisibleObjects(camera, canvas) {
       const bounds = getViewBounds(camera, canvas);
       return objects.filter(obj => intersects(obj.bounds, bounds));
   }
   ```

3. **Scene Graph**
   ```javascript
   class SceneNode {
       constructor() {
           this.children = [];
           this.transform = { x: 0, y: 0, scale: 1, rotation: 0 };
       }
       
       render(renderer, parentTransform) {
           const worldTransform = combine(parentTransform, this.transform);
           this.children.forEach(child => child.render(renderer, worldTransform));
       }
   }
   ```

4. **Undo/Redo System**
   ```javascript
   class CommandHistory {
       constructor() {
           this.commands = [];
           this.currentIndex = -1;
       }
       
       execute(command) {
           command.execute();
           this.commands = this.commands.slice(0, this.currentIndex + 1);
           this.commands.push(command);
           this.currentIndex++;
       }
       
       undo() {
           if (this.currentIndex >= 0) {
               this.commands[this.currentIndex].undo();
               this.currentIndex--;
           }
       }
   }
   ```

## Complete Example

Here's the complete working example you can copy and run:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebGL 2D Infinite Canvas</title>
    <style>
        body { margin: 0; padding: 0; background: #333; font-family: Arial, sans-serif; }
        canvas { display: block; background: white; }
        .controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="controls">
        <div>Pan: Click and drag</div>
        <div>Zoom: Mouse wheel</div>
        <div>Camera: <span id="camera-info"></span></div>
    </div>
    <canvas id="canvas" width="800" height="600"></canvas>
    
    <script>
        // Insert the complete renderer code here...
        // Then initialize:
        const renderer = new WebGL2DRenderer('canvas');
        const inputHandler = new InputHandler(renderer.canvas, renderer.camera);
        
        function updateCameraInfo() {
            const info = document.getElementById('camera-info');
            const cam = renderer.camera;
            info.textContent = `x:${cam.x.toFixed(1)} y:${cam.y.toFixed(1)} zoom:${cam.zoom.toFixed(2)}`;
        }
        
        function animate() {
            renderer.clear();
            addGridToBatch(renderer);
            
            // Add some test objects
            for (let i = 0; i < 50; i++) {
                const x = (Math.random() - 0.5) * 2000;
                const y = (Math.random() - 0.5) * 2000;
                const size = 20 + Math.random() * 80;
                const color = [Math.random(), Math.random(), Math.random(), 1];
                renderer.addRectangle(x, y, size, size, color);
            }
            
            renderer.renderBatch();
            updateCameraInfo();
            requestAnimationFrame(animate);
        }
        
        animate();
    </script>
</body>
</html>
```

Congratulations! You now have a working understanding of WebGL and have built your own infinite canvas renderer. This foundation can be extended to create powerful 2D graphics applications like Figma, drawing tools, or games.
