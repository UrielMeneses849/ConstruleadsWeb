import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

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
import { obtenerObras } from '../../api/obras';
import { parseObrasXml } from '../../utils/parseObrasXml';

export default function Construleads() {
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';

  const [filtros, setFiltros] = useState({});
  const [obras, setObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [filteredObras, setFilteredObras] = useState([]);
  const [activeView, setActiveView] = useState('mapa');

  useEffect(() => {
    if (Array.isArray(obras) && obras.length > 0) {
      setFilteredObras(obras);
    }
  }, [obras]);

  useEffect(() => {
    async function cargarObras() {
      try {
        setLoadingObras(true);

        const xml = await obtenerObras();

        const obrasParseadas = parseObrasXml(xml);

                console.log(
          'TOTAL OBRAS WS:',
          obrasParseadas.length
        );

        console.log(
          'PRIMERA OBRA:',
          obrasParseadas[0]
        );

        console.log('OBRAS WS:', obrasParseadas.length);

        setObras(obrasParseadas);
      } catch (error) {
        console.error('ERROR CARGANDO OBRAS:', error);
      } finally {
        setLoadingObras(false);
      }
    }

    cargarObras();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  console.log('CONSTRULEADS STATE =>', {
    obras: obras.length,
    filteredObras: filteredObras.length,
    activeView,
  });

  return (
    <Box
      bg="#FAFAFA"
      minH="100vh"
      p={3}
    >
      <Flex
        bg="white"
        borderRadius="12px"
        px={4}
        py={2}
        mb={3}
        minH="60px"
        align="center"
        justify="flex-start"
        border="1px solid #ECECEC"
        gap={4}
      >
        <Image
          src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
          alt="BIMSA Reports"
          h="36px"
          objectFit="contain"
        />

        <HStack
          spacing={1}
          flex="1"
          justify="flex-start"
        >
          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            bg="transparent"
            borderRadius="8px"
            color={activeView === 'mapa' ? '#FF6600' : '#202020'}
            borderBottom={activeView === 'mapa' ? '3px solid #FF6600' : '3px solid transparent'}
            fontWeight={activeView === 'mapa' ? '600' : '500'}
            cursor="pointer"
            fontSize="14px"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA', color: activeView === 'mapa' ? '#FF6600' : '#202020' }}
            onClick={() => setActiveView('mapa')}
          >
            Mapa
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            bg="transparent"
            borderRadius="8px"
            color={activeView === 'resultados' ? '#FF6600' : '#202020'}
            borderBottom={activeView === 'resultados' ? '3px solid #FF6600' : '3px solid transparent'}
            fontWeight={activeView === 'resultados' ? '600' : '500'}
            cursor="pointer"
            fontSize="14px"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA', color: activeView === 'resultados' ? '#FF6600' : '#202020' }}
            onClick={() => setActiveView('resultados')}
          >
            Resultados
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="#202020"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA' }}
          >
            Gráficas
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="#202020"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA' }}
          >
            Analytics
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="#202020"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA' }}
          >
            Personalizado
          </Box>
        </HStack>

        <HStack spacing={3}>
          <Box
            as={FiMoon}
            boxSize="20px"
            color="#6B7280"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: '#202020' }}
          />

          <Box
            as={FiSettings}
            boxSize="20px"
            color="#6B7280"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: '#202020' }}
          />

          <Box
            as={FiLogOut}
            boxSize="20px"
            color="#6B7280"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: '#202020' }}
          />

                   <Box position="relative">
  <Box
    w="32px"
    h="32px"
    borderRadius="full"
    bg="#66AEE8"
    display="flex"
    alignItems="center"
    justifyContent="center"
    fontWeight="600"
    fontSize="12px"
    color="#071B52"
  >
    UM
  </Box>

  <Box
    position="absolute"
    bottom="1px"
    right="-1px"
    w="8px"
    h="8px"
    borderRadius="full"
    bg="#35B56A"
    border="1px solid white"
  />
</Box>
        </HStack>
      </Flex>

      <Flex gap={3}>
        <SidebarFiltros
          onApplyFilters={setFiltros}
        />

        <Box flex="1">
          <Box display={activeView === 'mapa' ? 'block' : 'none'}>
            <Mapa
              obras={obras}
              filtros={filtros}
              onFilteredData={setFilteredObras}
            />
          </Box>

          <Box display={activeView === 'resultados' ? 'block' : 'none'}>
            <Resultados
              filtros={filtros}
              obras={filteredObras.length ? filteredObras : obras}
            />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
