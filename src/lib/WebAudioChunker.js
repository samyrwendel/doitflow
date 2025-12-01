class WebAudioChunker {
  constructor() {
    this.audioContext = null;
  }

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  async getAudioDuration(file) {
    try {
      const audioContext = await this.initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.duration;
    } catch (error) {
      console.error('Erro ao obter duração do áudio:', error);
      // Fallback: estimar duração baseada no tamanho do arquivo
      // Aproximadamente 1MB = 3 minutos para áudio comprimido
      return (file.size / (1024 * 1024)) * 3 * 60;
    }
  }

  calculateOptimalChunkDuration(fileSizeBytes, totalDurationSeconds, audioBuffer = null) {
    const maxChunkSizeMB = 20; // Limite mais conservador para WAV
    
    // Se temos o audioBuffer, calcular o tamanho real do WAV
    if (audioBuffer) {
      const wavSizeBytes = 44 + (audioBuffer.length * audioBuffer.numberOfChannels * 2);
      const wavSizeMB = wavSizeBytes / (1024 * 1024);
      
      // Se o WAV completo é menor que o limite, não precisa dividir
      if (wavSizeMB <= maxChunkSizeMB) {
        return totalDurationSeconds;
      }
      
      // Calcular quantos chunks precisamos baseado no tamanho WAV
      const numberOfChunks = Math.ceil(wavSizeMB / maxChunkSizeMB);
      const chunkDuration = totalDurationSeconds / numberOfChunks;
      
      // Garantir que cada chunk tenha pelo menos 30 segundos
      return Math.max(chunkDuration, 30);
    }
    
    // Fallback: estimar baseado no arquivo original (muito conservador)
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    
    // Para arquivos comprimidos, assumir que WAV será ~6x maior
    const estimatedWavSizeMB = fileSizeMB * 6;
    
    if (estimatedWavSizeMB <= maxChunkSizeMB) {
      return totalDurationSeconds;
    }
    
    const numberOfChunks = Math.ceil(estimatedWavSizeMB / maxChunkSizeMB);
    const chunkDuration = totalDurationSeconds / numberOfChunks;
    
    return Math.max(chunkDuration, 30);
  }

  async createTimeBasedChunks(file, chunkDurationSeconds) {
    try {
      const audioContext = await this.initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const totalDuration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      
      const chunks = [];
      let currentTime = 0;
      let chunkIndex = 0;

      while (currentTime < totalDuration) {
        const endTime = Math.min(currentTime + chunkDurationSeconds, totalDuration);
        const chunkDuration = endTime - currentTime;
        
        // Criar um novo AudioBuffer para este chunk
        const chunkSamples = Math.floor(chunkDuration * sampleRate);
        
        // Garantir que o chunk tenha pelo menos 1 frame
        if (chunkSamples <= 0) {
          currentTime = endTime;
          continue;
        }
        
        const chunkBuffer = audioContext.createBuffer(numberOfChannels, chunkSamples, sampleRate);
        
        // Copiar dados do buffer original para o chunk
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const originalData = audioBuffer.getChannelData(channel);
          const chunkData = chunkBuffer.getChannelData(channel);
          const startSample = Math.floor(currentTime * sampleRate);
          
          for (let i = 0; i < chunkSamples; i++) {
            chunkData[i] = originalData[startSample + i] || 0;
          }
        }

        // Converter AudioBuffer para WAV Blob
        const wavBlob = this.audioBufferToWav(chunkBuffer);
        
        chunks.push({
          blob: wavBlob,
          index: chunkIndex,
          startTime: currentTime,
          endTime: endTime,
          duration: chunkDuration
        });

        currentTime = endTime;
        chunkIndex++;
      }

      return chunks;
    } catch (error) {
      console.error('Erro ao criar chunks baseados em tempo:', error);
      throw error;
    }
  }

  audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2;
    
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async processFile(file) {
    try {
      const duration = await this.getAudioDuration(file);
      
      // Decodificar o áudio para calcular o tamanho real do WAV
      const audioContext = await this.initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const chunkDuration = this.calculateOptimalChunkDuration(file.size, duration, audioBuffer);
      
      // Se não precisa dividir, retorna o arquivo original
      if (chunkDuration >= duration) {
        return [{
          blob: file,
          index: 0,
          startTime: 0,
          endTime: duration,
          duration: duration
        }];
      }
      
      return await this.createTimeBasedChunks(file, chunkDuration);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw error;
    }
  }
}

export default WebAudioChunker;