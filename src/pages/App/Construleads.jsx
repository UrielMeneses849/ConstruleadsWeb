import { Navigate } from 'react-router-dom';
import { useState } from 'react';

import {
  Box,
  Flex,
  HStack,
  Image,
} from '@chakra-ui/react';

import {
  FiMoon,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';

import SidebarFiltros from './SidebarFiltros';
import Mapa from './Mapa';
import Resultados from './views/ResultadosView';

export default function Construleads() {
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';

  const [filtros, setFiltros] = useState({});
  const [filteredObras, setFilteredObras] = useState([]);
  const [activeView, setActiveView] = useState('mapa');

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      bg="#F8F8F8"
      minH="100vh"
      p={4}
    >
      <Flex
        bg="white"
        borderRadius="20px"
        px={8}
        py={3}
        mb={4}
        align="center"
        justify="flex-start"
        boxShadow="sm"
        gap={3}
      >
        <Image
          src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
          alt="BIMSA Reports"
          h="48px"
          objectFit="contain"
        />

        <HStack
          spacing={0}
          flex="1"
          justify="center"
        >
          <Box
            px={5}
            h="48px"
            display="flex"
            alignItems="center"
            bg={activeView === 'mapa' ? '#FFF1E8' : 'transparent'}
            borderRadius="10px"
            color={activeView === 'mapa' ? '#FF6600' : '#414141'}
            borderBottom={activeView === 'mapa' ? '2px solid #FF6600' : 'none'}
            fontWeight="500"
            cursor="pointer"
            fontSize="14px"
            onClick={() => setActiveView('mapa')}
          >
            Mapa
          </Box>

          <Box
            px={5}
            h="48px"
            display="flex"
            alignItems="center"
            bg={activeView === 'resultados' ? '#FFF1E8' : 'transparent'}
            borderRadius="10px"
            color={activeView === 'resultados' ? '#FF6600' : '#414141'}
            borderBottom={activeView === 'resultados' ? '2px solid #FF6600' : 'none'}
            cursor="pointer"
            fontSize="14px"
            onClick={() => setActiveView('resultados')}
          >
            Resultados
          </Box>

          <Box
            px={5}
            h="48px"
            display="flex"
            alignItems="center"
            color="#414141"
            cursor="pointer"
            fontSize="14px"
          >
            Gráficas
          </Box>

          <Box
            px={5}
            h="48px"
            display="flex"
            alignItems="center"
            color="#414141"
            cursor="pointer"
            fontSize="14px"
          >
            Analytics
          </Box>

          <Box
            px={5}
            h="48px"
            display="flex"
            alignItems="center"
            color="#414141"
            cursor="pointer"
            fontSize="14px"
          >
            Personalizado
          </Box>
        </HStack>

        <HStack spacing={8}>
          <Box
            as={FiMoon}
            size="22px"
            color="#8C8C8C"
            cursor="pointer"
          />

          <Box
            as={FiSettings}
            size="22px"
            color="#8C8C8C"
            cursor="pointer"
          />

          <Box
            as={FiLogOut}
            size="22px"
            color="#4B4B4B"
            cursor="pointer"
          />

                   <Box position="relative">
  <Box
    w="40px"
    h="40px"
    borderRadius="full"
    bg="#66AEE8"
    display="flex"
    alignItems="center"
    justifyContent="center"
    fontWeight="600"
    fontSize="16px"
    color="#071B52"
  >
    UM
  </Box>

  <Box
    position="absolute"
    bottom="1px"
    right="-1px"
    w="12px"
    h="12px"
    borderRadius="full"
    bg="#35B56A"
    border="2px solid white"
  />
</Box>
        </HStack>
      </Flex>

      <Flex gap={2}>
        <SidebarFiltros
          onApplyFilters={setFiltros}
        />

        <Box flex="1">
          {activeView === 'mapa' ? (
            <Mapa
              filtros={filtros}
              onFilteredData={setFilteredObras}
            />
          ) : (
            <Resultados
              filtros={filtros}
              obras={filteredObras}
            />
          )}
        </Box>
      </Flex>
    </Box>
  );
}