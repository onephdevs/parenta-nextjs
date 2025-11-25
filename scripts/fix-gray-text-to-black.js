#!/usr/bin/env node

/**
 * Script to replace all gray text (text-gray-500, text-gray-600, text-gray-700) 
 * with black text (text-gray-900) across the entire application
 */

const fs = require('fs');
const path = require('path');

// Directories to search
const searchDirs = [
  'src/app',
  'src/components',
];

// File extensions to process
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

// Replacements to make
const replacements = [
  { from: /className="([^"]*?)text-gray-500([^"]*?)"/g, to: 'className="$1text-gray-900$2"' },
  { from: /className="([^"]*?)text-gray-600([^"]*?)"/g, to: 'className="$1text-gray-900$2"' },
  { from: /className="([^"]*?)text-gray-700([^"]*?)"/g, to: 'className="$1text-gray-900$2"' },
];

let totalFiles = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
  return extensions.some(ext => filePath.endsWith(ext));
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;

    replacements.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        fileChanged = true;
        fileReplacements += matches.length;
      }
    });

    if (fileChanged) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFiles++;
      totalReplacements += fileReplacements;
      console.log(`✓ ${filePath} (${fileReplacements} replacements)`);
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
        // Skip node_modules and .next
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

console.log('🔍 Searching for gray text (text-gray-500, text-gray-600, text-gray-700)...\n');

searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📂 Processing ${dir}/\n`);
    walkDirectory(dir);
  }
});

console.log('\n✨ Complete!');
console.log(`📊 Summary:`);
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);

