export interface EvolutionInstance {
  instanceName: string;
  status: string;
}

export class EvolutionService {
  private static apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private static apiKey = process.env.EVOLUTION_API_KEY || '';
  private static defaultInstance = process.env.EVOLUTION_INSTANCE_NAME || 'clinikzap';

  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  /**
   * Helper to ensure the Evolution API instance is created and has the webhook registered.
   */
  static async initInstance(instanceName: string = this.defaultInstance): Promise<void> {
    try {
      console.log(`[EvolutionService] Initializing instance "${instanceName}"...`);
      const exists = await this.instanceExists(instanceName);
      
      if (!exists) {
        console.log(`[EvolutionService] Instance "${instanceName}" not found. Creating...`);
        await this.createInstance(instanceName);
      } else {
        console.log(`[EvolutionService] Instance "${instanceName}" already exists.`);
      }

      await this.registerWebhook(instanceName);
    } catch (error) {
      console.error('[EvolutionService] Failed to initialize instance:', error);
      throw error;
    }
  }

  /**
   * Checks if an instance exists
   */
  static async instanceExists(instanceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: this.getHeaders(),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch instances: ${response.statusText}`);
      }

      const data = await response.json();
      const instances = Array.isArray(data) ? data : [];
      return instances.some((inst: { name?: string; instanceName?: string }) => inst.name === instanceName || inst.instanceName === instanceName);
    } catch (error) {
      console.error(`[EvolutionService] Error checking if instance exists:`, error);
      return false;
    }
  }

  /**
   * Creates a new instance
   */
  static async createInstance(instanceName: string): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}/instance/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        instanceName: instanceName,
        token: this.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create instance: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Configures the webhook for the instance
   */
  static async registerWebhook(instanceName: string = this.defaultInstance): Promise<unknown> {
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[EvolutionService] NEXT_PUBLIC_WEBHOOK_URL is not defined. Skipping webhook registration.');
      return;
    }

    console.log(`[EvolutionService] Registering webhook url "${webhookUrl}" on instance "${instanceName}"...`);
    const response = await fetch(`${this.apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events: ['MESSAGES_UPSERT'],
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set webhook: ${response.status} - ${errorText}`);
    }

    console.log(`[EvolutionService] Webhook registered successfully.`);
    return response.json();
  }

  /**
   * Sends a text message to a specific number
   */
  static async sendTextMessage(phone: string, text: string, instanceName: string = this.defaultInstance): Promise<unknown> {
    // Standardize phone format (remove non-digits and ensure E.164 without prefix + is supported by Evolution API)
    const cleanPhone = phone.replace(/\D/g, '');

    const response = await fetch(`${this.apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fetches the connection state of the instance
   */
  static async getConnectionState(instanceName: string = this.defaultInstance): Promise<{ instance: { state: string } }> {
    const response = await fetch(`${this.apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch connection state: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<{ instance: { state: string } }>;
  }

  /**
   * Gets the base64 QR code or pairing code to connect WhatsApp
   */
  static async getConnectQr(instanceName: string = this.defaultInstance): Promise<{ base64?: string; code?: string }> {
    const response = await fetch(`${this.apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get connection QR code: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<{ base64?: string; code?: string }>;
  }

  /**
   * Logs out (disconnects) the instance from WhatsApp
   */
  static async logoutInstance(instanceName: string = this.defaultInstance): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}/instance/logout/${instanceName}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to logout instance: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}
