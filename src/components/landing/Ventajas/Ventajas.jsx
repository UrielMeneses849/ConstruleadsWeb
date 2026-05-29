

import {
  Box,
  Flex,
  Heading,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  section,
  container,
  topContent,
  title,
  highlight,
  description,
  sectionSubtitle,
  cardsGrid,
  card,
  cardTitle,
  cardDescription,
  listItem,
} from "./style";

const cards = [
  {
    number: '1.',
    title: 'Información del Proyecto',
    description: 'Datos clave para identificar y evaluar oportunidades.',
    items: [
      'Tipo y nombre del proyecto',
      'Ubicación (Estado o municipio)',
      'Etapa de la obra',
      'Fechas clave (Inicio y fin)',
      'Monto de inversión',
    ],
  },
  {
    number: '2.',
    title: 'Detalles técnicos',
    description: 'Características específicas para una evaluación precisa.',
    items: [
      'Tipo de obra y sector',
      'Superficie y escala',
      'Número de unidades y niveles',
      'Características y acabados',
      'Descripción de cada obra',
    ],
  },
  {
    number: '3.',
    title: 'Información comercial',
    description: 'Conecta con los tomadores de decisión.',
    items: [
      'Empresas desarrolladoras',
      'Contactos clave',
      'Datos de contacto',
      'Teléfonos y correos electrónicos',
      'Ubicación de empresa',
    ],
  },
];

export default function Ventajas() {
  return (
    <Box {...section}>
      <Box {...container}>
        <Box {...topContent}>
          <Box>
            <Image
              src="/assets/logo-bimsa-reports.png"
              alt="Bimsa Reports"
              mb="24px"
              maxW="220px"
            />

            <Heading {...title}>
              Tu ventaja competitiva
              <br />
              en <Box as="span" {...highlight}>construcción.</Box>
            </Heading>

            <Text {...description}>
              Construleads es el servicio de publicación continua de Bimsa Reports sobre nuevos proyectos de construcción en México, con un alto nivel de detalle estructurado para impulsar tu negocio.
            </Text>
          </Box>

          <Image
            src="/assets/ventajas-ilustracion.png"
            alt="Construcción"
            w="100%"
          />
        </Box>

        <Heading {...sectionSubtitle}>
          Información estructurada que necesitas,
          <Box as="span" {...highlight}> en un solo lugar</Box>
        </Heading>

        <Box {...cardsGrid}>
          {cards.map((item, index) => (
            <Box key={index} {...card}>
              <Text color="primary.500" fontSize="28px" fontWeight="700">
                {item.number}
              </Text>

              <Text {...cardTitle}>{item.title}</Text>

              <Text {...cardDescription}>{item.description}</Text>

              <Box borderTop="1px solid" borderColor="gray.200" pt="20px">
                <VStack align="start" spacing={3}>
                  {item.items.map((feature, idx) => (
                    <Flex key={idx} align="center" gap={3}>
                      <Text color="primary.500">✓</Text>
                      <Text {...listItem}>{feature}</Text>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}