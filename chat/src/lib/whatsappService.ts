import { toast } from "sonner";

// Função local para formatação de números
function formatWhatsAppNumber(number: string): string | null {
  if (!number) return null;
  
  // Remove todos os caracteres não numéricos
  const cleaned = number.replace(/\D/g, '');
  
  // Verifica se tem pelo menos 10 dígitos
  if (cleaned.length < 10) return null;
  
  // Se não tem código do país, adiciona 55 (Brasil)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // Se já tem código do país
  if (cleaned.length >= 12) {
    return cleaned;
  }
  
  return null;
}

const BATCH_SIZE = 50;
const BATCH_DELAY = 1000;

export interface WhatsAppValidationResult {
  number: string;
  originalNumber: string;
  exists: boolean;
  profilePictureUrl?: string;
}

export interface ValidationProgress {
  current: number;
  total: number;
  results: WhatsAppValidationResult[];
}

async function validateBatch(
  batch: string[],
  instancia: string,
  apiKey: string,
  evolutionUrl: string,
  retryCount = 0
): Promise<{ number: string; exists: boolean }[]> {
  try {
    const response = await fetch(`${evolutionUrl}/chat/whatsappNumbers/${instancia}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({ numbers: batch })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      
      if (response.status === 401) {
        toast.error("Erro de autenticação", {
          description: "Verifique sua chave API e instância"
        });
        throw new Error('Credenciais inválidas');
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    return batch.map(number => ({
      number,
      exists: data.some((result: unknown) => 
        typeof result === 'object' && result !== null && 
        'number' in result && 'exists' in result &&
        (result as { number: string; exists: boolean }).number === number && 
        (result as { number: string; exists: boolean }).exists === true
      )
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT') {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return validateBatch(batch, instancia, apiKey, evolutionUrl, retryCount + 1);
      }
    }
    throw error;
  }
}

export async function validateWhatsAppNumbers(
  instancia: string,
  apiKey: string,
  phoneNumbers: string[],
  evolutionUrl: string,
  onProgress?: (progress: ValidationProgress) => void
): Promise<WhatsAppValidationResult[]> {
  if (!instancia || !apiKey || !evolutionUrl) {
    toast.error("Configuração incompleta", {
      description: "Verifique as configurações da API"
    });
    throw new Error('Configuração incompleta');
  }

  const allResults: WhatsAppValidationResult[] = [];
  const numberMap = new Map<string, string>();
  const validNumbers = phoneNumbers
    .map(number => number.trim())
    .filter(number => number)
    .map(originalNumber => {
      const formatted = formatWhatsAppNumber(originalNumber);
      if (formatted) {
        numberMap.set(formatted, originalNumber);
      }
      return formatted;
    })
    .filter((number): number is string => !!number);

  if (!validNumbers.length) {
    toast.error("Números inválidos", {
      description: "Nenhum número válido para verificação"
    });
    throw new Error('Nenhum número válido para verificação');
  }

  const batches = [];
  for (let i = 0; i < validNumbers.length; i += BATCH_SIZE) {
    batches.push(validNumbers.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    try {
      const batchResultsRaw = await validateBatch(
        batches[i],
        instancia,
        apiKey,
        evolutionUrl
      );

      const batchResults: WhatsAppValidationResult[] = batchResultsRaw.map(rawResult => ({
        number: rawResult.number,
        exists: rawResult.exists,
        originalNumber: numberMap.get(rawResult.number) || rawResult.number
      }));

      allResults.push(...batchResults);

      if (onProgress) {
        onProgress({
          current: allResults.length,
          total: validNumbers.length,
          results: allResults
        });
      }

      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error("Erro na validação", {
        description: message
      });
      throw error;
    }
  }

  return allResults;
}

async function fetchProfilePicture(
  number: string,
  instancia: string,
  apiKey: string,
  evolutionUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${instancia}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({ number })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.profilePictureUrl || null;
  } catch (error) {
    return null;
  }
}

export async function fetchProfilePicturesForResults(
  instancia: string,
  apiKey: string,
  results: WhatsAppValidationResult[],
  evolutionUrl: string,
  onProgress?: (progress: { current: number, total: number, currentNumber: string }) => void
): Promise<WhatsAppValidationResult[]> {
  // Validação de entrada
  if (!Array.isArray(results)) {
    throw new Error('Results deve ser um array');
  }
  
  const validResults = results.filter(r => r.exists);
  const resultsWithProfile: WhatsAppValidationResult[] = [...results];
  
  for (let i = 0; i < validResults.length; i++) {
    const result = validResults[i];
    const profilePictureUrl = await fetchProfilePicture(
      result.number,
      instancia,
      apiKey,
      evolutionUrl
    );
    
    // Atualiza o resultado com a foto de perfil
    const resultIndex = resultsWithProfile.findIndex(r => r.number === result.number);
    if (resultIndex !== -1) {
      resultsWithProfile[resultIndex] = {
        ...resultsWithProfile[resultIndex],
        profilePictureUrl: profilePictureUrl || undefined
      };
    }
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: validResults.length,
        currentNumber: result.number
      });
    }
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return resultsWithProfile;
}

export async function validateWhatsAppNumbersWithProfile(
  instancia: string,
  apiKey: string,
  phoneNumbers: string[],
  evolutionUrl: string,
  onProgress?: (progress: ValidationProgress) => void
): Promise<WhatsAppValidationResult[]> {
  // Primeiro faz a validação normal
  const validationResults = await validateWhatsAppNumbers(
    instancia,
    apiKey,
    phoneNumbers,
    evolutionUrl,
    onProgress
  );

  // Para números válidos, busca a foto de perfil
  const resultsWithProfile = await fetchProfilePicturesForResults(
    instancia,
    apiKey,
    validationResults,
    evolutionUrl
  );

  return resultsWithProfile;
}