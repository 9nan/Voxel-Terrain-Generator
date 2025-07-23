import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.materials = this.createMaterials();
    }

    createMaterials() {
        return {
            grass: new THREE.MeshLambertMaterial({ 
                color: 0x4a7c59,
                transparent: false
            }),
            dirt: new THREE.MeshLambertMaterial({ 
                color: 0x8b6914,
                transparent: false
            }),
            stone: new THREE.MeshLambertMaterial({ 
                color: 0x666666,
                transparent: false
            }),
            deepStone: new THREE.MeshLambertMaterial({ 
                color: 0x444444,
                transparent: false
            }),
            water: new THREE.MeshLambertMaterial({ 
                color: 0x4a90e2,
                transparent: true,
                opacity: 0.8
            }),
            wood: new THREE.MeshLambertMaterial({ 
                color: 0x8b4513,
                transparent: false
            }),
            leaves: new THREE.MeshLambertMaterial({ 
                color: 0x228b22,
                transparent: false
            }),
            snow: new THREE.MeshLambertMaterial({ 
                color: 0xffffff,
                transparent: false
            })
        };
    }

    getMaterialForHeight(height, maxHeight, surfaceHeight, blockType = 'terrain') {
        if (blockType === 'water') return this.materials.water;
        if (blockType === 'wood') return this.materials.wood;
        if (blockType === 'leaves') return this.materials.leaves;
        if (blockType === 'snow') return this.materials.snow;
        
        const relativeHeight = height / maxHeight;
        const distanceFromSurface = surfaceHeight - height;

        // Snow on high peaks
        if (height === surfaceHeight && surfaceHeight > maxHeight * 0.8) {
            return this.materials.snow;
        }
        
        // Surface blocks (grass) - but not on very high mountains
        if (height === surfaceHeight && surfaceHeight > maxHeight * 0.3 && surfaceHeight <= maxHeight * 0.8) {
            return this.materials.grass;
        }
        
        // Stone surface on high mountains
        if (height === surfaceHeight && surfaceHeight > maxHeight * 0.6) {
            return this.materials.stone;
        }
        
        // Dirt layer (1-3 blocks below surface)
        if (distanceFromSurface > 0 && distanceFromSurface <= 3) {
            return this.materials.dirt;
        }
        
        // Deep stone
        if (relativeHeight < 0.2) {
            return this.materials.deepStone;
        }
        
        // Regular stone
        return this.materials.stone;
    }

    dispose() {
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
    }
}