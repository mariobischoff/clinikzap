import { EvolutionService } from './evolution';

export class WhatsappService {
  /**
   * Sends a text message to a specific number.
   * Delegates to the underlying EvolutionService implementation.
   */
  static async sendTextMessage(phone: string, text: string, instanceName?: string): Promise<unknown> {
    return EvolutionService.sendTextMessage(phone, text, instanceName);
  }

  static async initInstance(instanceName?: string): Promise<void> {
    return EvolutionService.initInstance(instanceName);
  }

  static async instanceExists(instanceName: string): Promise<boolean> {
    return EvolutionService.instanceExists(instanceName);
  }

  static async createInstance(instanceName: string): Promise<unknown> {
    return EvolutionService.createInstance(instanceName);
  }

  static async registerWebhook(instanceName?: string): Promise<unknown> {
    return EvolutionService.registerWebhook(instanceName);
  }

  static async getConnectionState(instanceName?: string): Promise<{ instance: { state: string } }> {
    return EvolutionService.getConnectionState(instanceName);
  }

  static async getConnectQr(instanceName?: string): Promise<{ base64?: string; code?: string }> {
    return EvolutionService.getConnectQr(instanceName);
  }

  static async logoutInstance(instanceName?: string): Promise<unknown> {
    return EvolutionService.logoutInstance(instanceName);
  }
}
