

import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react';

import {
  footerWrapper,
  footerContainer,
  footerGrid,
  sectionTitle,
  footerLink,
} from './style';

export default function Footer() {
  return (
    <Box {...footerWrapper}>
      <Box {...footerContainer}>
        <Box {...footerGrid}>
          <Box>
            <Image
              src={`${import.meta.env.BASE_URL}construleadsfooter.png`}
              alt="Construleads"
              maxW="320px"
              mb="24px"
            />

            <Text color="white" fontSize="14px" mb="24px">
              Información estratégica para hacer crecer tu negocio.
            </Text>

            <Text color="whiteAlpha.900" fontSize="12px" lineHeight="1.7">
              Encuentra proyectos, identifica clientes potenciales y toma
              decisiones estratégicas con información actualizada.
            </Text>
          </Box>

          <Box>
            <Heading {...sectionTitle}>CONTACTO</Heading>

            <Stack gap="20px" color="white" fontSize="12px">
              <Text fontSize="12px">📞 Tel. 55 5627908412</Text>
              <Text fontSize="12px">✉️ correo@bimsa.com.mx</Text>
              <Text fontSize="12px">🌐 bimsareports.com</Text>
              <Text fontSize="12px">🕒 Lunes a Viernes 9:00 - 18:00 hrs.</Text>
            </Stack>
          </Box>

          <Box>
            <Heading {...sectionTitle}>EMPRESA</Heading>

            <Stack gap="20px" fontSize="12px">
              <Text {...footerLink} fontSize="12px">¿Qué es Bimsa Reports?</Text>
              <Text {...footerLink} fontSize="12px">Beneficios</Text>
              <Text {...footerLink} fontSize="12px">Quienes somos</Text>
              <Text {...footerLink} fontSize="12px">Preguntas frecuentes</Text>
            </Stack>
          </Box>

          <Box>
            <Heading {...sectionTitle}>LEGAL</Heading>

            <Stack gap="20px" mb="40px">
              <Text {...footerLink} fontSize="12px">Términos y condiciones</Text>
              <Text {...footerLink} fontSize="12px">Aviso de privacidad</Text>
              <Text {...footerLink} fontSize="12px">Políticas de uso</Text>
              <Text {...footerLink} fontSize="12px">Políticas de cookies</Text>
            </Stack>

            <Button
              bg="#F6C8AC"
              color="#091E5A"
              borderRadius="16px"
              size="md"
              _hover={{ opacity: 0.9 }}
            >
              Hablar con un asesor
            </Button>
          </Box>
        </Box>
<Box
  h="1px"
  bg="whiteAlpha.300"
  my="48px"
/>

        <Flex
          justify="space-between"
          align="center"
          direction={{ base: 'column', lg: 'row' }}
          gap="16px"
        >
          <Text color="white" fontSize="12px">
            © 2026 Bimsa Reports. Todos los derechos reservados
          </Text>

          <Text color="white" fontSize="12px">
            Hecho en México, desde 1961 🧡
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}