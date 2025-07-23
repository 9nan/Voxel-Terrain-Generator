import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator } from './terrain/TerrainGenerator.js';
import { MaterialManager } from './terrain/MaterialManager.js';
import { SceneManager } from './scene/SceneManager.js';
import { ExportManager } from './utils/ExportManager.js';

class VoxelTerrainApp {
    constructor() {
        this.container = document.getElementById('container');
        this.loadingDiv = document.getElementById('loading');
        
        this.initControls();
        this.initScene();
        this.initTerrainGenerator();
        this.initExportManager();
        
        this.generateInitialTerrain();
        this.animate();
    }

    initControls() {
        const controls = {
            size: document.getElementById('size'),
            height: document.getElementById('height'),
            scale: document.getElementById('scale'),
            seed: document.getElementById('seed'),
            mountainHeight: document.getElementById('mountainHeight'),
            treeCount: document.getElementById('treeCount'),
            riverWidth: document.getElementById('riverWidth'),
            generateBtn: document.getElementById('generateBtn'),
            exportBtn: document.getElementById('exportBtn')
        };

        // Update value displays
        controls.size.addEventListener('input', (e) => {
            document.getElementById('sizeValue').textContent = `${e.target.value} x ${e.target.value}`;
        });

        controls.height.addEventListener('input', (e) => {
            document.getElementById('heightValue').textContent = `${e.target.value} blocks`;
        });

        controls.scale.addEventListener('input', (e) => {
            document.getElementById('scaleValue').textContent = e.target.value;
        });

        controls.seed.addEventListener('input', (e) => {
            document.getElementById('seedValue').textContent = e.target.value;
        });

        controls.mountainHeight.addEventListener('input', (e) => {
            document.getElementById('mountainHeightValue').textContent = `${e.target.value}x`;
        });

        controls.treeCount.addEventListener('input', (e) => {
            document.getElementById('treeCountValue').textContent = `${e.target.value}%`;
        });

        controls.riverWidth.addEventListener('input', (e) => {
            document.getElementById('riverWidthValue').textContent = `${e.target.value} blocks`;
        });
        // Generate button
        controls.generateBtn.addEventListener('click', () => {
            this.generateTerrain();
        });

        // Export button
        controls.exportBtn.addEventListener('click', () => {
            this.exportTerrain();
        });

        this.controls = controls;
    }

    initScene() {
        this.sceneManager = new SceneManager(this.container);
        this.scene = this.sceneManager.scene;
        this.camera = this.sceneManager.camera;
        this.renderer = this.sceneManager.renderer;
        this.orbitControls = this.sceneManager.controls;
    }

    initTerrainGenerator() {
        this.materialManager = new MaterialManager();
        this.terrainGenerator = new TerrainGenerator(this.materialManager);
    }

    initExportManager() {
        this.exportManager = new ExportManager(this.renderer, this.scene, this.camera);
    }

    async generateTerrain() {
        this.showLoading();
        this.controls.generateBtn.disabled = true;
        this.controls.exportBtn.disabled = true;

        // Clear existing terrain
        this.clearTerrain();

        // Get parameters
        const params = {
            size: parseInt(this.controls.size.value),
            maxHeight: parseInt(this.controls.height.value),
            noiseScale: parseFloat(this.controls.scale.value),
            seed: parseInt(this.controls.seed.value),
            mountainHeight: parseFloat(this.controls.mountainHeight.value),
            treeCount: parseInt(this.controls.treeCount.value),
            riverWidth: parseInt(this.controls.riverWidth.value)
        };

        try {
            // Generate terrain (with small delay for UI responsiveness)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const terrain = await this.terrainGenerator.generateTerrain(params);
            this.scene.add(terrain);
            
            // Update camera position based on terrain size
            this.updateCameraPosition(params.size, params.maxHeight);
            
            this.controls.exportBtn.disabled = false;
        } catch (error) {
            console.error('Error generating terrain:', error);
        } finally {
            this.hideLoading();
            this.controls.generateBtn.disabled = false;
        }
    }

    async generateInitialTerrain() {
        const params = {
            size: 64,
            maxHeight: 16,
            noiseScale: 0.05,
            seed: 123,
            mountainHeight: 2.0,
            treeCount: 30,
            riverWidth: 3
        };

        const terrain = await this.terrainGenerator.generateTerrain(params);
        this.scene.add(terrain);
        this.updateCameraPosition(params.size, params.maxHeight);
        this.controls.exportBtn.disabled = false;
    }

    clearTerrain() {
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.userData.isTerrain) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }

    updateCameraPosition(size, maxHeight) {
        const distance = size * 1.5;
        const height = maxHeight + size * 0.8;
        
        this.camera.position.set(distance * 0.7, height, distance * 0.7);
        this.camera.lookAt(size / 2, maxHeight / 2, size / 2);
        
        this.orbitControls.target.set(size / 2, maxHeight / 2, size / 2);
        this.orbitControls.update();
    }

    exportTerrain() {
        this.exportManager.exportAsPNG();
    }

    showLoading() {
        this.loadingDiv.style.display = 'block';
    }

    hideLoading() {
        this.loadingDiv.style.display = 'none';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        this.sceneManager.handleResize();
    }
}

// Initialize the application
window.addEventListener('load', () => {
    const app = new VoxelTerrainApp();
    
    window.addEventListener('resize', () => {
        app.handleResize();
    });
});