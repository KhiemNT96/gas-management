/**
 * Gas Management - Google Sheets REST API
 * 
 * Cách dùng:
 * 1. Vào Google Sheet: Extensions → Apps Script
 * 2. Copy toàn bộ code này vào
 * 3. Deploy: Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy URL Web App và dán vào Angular environment
 */

// ============================================================
// CONFIG
// ============================================================
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const API_KEY = 'gas-management-key-2024'; // Khóa đơn giản để bảo vệ API

// Sheet tab names
const SHEETS = {
  customers: { name: 'customers', headers: ['id','name','phone','address','area','note','latitude','longitude','currentDebt','gasDebt','stoveDebt','lastPurchaseDate','photoUrl','createdAt','updatedAt'] },
  orders: { name: 'orders', headers: ['id','customerId','customerName','orderDate','deliveryDate','items','totalAmount','paidAmount','debtAmount','status','note','createdAt','updatedAt'] },
  payments: { name: 'payments', headers: ['id','customerId','customerName','type','amount','paymentDate','note','createdAt'] },
  inventory: { name: 'inventory', headers: ['id','size','label','quantity','lastUpdated','note'] },
  inventoryTx: { name: 'inventoryTx', headers: ['id','date','type','itemSize','itemLabel','quantity','price','note'] },
  settings: { name: 'settings', headers: ['key','value'] },
};

// ============================================================
// GET
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action || 'getCollection';
    const collection = e.parameter.collection;
    const id = e.parameter.id;
    
    // Verify API key
    if (e.parameter.apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' }, 403);
    }
    
    // Validate collection
    if (!collection || !SHEETS[collection]) {
      return createResponse({ error: 'Invalid collection: ' + collection }, 400);
    }
    
    let result;
    
    switch (action) {
      case 'getCollection':
        result = getSheetData(collection);
        break;
      case 'getById':
        if (!id) return createResponse({ error: 'Missing id' }, 400);
        result = getById(collection, id);
        break;
      case 'getByField':
        const field = e.parameter.field;
        const value = e.parameter.value;
        if (!field || value === undefined) return createResponse({ error: 'Missing field or value' }, 400);
        result = getByField(collection, field, value);
        break;
      default:
        return createResponse({ error: 'Invalid action: ' + action }, 400);
    }
    
    return createResponse({ success: true, data: result });
    
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

// ============================================================
// POST (Create)
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const collection = data.collection;
    const item = data.item;
    const apiKey = data.apiKey || e.parameter.apiKey;
    
    if (apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' }, 403);
    }
    if (!collection || !SHEETS[collection]) {
      return createResponse({ error: 'Invalid collection' }, 400);
    }
    if (!item) {
      return createResponse({ error: 'Missing item data' }, 400);
    }
    
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    
    const sheet = getOrCreateSheet(collection);
    const headers = SHEETS[collection].headers;
    const newRow = headers.map(h => item[h] !== undefined ? item[h] : '');
    sheet.appendRow(newRow);
    
    // Sync all data to localStorage for offline support
    syncToLocalStorage(collection);
    
    return createResponse({ success: true, data: item });
    
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

// ============================================================
// PUT (Update)
// ============================================================
function doPut(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const collection = data.collection;
    const id = data.id;
    const changes = data.changes;
    const apiKey = data.apiKey || e.parameter.apiKey;
    
    if (apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' }, 403);
    }
    if (!collection || !SHEETS[collection]) {
      return createResponse({ error: 'Invalid collection' }, 400);
    }
    if (!id || !changes) {
      return createResponse({ error: 'Missing id or changes' }, 400);
    }
    
    changes.updatedAt = new Date().toISOString();
    
    const sheet = getOrCreateSheet(collection);
    const headers = SHEETS[collection].headers;
    const dataRange = sheet.getDataRange().getValues();
    
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === id) {
        const row = dataRange[i];
        for (let j = 0; j < headers.length; j++) {
          if (changes[headers[j]] !== undefined) {
            sheet.getRange(i + 1, j + 1).setValue(changes[headers[j]]);
          }
        }
        break;
      }
    }
    
    // Sync all data to localStorage
    syncToLocalStorage(collection);
    
    return createResponse({ success: true, data: changes });
    
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

// ============================================================
// DELETE
// ============================================================
function doDelete(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const collection = data.collection;
    const id = data.id;
    const apiKey = data.apiKey || e.parameter.apiKey;
    
    if (apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' }, 403);
    }
    if (!collection || !SHEETS[collection]) {
      return createResponse({ error: 'Invalid collection' }, 400);
    }
    if (!id) {
      return createResponse({ error: 'Missing id' }, 400);
    }
    
    const sheet = getOrCreateSheet(collection);
    const dataRange = sheet.getDataRange().getValues();
    
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === id) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    
    syncToLocalStorage(collection);
    return createResponse({ success: true });
    
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

// ============================================================
// SYNC (for GET requests with action=sync)
// ============================================================
function syncAll() {
  const allData = {};
  for (const key in SHEETS) {
    allData[key] = getSheetData(key);
  }
  return allData;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const config = SHEETS[name];
    if (config) {
      sheet.appendRow(config.headers);
      sheet.setFrozenRows(1);
      // Bold header row
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
    }
  }
  
  return sheet;
}

function getSheetData(collection) {
  const config = SHEETS[collection];
  if (!config) return [];
  
  const sheet = getOrCreateSheet(collection);
  const values = sheet.getDataRange().getValues();
  
  if (values.length < 2) return [];
  
  const headers = values[0];
  const result = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      // Convert numeric strings to numbers
      const val = values[i][j];
      const header = headers[j];
      if (typeof val === 'string' && val === '') {
        row[header] = null;
      } else if (header === 'latitude' || header === 'longitude' || 
                 header === 'currentDebt' || header === 'gasDebt' || 
                 header === 'stoveDebt' || header === 'quantity' ||
                 header === 'price' || header === 'amount' ||
                 header === 'paidAmount' || header === 'debtAmount' ||
                 header === 'totalAmount') {
        row[header] = Number(val) || 0;
      } else {
        row[header] = val;
      }
    }
    result.push(row);
  }
  
  return result;
}

function getById(collection, id) {
  const data = getSheetData(collection);
  return data.find(item => item.id === id) || null;
}

function getByField(collection, field, value) {
  const data = getSheetData(collection);
  return data.filter(item => item[field] == value);
}

function syncToLocalStorage(collection) {
  // This function can be extended to save to Script Properties
  // for faster access, but for now just return success
}

function createResponse(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}