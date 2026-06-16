const fs = require('fs');
const path = require('path');

// Check all source files
const srcDir = path.join(__dirname, 'src/app');
function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.ts') || f.endsWith('.html') || f.endsWith('.scss')) {
      console.log(`  ${path.relative(path.join(__dirname, 'src'), p)}`);
    }
  });
}

console.log('Source files:');
walk(path.join(__dirname, 'src/app'));

console.log('\nConfig files:');
['package.json', 'angular.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.spec.json'].forEach(f => {
  console.log(`  ${fs.existsSync(path.join(__dirname, f)) ? '✓' : '✗'} ${f}`);
});

const nm = path.join(__dirname, 'node_modules');
if (fs.existsSync(nm)) {
  const items = fs.readdirSync(nm);
  console.log(`\nnode_modules: ${items.length} items found`);
  // Check key packages
  ['@angular/core', 'leaflet', 'rxjs', 'signature_pad', 'leaflet-routing-machine'].forEach(pkg => {
    const p = path.join(nm, ...pkg.split('/'));
    console.log(`  ${fs.existsSync(p) ? '✓' : '✗'} ${pkg}`);
  });
} else {
  console.log('\nnode_modules MISSING');
}