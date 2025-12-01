const publicKey = import.meta.env.VITE_ILOVEPDF_PUBLIC_KEY;

async function getAuthToken(): Promise<string> {
  const response = await fetch('https://api.ilovepdf.com/v1/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_key: publicKey }),
  });
  if (!response.ok) {
    throw new Error('Failed to authenticate with iLovePDF');
  }
  const data = await response.json();
  return data.token;
}

async function startTask(token: string, tool: string): Promise<{ server: string; task: string }> {
  const response = await fetch(`https://api.ilovepdf.com/v1/start/${tool}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to start task on iLovePDF');
  }
  return response.json();
}

async function uploadFile(server: string, task: string, token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('task', task);
  formData.append('file', file);

  const response = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload file to iLovePDF');
  }
  const data = await response.json();
  return data.server_filename;
}

async function processTask(server: string, task: string, token: string, serverFilename: string, tool: string, originalFilename: string, compressionLevel: string): Promise<any> {
  const response = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task,
      tool,
      compression_level: compressionLevel,
      files: [
        {
          server_filename: serverFilename,
          filename: originalFilename,
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to process file on iLovePDF');
  }
  return response.json();
}

async function downloadFile(server: string, task: string, token: string): Promise<Blob> {
  const response = await fetch(`https://${server}/v1/download/${task}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to download file from iLovePDF');
  }
  return response.blob();
}

export async function compressPdf(file: File, compressionLevel: string): Promise<Blob> {
  try {
    const token = await getAuthToken();
    const { server, task } = await startTask(token, 'compress');
    const serverFilename = await uploadFile(server, task, token, file);
    await processTask(server, task, token, serverFilename, 'compress', file.name, compressionLevel);
    const compressedBlob = await downloadFile(server, task, token);
    return compressedBlob;
  } catch (error) {
    console.error('Error compressing PDF with iLovePDF:', error);
    throw error;
  }
}