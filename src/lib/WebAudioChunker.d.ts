export interface ChunkResult {
  text: any;
  startTime: any;
  endTime: any;
  index: number;
}

export interface ProcessedChunk {
  blob: Blob;
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
}

declare class WebAudioChunker {
  audioContext: AudioContext | null;
  
  constructor();
  
  initAudioContext(): Promise<AudioContext>;
  
  getAudioDuration(file: File): Promise<number>;
  
  calculateOptimalChunkDuration(
    fileSizeBytes: number, 
    totalDurationSeconds: number, 
    audioBuffer?: AudioBuffer | null
  ): number;
  
  createTimeBasedChunks(file: File, chunkDurationSeconds: number): Promise<ProcessedChunk[]>;
  
  audioBufferToWav(audioBuffer: AudioBuffer): Blob;
  
  processFile(file: File): Promise<ProcessedChunk[]>;
}

export default WebAudioChunker;