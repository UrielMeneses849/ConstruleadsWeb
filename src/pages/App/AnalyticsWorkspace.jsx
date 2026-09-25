import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { useState } from 'react';

const ANALYTICS_URL = '/ws_pbi_new/pbi.aspx';

export default function AnalyticsWorkspace() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <Box
      className="cl-analytics-workspace"
      position="relative"
      flex="1"
      minW="0"
      minH="0"
      h="100%"
      overflow="hidden"
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      aria-label="Área de trabajo de Bimsa Analytics"
    >
      {isLoading && !hasError && (
        <Flex position="absolute" inset="0" align="center" justify="center" direction="column" gap={3}>
          <Spinner color="#D95B27" thickness="3px" />
          <Text color="var(--cl-text-muted)" fontSize="13px">Cargando Bimsa Analytics...</Text>
        </Flex>
      )}

      {hasError && (
        <Flex position="absolute" inset="0" align="center" justify="center" direction="column" gap={2} px={6} textAlign="center">
          <Text color="var(--cl-text-strong)" fontWeight="700">No fue posible cargar Bimsa Analytics.</Text>
          <Text color="var(--cl-text-muted)" fontSize="12px">Intenta actualizar la página o verifica tu sesión.</Text>
        </Flex>
      )}

      <Box
        as="iframe"
        src={ANALYTICS_URL}
        title="Bimsa Analytics"
        w="100%"
        h="100%"
        border="0"
        display="block"
        opacity={isLoading || hasError ? 0 : 1}
        transition="opacity 180ms ease"
        allow="fullscreen"
        allowFullScreen
        onLoad={() => {
          setHasError(false);
          setIsLoading(false);
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </Box>
  );
}
