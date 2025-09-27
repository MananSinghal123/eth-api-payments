export interface SubstreamConfig {
  apiKey: string;
  endpoint: string;
  timeout: number;
}

export interface SubstreamResponse<T> {
  data: T;
  error?: string;
}

export interface SubstreamEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}