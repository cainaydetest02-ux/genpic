export enum FlowStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  UPSCALING = 'UPSCALING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export type AspectRatio = '16:9' | '9:16';

export interface FlowStep {
  id: string;
  prompt: string;
  status: FlowStatus;
  imageBase64: string | null; // The generated image
  isUpscaled?: boolean;
  error?: string;
}
