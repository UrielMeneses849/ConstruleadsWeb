import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';

import {
  sectionWrapper,
  contentGrid,
  infoCard,
  formCard,
  featureItem,
} from './style';

const features = [
  {
    icon: `${import.meta.env.BASE_URL}ico1.svg`,
    text: 'Análisis Predictivo de Licitaciones.',
  },
  {
    icon: `${import.meta.env.BASE_URL}ico2.svg`,
    text: 'Identificación de Nichos de alta Rentabilidad.',
  },
  {
      icon: `${import.meta.env.BASE_URL}ico3.svg`,
    text: 'Reportes Estratégicos Personalizados.',
  },
];

export default function Form() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });

  return (
    <Box as="section" {...sectionWrapper}>
      <Box {...contentGrid} ref={ref}>
        <Box
          {...infoCard}
          opacity={inView ? 1 : 0}
          transform={inView ? 'translateX(0px)' : 'translateX(-60px)'}
          transition='all 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
        >
          <Heading
            color="secondary.900"
            fontSize={{ base: '24px', lg: '32px' }}
            lineHeight="1.1"
            mb="32px"
          >
            Potencia tus resultados con la Inteligencia de Datos Avanzada
          </Heading>

          <Text
            color="secondary.800"
            fontSize="16px"
            lineHeight="1.6"
            mb="32px"
          >
            No dejes tus decisiones al azar. Nuestra consultoría especializada
            con{' '}
            <Text as="span" color="primary.500" fontWeight="700">
              Bimsa Analytics
            </Text>{' '}
            te proporciona análisis predictivos y estratégicos para dominar el
            mercado de la construcción.
          </Text>

          <Stack gap="16px">
            {features.map((feature, index) => (
              <Flex
                key={feature.text}
                {...featureItem}
                opacity={inView ? 1 : 0}
                transform={
                  inView
                    ? 'translateX(0px)'
                    : 'translateX(-30px)'
                }
                transition={`all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.15 + index * 0.15}s`}
              >
                <Box
                  w="72px"
                  h="72px"
                  borderRadius="16px"
                  bg="primary.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Image src={feature.icon} alt={feature.text} boxSize="36px" />
                </Box>

                <Text
                  fontSize="16px"
                  fontWeight="600"
                  color="secondary.900"
                >
                  {feature.text}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>

        <Box
          {...formCard}
          opacity={inView ? 1 : 0}
          transform={inView ? 'translateX(0px)' : 'translateX(60px)'}
          transition='all 1s cubic-bezier(0.22, 1, 0.36, 1)'
        >
          <Image
            src={`${import.meta.env.BASE_URL}bimsa-logo.png`}
            alt="Bimsa Reports"
            maxW="280px"
            mb="32px"
          />

          <Stack gap="20px">
            <Box>
              <Text mb="8px">Nombre Completo</Text>
              <Input placeholder="Tu nombre" size="lg" />
            </Box>

            <Box>
              <Text mb="8px">Correo corporativo</Text>
              <Input placeholder="correo@empresa.com" size="lg" />
            </Box>

            <Box>
              <Text mb="8px">Teléfono de contacto</Text>
              <Input placeholder="55 1234 5678" size="lg" />
            </Box>

            <Box>
              <Text mb="8px">Empresa (Opcional)</Text>
              <Input placeholder="Nombre de la empresa" size="lg" />
            </Box>

            <Button
              mt="12px"
              size="lg"
              bg="primary.500"
              color="white"
              borderRadius="16px"
              _hover={{ bg: 'primary.600' }}
            >
              Solicitar asesoría personalizada
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
