import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Flex, Text } from '@chakra-ui/react';

const WELCOME_DURATION_MS = 1500;

export default function WelcomeExperience({ userId, userName, onComplete }) {
  const storageKey = `cl_suite_welcome_pending:${userId || 'guest'}`;
  const seenKey = `cl_suite_welcome_seen:${userId || 'guest'}`;
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isVisible) return undefined;

    try {
      // La bienvenida corresponde al ingreso que acaba de validarse; un reload
      // normal no la repite ni añade espera artificial.
      sessionStorage.removeItem(storageKey);
      sessionStorage.setItem(seenKey, '1');
    } catch {
      // La experiencia no debe interrumpir el acceso si el almacenamiento está bloqueado.
    }

    const timeout = window.setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, WELCOME_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [isVisible, onComplete, seenKey, storageKey]);

  if (!isVisible) return null;

  const firstName = String(userName || '').trim().split(/\s+/)[0];

  return createPortal(
    <Flex
      className="cl-welcome-experience"
      position="fixed"
      inset={0}
      zIndex={300}
      align="center"
      justify="center"
      bg="#121212"
      color="white"
      pointerEvents="none"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes cl-welcome-overlay {
          0% { opacity: 0; }
          12%, 72% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        @keyframes cl-welcome-content {
          0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(.985); }
          22%, 72% { opacity: 1; transform: none; }
          100% { opacity: 0; transform: translate3d(0, -5px, 0) scale(1.005); }
        }
        @keyframes cl-welcome-line {
          0% { transform: scaleX(0); opacity: 0; }
          24% { transform: scaleX(1); opacity: 1; }
          76% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(.35); opacity: 0; }
        }
        .cl-welcome-experience {
          animation: cl-welcome-overlay ${WELCOME_DURATION_MS}ms cubic-bezier(.22, 1, .36, 1) both;
        }
        .cl-welcome-content {
          animation: cl-welcome-content ${WELCOME_DURATION_MS}ms cubic-bezier(.22, 1, .36, 1) both;
        }
        .cl-welcome-line {
          animation: cl-welcome-line ${WELCOME_DURATION_MS}ms cubic-bezier(.22, 1, .36, 1) both;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-welcome-experience { animation: cl-welcome-overlay 900ms ease both; }
          .cl-welcome-content, .cl-welcome-line { animation: none; }
        }
      `}</style>

      <Flex className="cl-welcome-content" direction="column" align="center" textAlign="center" px={6}>
        <Box className="cl-welcome-line" w="48px" h="2px" bg="#D95B27" borderRadius="full" mb={6} />
        <Text fontSize={{ base: '25px', md: '34px' }} fontWeight="600" letterSpacing="-.025em">
          Bienvenido a Bimsa Suite
        </Text>
        <Text mt={2} fontSize={{ base: '13px', md: '14px' }} color="rgba(255,255,255,.62)" fontWeight="400">
          {firstName ? `Hola, ${firstName}. ` : ''}Estamos preparando tu tablero.
        </Text>
      </Flex>
    </Flex>,
    document.body
  );
}
