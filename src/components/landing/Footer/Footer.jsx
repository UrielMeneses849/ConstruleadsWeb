

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
              src="/logo-construleads.svg"
              alt="Construleads"
              maxW="320px"
              mb="24px"
            />

            <Text color="white" fontSize="20px" mb="24px">
              Información estratégica para hacer crecer tu negocio.
            </Text>

            <Text color="whiteAlpha.900" fontSize="18px" lineHeight="1.7">
              Encuentra proyectos, identifica clientes potenciales y toma
              decisiones estratégicas con información actualizada.
            </Text>
          </Box>

          <Box>
            <Heading {...sectionTitle}>CONTACTO</Heading>

            <Stack gap="20px" color="white">
              <Text>📞 Tel. 55 5627908412</Text>
              <Text>✉️ correo@bimsa.com.mx</Text>
              <Text>🌐 bimsareports.com</Text>
              <Text>🕒 Lunes a Viernes 9:00 - 18:00 hrs.</Text>
            </Stack>
          </Box>

          <Box>
            <Heading {...sectionTitle}>EMPRESA</Heading>

            <Stack gap="20px">
              <Text {...footerLink}>¿Qué es Bimsa Reports?</Text>
              <Text {...footerLink}>Beneficios</Text>
              <Text {...footerLink}>Quienes somos</Text>
              <Text {...footerLink}>Preguntas frecuentes</Text>
            </Stack>
          </Box>

          <Box>
            <Heading {...sectionTitle}>LEGAL</Heading>

            <Stack gap="20px" mb="40px">
              <Text {...footerLink}>Términos y condiciones</Text>
              <Text {...footerLink}>Aviso de privacidad</Text>
              <Text {...footerLink}>Políticas de uso</Text>
              <Text {...footerLink}>Políticas de cookies</Text>
            </Stack>

            <Button
              bg="#F6C8AC"
              color="#091E5A"
              borderRadius="16px"
              size="lg"
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
          <Text color="white" fontSize="16px">
            © 2026 Bimsa Reports. Todos los derechos reservados
          </Text>

          <Text color="white" fontSize="16px">
            Hecho en México, desde 1961 🧡
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}