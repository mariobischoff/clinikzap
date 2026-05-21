/**
 * Replaces dynamic variables in WhatsApp templates
 * e.g. "Olá, {paciente}!" -> "Olá, João!"
 */
export function parseTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value || '');
  }
  return result;
}
