import { describe, it, expect, beforeEach } from 'bun:test';
import { useLockBodyScroll } from '../useLockBodyScroll';

describe('useLockBodyScroll Hook & Counter', () => {
  let mockBodyStyle: Record<string, string>;

  beforeEach(() => {
    mockBodyStyle = {
      overflow: '',
      paddingRight: ''
    };

    // @ts-ignore
    globalThis.window = {
      innerWidth: 1024
    } as any;

    // @ts-ignore
    globalThis.document = {
      body: {
        style: mockBodyStyle
      },
      documentElement: {
        clientWidth: 1008 // scrollbar = 16px
      }
    } as any;
  });

  it('exports useLockBodyScroll hook as a function', () => {
    expect(typeof useLockBodyScroll).toBe('function');
  });
});
