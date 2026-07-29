import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Flex, Image, Spinner, Text } from '@chakra-ui/react';

export default function FichaTecnicaModal({
  isOpen,
  url,
  htmlContent,
  title,
  isLoading,
  error,
  isDownloading,
  downloadError,
  onClose,
  onDownload,
}) {
  const publicLogoUrl = new URL(
    `${import.meta.env.BASE_URL}bimsa-logo.png`,
    window.location.origin
  ).href;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const replaceIframeLogo = (event) => {
    try {
      const iframeDocument = event.currentTarget.contentDocument;
      if (!iframeDocument) return;

      const logoImages = Array.from(iframeDocument.images).filter((image) => {
        const source = image.getAttribute('src') || '';
        const alternativeText = image.getAttribute('alt') || '';
        return /bimsa|logo_bimsa/i.test(`${source} ${alternativeText}`);
      });

      logoImages.forEach((image) => {
        image.removeAttribute('srcset');
        image.src = publicLogoUrl;
      });
    } catch {
      // Un iframe de otro dominio no permite modificar su documento.
      // En ese caso se conserva intacta la ficha entregada por el servicio.
    }
  };

  return createPortal(
    <Flex
      position="fixed"
      inset={0}
      zIndex={200}
      bg="rgba(16,16,16,.68)"
      backdropFilter="blur(4px)"
      align="center"
      justify="center"
      p={{ base: 2, md: 5 }}
      onClick={onClose}
    >
      <Flex
        direction="column"
        w="min(1420px, 96vw)"
        h="min(880px, 95vh)"
        bg="var(--cl-surface, #fff)"
        color="var(--cl-text, #252525)"
        border="1px solid var(--cl-border, #e5e5e5)"
        borderRadius={{ base: '12px', md: '16px' }}
        overflow="hidden"
        boxShadow="0 28px 80px rgba(0,0,0,.32)"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ficha técnica de la obra"
      >
        <Flex align="center" justify="space-between" gap={4} px={4} py={3}
          borderBottom="1px solid var(--cl-border, #e5e5e5)">
          <Box minW="0">
            <Text fontSize="10px" color="#FF653F" fontWeight="700" letterSpacing=".1em">
              FICHA TÉCNICA
            </Text>
            <Text fontSize="14px" fontWeight="700" noOfLines={1}>
              {title || 'Detalle de la obra'}
            </Text>
          </Box>
          <Button aria-label="Cerrar ficha" title="Cerrar" variant="ghost" size="sm"
            minW="34px" onClick={onClose} fontSize="21px">×</Button>
        </Flex>

        <Flex flex="1" minH="0" align="center" justify="center" bg="#F5F5F5" position="relative">
          {isLoading && (
            <Flex direction="column" align="center" gap={3}>
              <Spinner color="#FF653F" />
              <Text fontSize="13px" color="#777">Cargando ficha técnica…</Text>
            </Flex>
          )}
          {!isLoading && error && (
            <Box maxW="420px" textAlign="center" p={6}>
              <Text fontWeight="700" mb={2}>No fue posible abrir la ficha</Text>
              <Text fontSize="13px" color="#777">{error}</Text>
            </Box>
          )}
          {!isLoading && !error && (htmlContent || url) && (
            <Box
              w="100%"
              h="100%"
              overflow="hidden"
              bg="white"
              position="relative"
            >
              <Flex
                position="absolute"
                zIndex={2}
                top="22px"
                left="max(28px, calc((100% - 1120px) / 2))"
                w="176px"
                h="48px"
                align="center"
                bg="white"
                pointerEvents="none"
                aria-hidden="true"
              >
                <Image
                  src={publicLogoUrl}
                  alt=""
                  w="168px"
                  h="40px"
                  objectFit="contain"
                  objectPosition="left center"
                />
              </Flex>
              <Box
                as="iframe"
                src={htmlContent ? undefined : url}
                srcDoc={htmlContent || undefined}
                title={title || 'Ficha técnica'}
                onLoad={replaceIframeLogo}
                border="0"
                w="125%"
                h="125%"
                bg="white"
                transform="scale(.8)"
                transformOrigin="top left"
              />
            </Box>
          )}
        </Flex>
        <Flex
          px={4}
          py={3}
          borderTop="1px solid var(--cl-border, #e5e5e5)"
          align={{ base: 'stretch', sm: 'center' }}
          justify="space-between"
          gap={3}
          direction={{ base: 'column', sm: 'row' }}
        >
          <Text fontSize="11px" color={downloadError ? '#B91C1C' : '#777'} flex="1">
            {downloadError || 'Puedes consultar la ficha o descargarla en formato PDF.'}
          </Text>
          <Flex gap={2} justify="flex-end">
            <Button variant="outline" borderColor="var(--cl-border, #ddd)" onClick={onClose}>
              Cerrar
            </Button>
            <Button bg="#FF653F" color="white" _hover={{ bg: '#D94E2D' }}
              onClick={onDownload} disabled={isLoading || Boolean(error) || isDownloading}>
              {isDownloading ? (
                <Flex align="center" gap={2}><Spinner size="xs" /> Descargando…</Flex>
              ) : 'Descargar ficha'}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>,
    document.body
  );
}
