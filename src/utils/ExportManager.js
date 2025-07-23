export class ExportManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
    }

    exportAsPNG(filename = 'terrain', width = 1920, height = 1080) {
        // Store current size
        const currentSize = this.renderer.getSize(new THREE.Vector2());
        const currentPixelRatio = this.renderer.getPixelRatio();
        
        // Set high resolution for export
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(1);
        
        // Update camera aspect ratio
        const originalAspect = this.camera.aspect;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Render at high quality
        this.renderer.render(this.scene, this.camera);
        
        // Get the image data
        const canvas = this.renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${filename}_${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Restore original settings
        this.renderer.setSize(currentSize.x, currentSize.y);
        this.renderer.setPixelRatio(currentPixelRatio);
        this.camera.aspect = originalAspect;
        this.camera.updateProjectionMatrix();
        
        // Re-render with original settings
        this.renderer.render(this.scene, this.camera);
        
        console.log('Terrain exported as PNG');
    }
}