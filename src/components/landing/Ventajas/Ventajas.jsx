import { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);
  return (
    <Box
      ref={sectionRef}
      {...section}
    >
      <Box {...container}>
        <Box
          {...topContent}
          opacity={isVisible ? 1 : 0}
          transform={isVisible ? "translateY(0)" : "translateY(60px)"}
          transition="all 1s cubic-bezier(0.22, 1, 0.36, 1)"
        >
          <Box>

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
            src={`${import.meta.env.BASE_URL}construccion.png`}
            alt="Construcción"
            w="100%"
            opacity={isVisible ? 1 : 0}
            transform={isVisible ? "translateX(0)" : "translateX(80px)"}
            transition="all 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
          />
        </Box>

        <Heading
          {...sectionSubtitle}
          opacity={isVisible ? 1 : 0}
          transform={isVisible ? "translateY(0)" : "translateY(50px)"}
          transition="all 1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s"
        >
          Información estructurada que necesitas,
          <Box as="span" {...highlight}> en un solo lugar</Box>
        </Heading>

        <Box {...cardsGrid}>
          {cards.map((item, index) => (
            <Box
              key={index}
              {...card}
              opacity={isVisible ? 1 : 0}
              transform={isVisible ? "translateY(0)" : "translateY(80px)"}
              transition={`all 1s cubic-bezier(0.22, 1, 0.36, 1) ${0.3 + index * 0.2}s`}
            >
              <Flex align="center" gap={3} mb="18px">
                <Box
                  w="55px"
                  h="55px"
                  borderRadius="full"
                  bg="#FF6400"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="40px"
                  fontWeight="700"
                >
                  {item.number.replace('.', '')}
                </Box>

                <Box>
                  <Text {...cardTitle}>{item.title}</Text>
                </Box>
              </Flex>

              <Text {...cardDescription}>{item.description}</Text>

              <Box borderTop="1px solid" borderColor="#BDBDBD" pt="24px">
                <VStack align="start" spacing={2}>
                  {item.items.map((feature, idx) => (
                    <Flex key={idx} align="center" gap={2}>
                      <Text color="#FF6400" fontSize="16px" fontWeight="700">◉</Text>
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