import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src/app');

/**
 * Extract template content from @Component decorator
 */
function extractTemplate(content) {
  // Match template: `...` or template: `...`\n
  const match = content.match(/template:\s*`([\s\S]*?)`\s*(?:,|\n|$)/);
  return match ? match[1] : null;
}

/**
 * Extract styles content from @Component decorator
 */
function extractStyles(content) {
  const match = content.match(/styles:\s*\[`([\s\S]*?)`\]\s*(?:,|\n|$)/);
  return match ? match[1] : null;
}

// Walk through all component files
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.component.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const compName = path.basename(filePath, '.component.ts');
  const folder = path.dirname(filePath);

  // Skip if already uses templateUrl
  if (content.includes('templateUrl:')) {
    console.log(`⏭️  ${filePath} - already split`);
    return;
  }

  const template = extractTemplate(content);
  const styles = extractStyles(content);

  if (!template && !styles) {
    console.log(`⚠️  ${filePath} - no template/styles found`);
    return;
  }

  // Write HTML file
  if (template) {
    const htmlPath = path.join(folder, `${compName}.component.html`);
    fs.writeFileSync(htmlPath, template.trim() + '\n');
    console.log(`📝 Created: ${htmlPath}`);
  }

  // Write CSS file
  if (styles) {
    const cssPath = path.join(folder, `${compName}.component.css`);
    fs.writeFileSync(cssPath, styles.trim() + '\n');
    console.log(`📝 Created: ${cssPath}`);
  }

  // Update TS file
  let newContent = content;
  if (template) {
    newContent = newContent.replace(/template:\s*`[\s\S]*?`\s*,?\s*/m, `templateUrl: './${compName}.component.html',\n  `);
  }
  if (styles) {
    newContent = newContent.replace(/styles:\s*\[`[\s\S]*?`\]\s*,?\s*/m, `styleUrls: ['./${compName}.component.css']`);
  }

  fs.writeFileSync(filePath, newContent);
  console.log(`✏️ Updated: ${filePath}`);
}

console.log('🔄 Splitting components...\n');
walkDir(srcDir);
console.log('\n✅ Done!');