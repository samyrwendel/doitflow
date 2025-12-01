// Script to check table IDs and test with correct names
import fetch from 'node-fetch';

const config = {
  server: process.env.VITE_NOCODB_SERVER || 'https://noco.sofia.ms/',
  projectId: process.env.VITE_NOCODB_PROJECT_ID || 'pefjgqhwsd3w98b',
  token: process.env.VITE_NOCODB_TOKEN || 'bFINveFVQCaH0nE7zm7DopnHcOKMKUCCMBNBeaqB'
};

// NocoDB API endpoints
const metaBaseUrl = `${config.server}api/v1/db/meta/projects/${config.projectId}`;
const dataBaseUrl = `${config.server}api/v1/db/data/noco/${config.projectId}`;

async function makeRequest(url, options = {}) {
  console.log('Request URL:', url);
  
  const headers = {
    'Content-Type': 'application/json',
    'xc-token': config.token,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
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

async function checkTables() {
  console.log('NocoDB Configuration:');
  console.log('Server:', config.server);
  console.log('Project ID:', config.projectId);
  console.log('Meta Base URL:', metaBaseUrl);
  console.log('Data Base URL:', dataBaseUrl);
  console.log('\n--- Getting Tables from Meta API ---\n');

  try {
    const tables = await makeRequest(`${metaBaseUrl}/tables`);
    console.log('Tables found:', tables.list?.length || 0);
    
    if (tables.list) {
      for (const table of tables.list) {
        console.log(`- ${table.title} (${table.table_name}) - ID: ${table.id}`);
        
        // Test data access with table name
        console.log(`  Testing data access with table name: ${table.table_name}`);
        try {
          const dataResult = await makeRequest(`${dataBaseUrl}/${table.table_name}?limit=1`);
          console.log(`  ✓ Data access OK (${dataResult.list?.length || 0} records)`);
        } catch (error) {
          console.log(`  ✗ Data access failed: ${error.message}`);
          
          // Try with table ID
          console.log(`  Testing data access with table ID: ${table.id}`);
          try {
            const dataResult2 = await makeRequest(`${dataBaseUrl}/${table.id}?limit=1`);
            console.log(`  ✓ Data access with ID OK (${dataResult2.list?.length || 0} records)`);
          } catch (error2) {
            console.log(`  ✗ Data access with ID failed: ${error2.message}`);
          }
        }
        console.log('');
      }
    }
  } catch (error) {
    console.log('Failed to get tables:', error.message);
  }
}

checkTables().catch(console.error);