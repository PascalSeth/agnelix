/* eslint-disable */
const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, '..', 'public', 'animations', 'Waving.fbx.glb');

try {
  console.log(`Checking GLB file: ${glbPath}`);
  
  if (!fs.existsSync(glbPath)) {
    console.error('Error: File does not exist.');
    process.exit(1);
  }

  const fileStats = fs.statSync(glbPath);
  console.log(`File Size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

  const buffer = fs.readFileSync(glbPath);

  // GLB Header parsing
  const magic = buffer.toString('utf8', 0, 4);
  const version = buffer.readUInt32LE(4);
  const totalLength = buffer.readUInt32LE(8);

  console.log('\n--- GLB Header ---');
  console.log(`Magic: "${magic}" (Expected: "glTF")`);
  console.log(`Version: ${version} (Expected: 2)`);
  console.log(`Total Length: ${totalLength} bytes (File Size matches: ${totalLength === fileStats.size})`);

  if (magic !== 'glTF') {
    console.error('Error: Invalid GLB file magic header.');
    process.exit(1);
  }

  if (version !== 2) {
    console.error('Error: Unsupported glTF version. Expected version 2.');
    process.exit(1);
  }

  // Chunk 0 (JSON metadata) parsing
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);

  console.log('\n--- Chunk 0 (JSON Metadata) ---');
  console.log(`Length: ${chunkLength} bytes`);
  console.log(`Type: 0x${chunkType.toString(16)} (Expected: 0x4e4f534a for "JSON")`);

  if (chunkType !== 0x4e4f534a) {
    console.error('Error: First chunk is not JSON metadata.');
    process.exit(1);
  }

  const jsonStart = 20;
  const jsonEnd = jsonStart + chunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  
  let gltf;
  try {
    gltf = JSON.parse(jsonString);
    console.log('JSON metadata parsed successfully!');
  } catch (err) {
    console.error('Error: Failed to parse GLB JSON metadata:', err.message);
    process.exit(1);
  }

  // Inspect structure
  console.log('\n--- Model Structure ---');
  console.log(`Asset Info: ${JSON.stringify(gltf.asset || {})}`);
  console.log(`Nodes Count: ${gltf.nodes ? gltf.nodes.length : 0}`);
  console.log(`Meshes Count: ${gltf.meshes ? gltf.meshes.length : 0}`);
  console.log(`Materials Count: ${gltf.materials ? gltf.materials.length : 0}`);
  console.log(`Skins Count: ${gltf.skins ? gltf.skins.length : 0}`);
  console.log(`Textures Count: ${gltf.textures ? gltf.textures.length : 0}`);
  console.log(`Images Count: ${gltf.images ? gltf.images.length : 0}`);

  if (gltf.extensionsUsed) {
    console.log(`Extensions Used: ${gltf.extensionsUsed.join(', ')}`);
  }

  // Inspect animations
  console.log('\n--- Animations ---');
  if (gltf.animations && gltf.animations.length > 0) {
    console.log(`Found ${gltf.animations.length} animation(s):`);
    gltf.animations.forEach((anim, idx) => {
      console.log(`  - Animation #${idx}: Name: "${anim.name || 'Unnamed'}"`);
      console.log(`    Channels: ${anim.channels ? anim.channels.length : 0}`);
      console.log(`    Samplers: ${anim.samplers ? anim.samplers.length : 0}`);
    });
  } else {
    console.log('No animations found inside the GLB model.');
  }

  // Inspect meshes and materials
  if (gltf.materials) {
    console.log('\n--- Materials List ---');
    gltf.materials.forEach((mat, idx) => {
      console.log(`  - Material #${idx}: Name: "${mat.name || 'Unnamed'}"`);
      if (mat.pbrMetallicRoughness) {
        console.log(`    PBR Base Color: ${JSON.stringify(mat.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1])}`);
        console.log(`    Roughness: ${mat.pbrMetallicRoughness.roughnessFactor ?? 1}`);
        console.log(`    Metalness: ${mat.pbrMetallicRoughness.metallicFactor ?? 1}`);
      }
    });
  }

  console.log('\nConclusion: The GLB file structure is valid and healthy!');

} catch (err) {
  console.error('An unexpected error occurred during parsing:', err);
  process.exit(1);
}
