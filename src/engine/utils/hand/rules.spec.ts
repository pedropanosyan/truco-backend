import { Card } from '../types';
import { getEnvido } from './rules';

describe('getEnvido', () => {
  it('should return the correct envido value', () => {
    const cards = [{ suit: 'ESPADA', rank: '1' }, { suit: 'ESPADA', rank: '2' }, { suit: 'ESPADA', rank: '3' }] as Card[];
    const envido = getEnvido(cards);
    expect(envido).toBe(25);
  });

  
});