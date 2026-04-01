const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Farmbase Enterprise Structure Refactoring...');

// 1. Move root Next.js folders to src/
const srcDirs = ['app', 'components', 'features', 'hooks', 'lib', 'store', 'utils'];
fs.mkdirSync('src', { recursive: true });

let movedCount = 0;
srcDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    // If it exists in root, move it into src
    fs.renameSync(dir, path.join('src', dir));
    movedCount++;
    console.log(`✅ Moved /${dir} to /src/${dir}`);
  }
});

// 2. Setup src/core/database and src/types
fs.mkdirSync(path.join('src', 'core', 'database'), { recursive: true });
fs.mkdirSync(path.join('src', 'types'), { recursive: true });

// Move utils/supabase files (which is now at src/utils/supabase)
if (fs.existsSync('src/utils/supabase')) {
  fs.readdirSync('src/utils/supabase').forEach(file => {
    fs.renameSync(
      path.join('src/utils/supabase', file),
      path.join('src/core/database', file)
    );
  });
  // Directory is empty, remove it safely
  try { fs.rmdirSync('src/utils/supabase'); } catch (e) { }
  console.log('✅ Centralized Supabase Configs into Core Database Modules');
}

// 3. Extract types from src/lib/supabase.ts
// Ensure the singleton is correctly exported in src/core/database/client.ts
if (fs.existsSync('src/lib/supabase.ts')) {
  const libContent = fs.readFileSync('src/lib/supabase.ts', 'utf8');
  
  // Extract types and interfaces (everything after the supabase export)
  const typesRegex = /^\/\*\* สภาพแวดล้อมที่เหมาะสมของพืช[\s\S]*?/m;
  const match = libContent.match(typesRegex);
  
  if (match) {
    const typesBlock = match[0];
    fs.writeFileSync('src/types/models.ts', typesBlock);
    console.log('✅ Extracted Database Models to src/types/models.ts');
  }

  // Update src/core/database/client.ts to export the singleton if not already
  const clientPath = 'src/core/database/client.ts';
  if (fs.existsSync(clientPath)) {
    let clientContent = fs.readFileSync(clientPath, 'utf8');
    if (!clientContent.includes('export const supabase =')) {
      clientContent += '\n// Singleton Instance Export\nexport const supabase = createClient();\n';
      fs.writeFileSync(clientPath, clientContent);
    }
  }

  // Cleanup old lib/supabase.ts
  fs.unlinkSync('src/lib/supabase.ts');
}

// 4. Update import references inside all .tsx and .ts files
function walkFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        walkFiles(fullPath, fileList);
      }
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        fileList.push(fullPath);
      }
    }
  });
  return fileList;
}

console.log('🔨 Updating Imports across codebase...');
let updatedFilesCount = 0;
const sourceFiles = walkFiles('src');

sourceFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Change @/utils/supabase/* -> @/core/database/*
  content = content.replace(/@\/utils\/supabase\//g, '@/core/database/');

  // Change @/lib/supabase -> models or core database
  if (content.includes('@/lib/supabase')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@/lib/supabase')) {
        if (lines[i].includes('type ') || lines[i].includes('interface ')) {
          if (lines[i].includes('supabase,')) {
             // import { supabase, type Crop } from '@/lib/supabase'
             lines[i] = `import type { ${lines[i].split('{')[1].split('}')[0].replace('supabase,', '').trim()} } from '@/types/models';\nimport { supabase } from '@/core/database/client';`;
          } else {
             // just type
             lines[i] = lines[i].replace('@/lib/supabase', '@/types/models');
          }
        } else if (lines[i].includes('supabase')) {
           // import { supabase } from '@/lib/supabase'
           lines[i] = lines[i].replace('@/lib/supabase', '@/core/database/client');
        } else {
           // fallback logic
           lines[i] = lines[i].replace('@/lib/supabase', '@/types/models');
        }
      }
    }
    content = lines.join('\n');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedFilesCount++;
  }
});
console.log(`✅ Updated Import Paths in ${updatedFilesCount} Files`);

// 5. Config adjustments
if (fs.existsSync('components.json')) {
  let conf = fs.readFileSync('components.json', 'utf8');
  conf = conf.replace('"css": "app/globals.css"', '"css": "src/app/globals.css"');
  fs.writeFileSync('components.json', conf);
}

if (fs.existsSync('tsconfig.json')) {
  let conf = fs.readFileSync('tsconfig.json', 'utf8');
  conf = conf.replace(/"@\/\*":\s*\["\.\/\*"\]/, '"@/*": ["./src/*"]');
  fs.writeFileSync('tsconfig.json', conf);
}

// 6. Move scripts to scripts/ folder
fs.mkdirSync('scripts', { recursive: true });
let scriptsCount = 0;
fs.readdirSync('.').forEach(file => {
  if (
    fs.statSync(file).isFile() && 
    (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.py') || file.endsWith('.sql')) &&
    !['next.config.js', 'postcss.config.js', 'refactor.js'].includes(file) // Exclude core configs + this script
  ) {
    fs.renameSync(file, path.join('scripts', file));
    scriptsCount++;
  }
});
console.log(`✅ Moved ${scriptsCount} root scripts to /scripts`);

// 7. Try empty cleanups on root just in case
srcDirs.forEach(dir => {
  try { fs.rmdirSync(dir); } catch (e) { }
});

console.log('🎉 Enterprise Refactor Complete! The Farmbase code is now clean.');
console.log('=> Please restart your development server by dropping and rerunning `npm run dev`');
