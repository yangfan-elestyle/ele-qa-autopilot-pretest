export interface ServerConfig {
  openai: {
    apiKey: string;
    visionModel: string;
  };
  gemini: {
    apiKey: string;
    visionModel: string;
  };
  confluence: {
    token: string;
    email: string;
    authorization: string;
  };
}
