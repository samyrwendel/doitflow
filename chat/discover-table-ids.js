import dotenv from 'dotenv';
dotenv.config();

const config = {
  server: process.env.VITE_NOCODB_SERVER,
  projectId: process.env.VITE_NOCODB_PROJECT_ID,
  token: process.env.VITE_NOCODB_TOKEN
};

const baseUrl = `${config.server}api/v1/db/meta/projects/${config.projectId}/tables`;

console.log('NocoDB Configuration:');
console.log('Server:', config.server);
console.log('Project ID:', config.projectId);
console.log('Token:', config.token ? 'Set' : 'Not set');
console.log('Base URL:', baseUrl);
console.log('');

async function discoverTableIds() {
  try {
    const response = await fetch(baseUrl, {
      headers: {
        'Content-Type': 'application/json',
        'xc-token': config.token
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch tables:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('--- Available Tables ---');
    
    if (data.list && Array.isArray(data.list)) {
      data.list.forEach(table => {
        console.log(`Table: ${table.table_name || table.title}`);
        console.log(`  ID: ${table.id}`);
        console.log(`  Title: ${table.title}`);
        console.log(`  Type: ${table.type}`);
        console.log('');
      });
      
      console.log('--- Table ID Mapping ---');
      const tableMapping = {};
      data.list.forEach(table => {
        const tableName = table.table_name || table.title;
        tableMapping[tableName] = table.id;
        console.log(`${tableName}: '${table.id}',`);
      });
      
    } else {
      console.log('No tables found or unexpected response format');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error discovering table IDs:', error);
  }
}

discoverTableIds();