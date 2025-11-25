#!/usr/bin/env node

/**
 * Script to replace remaining gray text in template strings and other formats
 */

const fs = require('fs');
const path = require('path');

const searchDirs = ['src/app', 'src/components'];
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

let totalFiles = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
  return extensions.some(ext => filePath.endsWith(ext));
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Replace in template strings and all formats
    content = content.replace(/text-gray-500/g, 'text-gray-900');
    content = content.replace(/text-gray-600/g, 'text-gray-900');
    content = content.replace(/text-gray-700/g, 'text-gray-900');
    
    if (content !== original) {
      const replacements = (original.match(/text-gray-(500|600|700)/g) || []).length;
      fs.writeFileSync(filePath, content, 'utf8');
      totalFiles++;
      totalReplacements += replacements;
      console.log(`✓ ${filePath} (${replacements} replacements)`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
          walkDirectory(filePath);
        }
      } else if (stats.isFile() && shouldProcessFile(filePath)) {
        processFile(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

console.log('🔍 Fixing remaining gray text...\n');

searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

console.log('\n✨ Complete!');
console.log(`📊 Summary:`);
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);

