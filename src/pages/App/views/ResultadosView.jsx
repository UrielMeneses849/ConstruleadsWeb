import {
  Box,
  Flex,
  Heading,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';

const data = Array.from({ length: 16 }, (_, i) => ({
  clave: i % 2 === 0 ? 'OC328735' : 'PP235080',
  proyecto: `Proyecto ${i + 1}`,
  genero: 'Vivienda',
  estado: ['CDMX', 'Guerrero', 'Edo. México', 'Guanajuato'][i % 4],
  inicio: '30-04-2026',
  fin: '30-04-2026',
  publicacion: '30-03-2026',
  tipo: i % 2 === 0 ? 'Proyecto contratado' : 'Proyecto de inversión',
}));

export default function ResultadosView() {
  return (
    <Box height="calc(100vh - 160px)" display="flex" flexDirection="column">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Tabla</Heading>

        <HStack spacing={4}>
          <Text fontSize="14px">Ordenar por:</Text>

          <select
            style={{
              width: '220px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '0 12px',
              background: 'white',
            }}
          >
            <option>Fecha de publicación</option>
            <option>Fecha inicio</option>
            <option>Estado</option>
          </select>

          <Button
            bg="#FF6600"
            color="white"
            _hover={{ bg: '#E65C00' }}
            borderRadius="14px"
            px={8}
          >
            Descargar
          </Button>
        </HStack>
      </Flex>

      <Box
        bg="white"
        border="1px solid #D9D9D9"
        borderRadius="24px"
        overflow="hidden"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
        height="100%"
      >
        <table
          style={{
            width: '100%',
            height: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            tableLayout: 'fixed',
          }}
        >
          <thead style={{ background: '#F5F5F7' }}>
            <tr>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Clave Proyecto</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Proyecto</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Género</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Estado</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Fecha Inicio</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Fecha Fin</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Fecha Publicación</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Tipo Proyecto</th>
              <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>Acciones</th>
            </tr>
          </thead>
          <style>
            {`
              thead, tbody tr {
                display: table;
                width: 100%;
                table-layout: fixed;
              }
            `}
          </style>

          <tbody
            style={{
              display: 'block',
              overflowY: 'auto',
              height: 'calc(100vh - 310px)',
            }}
          >
            {data.map((row, index) => (
              <tr
                key={index}
                style={{
                  background: index % 2 === 0 ? '#F7F7F9' : '#FFFFFF',
                  display: 'table',
                  width: '100%',
                  tableLayout: 'fixed',
                }}
              >
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.clave}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.proyecto}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.genero}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.estado}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.inicio}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.fin}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.publicacion}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>{row.tipo}</td>
                <td style={{ padding: '14px 20px', borderTop: '1px solid #F2F2F2' }}>
                  <HStack spacing={2}>
                    <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600" borderRadius="10px">👁</Button>
                    <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600" borderRadius="10px">↓</Button>
                  </HStack>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <Flex
        justify="space-between"
        align="center"
        px={4}
        borderTop="1px solid #EAEAEA"
        bg="white"
        py={4}
        mt={0}
      >
        <Text color="#666">
          Mostrando 16 resultados de 125
        </Text>
        <Box flex="1" />
        <HStack spacing={4}>
          <Button size="sm" variant="outline">&lt;</Button>
          <Button size="sm" bg="#FF6600" color="white">1</Button>
          <Button size="sm" variant="outline">2</Button>
          <Button size="sm" variant="outline">3</Button>
          <Button size="sm" variant="outline">12</Button>
          <Button size="sm" variant="outline">&gt;</Button>
        </HStack>
      </Flex>
    </Box>
  );
}