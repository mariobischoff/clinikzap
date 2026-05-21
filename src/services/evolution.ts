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
   * Helper to perform fetch requests with a timeout
   */
  private static async fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const { timeout = 5000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(id);
    }
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

      // Configure instance settings (disable history sync, ignore groups)
      await this.setSettings(instanceName);

      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
      if (webhookUrl) {
        const isConfigured = await this.isWebhookConfigured(instanceName, webhookUrl);
        if (!isConfigured) {
          await this.registerWebhook(instanceName);
        } else {
          console.log(`[EvolutionService] Webhook is already configured and matching for "${instanceName}". Skipping registration.`);
        }
      } else {
        console.warn('[EvolutionService] NEXT_PUBLIC_WEBHOOK_URL is not defined. Skipping webhook registration.');
      }
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
      const response = await this.fetchWithTimeout(`${this.apiUrl}/instance/fetchInstances`, {
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
    const response = await this.fetchWithTimeout(`${this.apiUrl}/instance/create`, {
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
    const response = await this.fetchWithTimeout(`${this.apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
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
   * Configures low-bandwidth settings for the instance
   */
  static async setSettings(instanceName: string = this.defaultInstance): Promise<unknown> {
    console.log(`[EvolutionService] Configuring low-bandwidth and privacy settings for "${instanceName}"...`);
    const response = await this.fetchWithTimeout(`${this.apiUrl}/settings/set/${instanceName}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        rejectCall: false,
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set settings: ${response.status} - ${errorText}`);
    }

    console.log(`[EvolutionService] Settings configured successfully for "${instanceName}".`);
    return response.json();
  }

  /**
   * Checks if webhook is configured for the instance and matches the expected URL
   */
  static async isWebhookConfigured(instanceName: string, expectedUrl: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.apiUrl}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: this.getHeaders(),
        cache: 'no-store',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      // If webhook is defined, enabled, and points to the same url, return true
      return !!(data && data.enabled === true && data.url === expectedUrl);
    } catch (error) {
      console.error(`[EvolutionService] Error checking webhook configuration for ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Sends a text message to a specific number
   */
  static async sendTextMessage(phone: string, text: string, instanceName: string = this.defaultInstance): Promise<unknown> {
    // Standardize phone format (remove non-digits and ensure E.164 without prefix + is supported by Evolution API)
    const cleanPhone = phone.replace(/\D/g, '');

    if (process.env.NODE_ENV === 'development' && process.env.EVOLUTION_SEND_IN_DEV !== 'true') {
      console.log(`[Development Mode] Intercepted WhatsApp message to ${cleanPhone}:`);
      console.log(`Message Content:\n${text}`);
      return { success: true, message: 'Message logged to console in development environment' };
    }

    const response = await this.fetchWithTimeout(`${this.apiUrl}/message/sendText/${instanceName}`, {
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
    const response = await this.fetchWithTimeout(`${this.apiUrl}/instance/connectionState/${instanceName}`, {
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
    const response = await this.fetchWithTimeout(`${this.apiUrl}/instance/connect/${instanceName}`, {
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
    const response = await this.fetchWithTimeout(`${this.apiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to logout instance: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}
