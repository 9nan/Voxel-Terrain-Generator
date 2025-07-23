import * as THREE from 'three';
import { NoiseGenerator } from './NoiseGenerator.js';

export class TerrainGenerator {
    constructor(materialManager) {
        this.materialManager = materialManager;
        this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    }

    async generateTerrain(params) {
        const { size, maxHeight, noiseScale, seed, mountainHeight, treeCount, riverWidth } = params;
        
        // Initialize noise generator
        const noise = new NoiseGenerator(seed);
        
        // Generate height map
        const heightMap = this.generateHeightMap(noise, size, maxHeight, noiseScale, mountainHeight);
        
        // Generate river path
        const riverMap = this.generateRiver(noise, size, riverWidth);
        
        // Apply river to height map
        this.applyRiverToTerrain(heightMap, riverMap, size);
        
        // Generate tree positions
        const treePositions = this.generateTrees(noise, heightMap, size, maxHeight, treeCount);
        
        // Create terrain mesh
        const terrain = this.createTerrainMesh(heightMap, riverMap, treePositions, size, maxHeight);
        terrain.userData.isTerrain = true;
        
        return terrain;
    }

    generateHeightMap(noise, size, maxHeight, noiseScale, mountainHeight = 2.0) {
        const heightMap = [];
        
        for (let x = 0; x < size; x++) {
            heightMap[x] = [];
            for (let z = 0; z < size; z++) {
                // Base terrain noise
                let baseNoise = noise.octaveNoise(
                    x * noiseScale,
                    z * noiseScale,
                    0,
                    4,
                    0.5,
                    2.0
                );
                
                // Mountain noise (larger scale, more dramatic)
                let mountainNoise = noise.octaveNoise(
                    x * noiseScale * 0.3,
                    z * noiseScale * 0.3,
                    100,
                    6,
                    0.6,
                    2.0
                );
                
                // Combine base terrain with mountains
                let noiseValue = baseNoise + (mountainNoise * mountainHeight * 0.5);
                
                // Normalize to 0-1 range
                noiseValue = (noiseValue + 1) / 2;
                noiseValue = Math.max(0, Math.min(1, noiseValue));
                
                // Apply some terrain shaping
                noiseValue = Math.pow(noiseValue, 1.5); // Make it more varied
                
                // Convert to height
                const height = Math.floor(noiseValue * maxHeight * mountainHeight);
                heightMap[x][z] = Math.max(1, height); // Minimum height of 1
            }
        }
        
        return heightMap;
    }

    generateRiver(noise, size, riverWidth) {
        const riverMap = [];
        
        // Initialize river map
        for (let x = 0; x < size; x++) {
            riverMap[x] = [];
            for (let z = 0; z < size; z++) {
                riverMap[x][z] = false;
            }
        }
        
        // Generate river path using noise
        const riverPath = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const baseX = t * size;
            const baseZ = size * 0.3 + Math.sin(t * Math.PI * 2) * size * 0.2;
            
            // Add noise to make river more natural
            const noiseOffset = noise.noise(t * 10, 0, 200) * size * 0.1;
            
            riverPath.push({
                x: Math.floor(baseX + noiseOffset),
                z: Math.floor(baseZ)
            });
        }
        
