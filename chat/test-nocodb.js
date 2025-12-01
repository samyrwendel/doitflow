// Test NocoDB connection and tables
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  server: process.env.VITE_NOCODB_SERVER || 'https://noco.sofia.ms/',
  projectId: process.env.VITE_NOCODB_PROJECT_ID || 'pefjgqhwsd3w98b',
  token: process.env.VITE_NOCODB_TOKEN || 'bFINveFVQCaH0nE7zm7DopnHcOKMKUCCMBNBeaqB'
};

const baseUrl = `${config.server}api/v1/db/data/noco/${config.projectId}`;

async function makeRequest(endpoint) {
  const url = `${baseUrl}/${endpoint}`;
  console.log('Testing URL:', url);
  
  const headers = {
    'Content-Type': 'application/json',
    'xc-token': config.token
  };

  try {
    const response = await fetch(url, { headers });
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

async function testTables() {
  console.log('NocoDB Configuration:');
  console.log('Server:', config.server);
  console.log('Project ID:', config.projectId);
  console.log('Token:', config.token ? 'Set' : 'Not set');
  console.log('Base URL:', baseUrl);
  console.log('\n--- Testing Tables ---\n');

  // Using table IDs instead of names
const tables = {
  'chat_messages': 'm4h0lrwoknoggo9',
  'log_entries': 'mauu7kukmkdceqv', 
  'backlog_items': 'ma5926lg94aepfg',
  'users': 'm8pfz3olldo1aa4',
  'user_sessions': 'mkjtcedk8odkyah'
};
  
  for (const [tableName, tableId] of Object.entries(tables)) {
    console.log(`Testing table: ${tableName} (ID: ${tableId})`);
    try {
      const result = await makeRequest(`${tableId}?limit=1`);
      console.log(`✓ ${tableName}: OK (${result.list ? result.list.length : 0} records found)`);
    } catch (error) {
      console.log(`✗ ${tableName}: FAILED - ${error.message}`);
    }
    console.log('');
  }

  // Test getting all tables
  console.log('--- Getting all available tables ---');
  try {
    const allTables = await makeRequest('');
    console.log('Available tables:', JSON.stringify(allTables, null, 2));
  } catch (error) {
    console.log('Failed to get tables list:', error.message);
  }
}

testTables().catch(console.error);