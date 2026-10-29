import { useEffect } from 'react';

// Contador global de modais abertos para suportar modais empilhados com segurança
let activeModalsCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

/**
 * Bloqueia a rolagem do corpo da página (body) enquanto um modal estiver aberto,
 * restaurando-a de forma 100% segura e limpa ao fechar ou ao desmontar o componente.
 *
 * Utiliza um contador de instâncias para suportar modais empilhados (modais filhos
 * dentro de modais pais), prevenindo que o fechamento de um modal filho destrave
 * a rolagem do modal pai prematuramente.
 */
export function useLockBodyScroll(isOpen: boolean = true): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    if (activeModalsCount === 0) {
      // Salva estilos anteriores
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;

      // Compensa a largura da barra de rolagem para evitar layout shift no desktop
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      document.body.style.overflow = 'hidden';
    }

    activeModalsCount++;

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);

      if (activeModalsCount === 0) {
        document.body.style.overflow = previousBodyOverflow || '';
        document.body.style.paddingRight = previousBodyPaddingRight || '';
      }
    };
  }, [isOpen]);
}
