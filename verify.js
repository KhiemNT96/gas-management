const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const requiredFiles = [
  'package.json',
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'src/index.html',
  'src/main.ts',
  'src/styles.scss',
  'src/app/app.component.ts',
  'src/app/app.config.ts',
  'src/app/app.routes.ts',
  'src/app/models/customer.model.ts',
  'src/app/models/order.model.ts',
  'src/app/models/payment.model.ts',
  'src/app/models/dashboard.model.ts',
  'src/app/core/services/storage.service.ts',
  'src/app/core/services/customer.service.ts',
  'src/app/core/services/order.service.ts',
  'src/app/core/services/payment.service.ts',
  'src/app/core/services/toast.service.ts',
  'src/app/layouts/main-layout/main-layout.component.ts',
  'src/app/layouts/main-layout/sidebar/sidebar.component.ts',
  'src/app/layouts/main-layout/header/header.component.ts',
  'src/app/shared/components/toast/toast.component.ts',
  'src/app/features/dashboard/dashboard.component.ts',
  'src/app/features/customers/customer-list/customer-list.component.ts',
  'src/app/features/customers/customer-form/customer-form.component.ts',
  'src/app/features/customers/customer-detail/customer-detail.component.ts',
  'src/app/features/delivery/delivery-search/delivery-search.component.ts',
  'src/app/features/delivery/delivery-route/delivery-route.component.ts',
  'src/app/features/delivery/delivery-confirm/delivery-confirm.component.ts',
  'src/app/features/orders/order-list/order-list.component.ts',
  'src/app/features/orders/order-form/order-form.component.ts',
  'src/app/features/debts/debt-list/debt-list.component.ts',
  'src/assets/data/mock-customers.ts',
  'src/assets/data/mock-orders.ts'
];

let allFound = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(projectDir, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ MISSING: ${file}`);
    allFound = false;
  }
});

if (allFound) {
  console.log('\n✅ All files created successfully!');
} else {
  console.log('\n❌ Some files are missing!');
}

// Check node_modules
const nmPath = path.join(projectDir, 'node_modules');
if (fs.existsSync(nmPath)) {
  const dirs = fs.readdirSync(nmPath);
  console.log(`\nnode_modules has ${dirs.length} directories`);
} else {
  console.log('\n⚠️  node_modules not found - run npm install');
}