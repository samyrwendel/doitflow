// Script to create missing tables in NocoDB
import fetch from 'node-fetch';
import fs from 'fs';

const config = {
  server: process.env.VITE_NOCODB_SERVER || 'https://noco.sofia.ms/',
  projectId: process.env.VITE_NOCODB_PROJECT_ID || 'pefjgqhwsd3w98b',
  token: process.env.VITE_NOCODB_TOKEN || 'bFINveFVQCaH0nE7zm7DopnHcOKMKUCCMBNBeaqB'
};

// NocoDB API endpoints for table creation
const baseUrl = `${config.server}api/v1/db/meta/projects/${config.projectId}`;

async function makeRequest(endpoint, options = {}) {
  const url = `${baseUrl}/${endpoint}`;
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

// Table definitions
const tables = [
  {
    table_name: 'chat_messages',
    title: 'Chat Messages',
    columns: [
      {
        column_name: 'id',
        title: 'ID',
        uidt: 'ID',
        pk: true,
        ai: true
      },
      {
        column_name: 'session_id',
        title: 'Session ID',
        uidt: 'SingleLineText'
      },
      {
        column_name: 'message',
        title: 'Message',
        uidt: 'LongText',
        rqd: true
      },
      {
        column_name: 'sender',
        title: 'Sender',
        uidt: 'SingleLineText',
        rqd: true
      },
      {
        column_name: 'timestamp',
        title: 'Timestamp',
        uidt: 'DateTime',
        cdf: 'CURRENT_TIMESTAMP'
      },
      {
        column_name: 'metadata',
        title: 'Metadata',
        uidt: 'JSON'
      }
    ]
  },
  {
    table_name: 'log_entries',
    title: 'Log Entries',
    columns: [
      {
        column_name: 'id',
        title: 'ID',
        uidt: 'ID',
        pk: true,
        ai: true
      },
      {
        column_name: 'level',
        title: 'Level',
        uidt: 'SingleLineText',
        rqd: true
      },
      {
        column_name: 'message',
        title: 'Message',
        uidt: 'LongText',
        rqd: true
      },
      {
        column_name: 'timestamp',
        title: 'Timestamp',
        uidt: 'DateTime',
        cdf: 'CURRENT_TIMESTAMP'
      },
      {
        column_name: 'source',
        title: 'Source',
        uidt: 'SingleLineText'
      },
      {
        column_name: 'metadata',
        title: 'Metadata',
        uidt: 'JSON'
      }
    ]
  },
  {
    table_name: 'backlog_items',
    title: 'Backlog Items',
    columns: [
      {
        column_name: 'id',
        title: 'ID',
        uidt: 'ID',
        pk: true,
        ai: true
      },
      {
        column_name: 'title',
        title: 'Title',
        uidt: 'SingleLineText',
        rqd: true
      },
      {
        column_name: 'description',
        title: 'Description',
        uidt: 'LongText'
      },
      {
        column_name: 'status',
        title: 'Status',
        uidt: 'SingleLineText',
        cdf: 'pending'
      },
      {
        column_name: 'priority',
        title: 'Priority',
        uidt: 'SingleLineText',
        cdf: 'medium'
      },
      {
        column_name: 'created_at',
        title: 'Created At',
        uidt: 'DateTime',
        cdf: 'CURRENT_TIMESTAMP'
      },
      {
        column_name: 'updated_at',
        title: 'Updated At',
        uidt: 'DateTime',
        cdf: 'CURRENT_TIMESTAMP'
      },
      {
        column_name: 'assigned_to',
        title: 'Assigned To',
        uidt: 'SingleLineText'
      },
      {
        column_name: 'metadata',
        title: 'Metadata',
        uidt: 'JSON'
      }
    ]
  }
];

async function createTables() {
  console.log('NocoDB Configuration:');
  console.log('Server:', config.server);
  console.log('Project ID:', config.projectId);
  console.log('Token:', config.token ? 'Set' : 'Not set');
  console.log('Base URL:', baseUrl);
  console.log('\n--- Creating Tables ---\n');

  for (const tableConfig of tables) {
    console.log(`Creating table: ${tableConfig.table_name}`);
    try {
      const result = await makeRequest('tables', {
        method: 'POST',
        body: JSON.stringify(tableConfig)
      });
      console.log(`✓ ${tableConfig.table_name}: Created successfully`);
      console.log('Table ID:', result.id);
    } catch (error) {
      console.log(`✗ ${tableConfig.table_name}: FAILED - ${error.message}`);
    }
    console.log('');
  }
}

createTables().catch(console.error);