        // Draw river with specified width
        riverPath.forEach(point => {
            for (let dx = -riverWidth; dx <= riverWidth; dx++) {
                for (let dz = -riverWidth; dz <= riverWidth; dz++) {
                    const x = point.x + dx;
                    const z = point.z + dz;
                    
                    if (x >= 0 && x < size && z >= 0 && z < size) {
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance <= riverWidth) {
                            riverMap[x][z] = true;
                        }
                    }
                }
            }
        });
        
        return riverMap;
    }
    
    applyRiverToTerrain(heightMap, riverMap, size) {
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (riverMap[x][z]) {
                    // Lower terrain for river
                    heightMap[x][z] = Math.max(1, heightMap[x][z] - 3);
                }
            }
        }
    }
    
    generateTrees(noise, heightMap, size, maxHeight, treeCount) {
        const trees = [];
        const treeChance = treeCount / 100;
        
        for (let x = 2; x < size - 2; x++) {
            for (let z = 2; z < size - 2; z++) {
                const height = heightMap[x][z];
                const relativeHeight = height / maxHeight;
                
                // Trees grow on grass (mid-level terrain) and not too high
                if (relativeHeight > 0.3 && relativeHeight < 0.7) {
                    const treeNoise = noise.noise(x * 0.1, z * 0.1, 300);
                    if (treeNoise > (1 - treeChance * 2)) {
                        // Random tree height between 3-6 blocks
                        const treeHeight = 3 + Math.floor(Math.abs(noise.noise(x, z, 400)) * 4);
                        trees.push({
                            x: x,
                            z: z,
                            baseHeight: height,
                            height: treeHeight
                        });
                    }
                }
            }
        }
        
        return trees;
    }
    createTerrainMesh(heightMap, riverMap, treePositions, size, maxHeight) {
        const terrainGroup = new THREE.Group();
        
        // Create instanced meshes for better performance
        const blocksByMaterial = new Map();
        
        // Collect terrain blocks by material type
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const surfaceHeight = heightMap[x][z];
                
                for (let y = 0; y <= surfaceHeight; y++) {
                    const material = this.materialManager.getMaterialForHeight(y, maxHeight, surfaceHeight, 'terrain');
                    const materialKey = this.getMaterialKey(material);
                    
                    if (!blocksByMaterial.has(materialKey)) {
                        blocksByMaterial.set(materialKey, []);
                    }
                    
                    blocksByMaterial.get(materialKey).push({ x, y, z });
                }
            }
        }
        
        // Add water blocks for rivers
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (riverMap[x][z]) {
                    const waterHeight = heightMap[x][z] + 1;
                    const material = this.materialManager.getMaterialForHeight(0, maxHeight, 0, 'water');
                    const materialKey = this.getMaterialKey(material);
                    
                    if (!blocksByMaterial.has(materialKey)) {
                        blocksByMaterial.set(materialKey, []);
                    }
                    
                    blocksByMaterial.get(materialKey).push({ x, y: waterHeight, z });
                }
            }
        }
        
        // Add tree blocks
        treePositions.forEach(tree => {
            // Tree trunk
            for (let y = 1; y <= tree.height; y++) {
                const material = this.materialManager.getMaterialForHeight(0, maxHeight, 0, 'wood');
                const materialKey = this.getMaterialKey(material);
                
                if (!blocksByMaterial.has(materialKey)) {
                    blocksByMaterial.set(materialKey, []);
                }
                
                blocksByMaterial.get(materialKey).push({ 
                    x: tree.x, 
                    y: tree.baseHeight + y, 
                    z: tree.z 
                });
            }
            
            // Tree leaves (simple sphere shape)
            const leavesY = tree.baseHeight + tree.height;
            const leavesRadius = 2;
            
            for (let dx = -leavesRadius; dx <= leavesRadius; dx++) {
                for (let dy = -1; dy <= 2; dy++) {
                    for (let dz = -leavesRadius; dz <= leavesRadius; dz++) {
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (distance <= leavesRadius && Math.random() > 0.3) {
                            const leafX = tree.x + dx;
                            const leafY = leavesY + dy;
                            const leafZ = tree.z + dz;
                            
                            if (leafX >= 0 && leafX < size && leafZ >= 0 && leafZ < size) {
                                const material = this.materialManager.getMaterialForHeight(0, maxHeight, 0, 'leaves');
                                const materialKey = this.getMaterialKey(material);
                                
                                if (!blocksByMaterial.has(materialKey)) {
                                    blocksByMaterial.set(materialKey, []);
                                }
                                
                                blocksByMaterial.get(materialKey).push({ 
                                    x: leafX, 
                                    y: leafY, 
                                    z: leafZ 
                                });
                            }
                        }
                    }
                }
            }
        });
        
        // Create instanced meshes for each material
        blocksByMaterial.forEach((positions, materialKey) => {
            const material = this.getMaterialByKey(materialKey);
            const instancedMesh = new THREE.InstancedMesh(
                this.cubeGeometry,
                material,
                positions.length
            );
            
            positions.forEach((pos, index) => {
                const matrix = new THREE.Matrix4();
                matrix.setPosition(pos.x, pos.y, pos.z);
                instancedMesh.setMatrixAt(index, matrix);
            });
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            terrainGroup.add(instancedMesh);
        });
        
        return terrainGroup;
    }

    getMaterialKey(material) {
        // Create a unique key for each material
        return material.color.getHex().toString(16);
    }

    getMaterialByKey(key) {
        const hex = parseInt(key, 16);
        const materials = this.materialManager.materials;
        
        for (const [name, material] of Object.entries(materials)) {
            if (material.color.getHex() === hex) {
                return material;
            }
        }
        
        return materials.stone; // fallback
    }

    dispose() {
        this.cubeGeometry.dispose();
    }
}