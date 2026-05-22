import { describe, it, expect } from 'vitest';
import { parseTemplate } from '@/utils/template-parser';

describe('parseTemplate', () => {
  it('deve substituir variavel simples', () => {
    expect(parseTemplate('Ola, {nome}!', { nome: 'Joao' })).toBe('Ola, Joao!');
  });

  it('deve substituir multiplas variaveis', () => {
    const result = parseTemplate('Ola, {nome}! Sua consulta na {clinica} e dia {data}.', {
      nome: 'Maria',
      clinica: 'Clinica Teste',
      data: '20/05/2026',
    });
    expect(result).toBe('Ola, Maria! Sua consulta na Clinica Teste e dia 20/05/2026.');
  });

  it('deve substituir mesma variavel multiplas vezes', () => {
    expect(parseTemplate('{x} + {x} = {y}', { x: '1', y: '2' })).toBe('1 + 1 = 2');
  });

  it('deve retornar template original se nao houver variaveis', () => {
    expect(parseTemplate('Mensagem fixa', {})).toBe('Mensagem fixa');
  });

  it('deve manter placeholder se a chave nao existir no objeto', () => {
    expect(parseTemplate('Valor: {inexistente}', {})).toBe('Valor: {inexistente}');
  });

  it('deve ignorar chaves sem conteudo', () => {
    expect(parseTemplate('Teste {} aqui', {})).toBe('Teste {} aqui');
  });
});
