

import {
  Box,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FiInstagram, FiLinkedin, FiMail } from 'react-icons/fi';

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

            <Flex gap="12px" mt="24px">
              <Box as="a" href="https://www.linkedin.com/company/bimsa-reports/posts/?feedView=all" target="_blank" rel="noopener noreferrer" aria-label="Visitar LinkedIn de Bimsa Reports">
                <FiLinkedin color="white" size="20" />
              </Box>
              <Box as="a" href="https://www.instagram.com/bimsareportsmx/" target="_blank" rel="noopener noreferrer" aria-label="Visitar Instagram de Bimsa Reports">
                <FiInstagram color="white" size="20" />
              </Box>
              <Box as="a" href="mailto:correo@bimsa.com.mx" aria-label="Enviar correo a Bimsa Reports">
                <FiMail color="white" size="20" />
              </Box>
            </Flex>
          </Box>

          <Box>
            <Heading {...sectionTitle}>CONTACTO</Heading>

            <Stack gap="20px" color="white" fontSize="12px">
              <Text fontSize="12px">📞 Tel. 55 5627908412</Text>
              <Text fontSize="12px">✉️ correo@bimsa.com.mx</Text>
              <Text fontSize="12px">🌐 bimsareports.com</Text>
            </Stack>
          </Box>

          <Box>
            <Heading {...sectionTitle}>LEGAL</Heading>

            <Stack gap="20px" mb="40px">
              <Text {...footerLink} fontSize="12px">Términos y condiciones</Text>
              <Text {...footerLink} fontSize="12px">Aviso de privacidad</Text>
            </Stack>
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
