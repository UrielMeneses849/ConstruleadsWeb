import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";

import { heroStyles } from "./styles";

export default function Hero() {
  return (
    <Box {...heroStyles.wrapper}>
      <Container maxW="90%">
        <Flex {...heroStyles.container}>

          {/* LEFT CONTENT */}
          <VStack {...heroStyles.content}>

            <Heading {...heroStyles.title}>
              <Text as="span" color="primary.500">
                INFORMACIÓN ESTRATÉGICA
              </Text>

              <br />

              PARA HACER CRECER TU NEGOCIO
            </Heading>

            <Text {...heroStyles.description}>
              Descubre proyectos, conecta con tomadores de decisión y
              encuentra nuevas oportunidades en la industria de la
              construcción.
            </Text>

          </VStack>

          {/* RIGHT IMAGE */}
          <Box {...heroStyles.imageWrapper}>
            <Image
              src={`${import.meta.env.BASE_URL}hero-city.png`}
              alt="Construleads Hero"
              {...heroStyles.image}
            />
          </Box>

        </Flex>
      </Container>
    </Box>
  );
}