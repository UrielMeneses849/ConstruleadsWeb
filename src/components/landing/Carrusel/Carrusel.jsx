import { Box, Flex, Image } from "@chakra-ui/react";
import { carruselContainer, carruselTrack, carruselItem } from "./styles";

// 📦 Logos del carrusel
// Guarda tus imágenes dentro de:
// public/assets/logos/

const logos = [
  "/logos/helvex.png",
  "/logos/TheHomeDepot.png",
  "/logos/holcim.png",
  "/logos/whirpool.png",
  "/logos/urrea.svg",

  "/logos/berel.png",
  "/logos/castel.webp",
  "/logos/ae.svg",
  "/logos/cemposa.png",
  "/logos/crest.png",

    "/logos/helvex.png",
  "/logos/TheHomeDepot.png",
  "/logos/holcim.png",
  "/logos/whirpool.png",
  "/logos/urrea.svg",
];
// duplicamos el array para lograr el efecto infinito
const duplicatedLogos = [...logos, ...logos];

export default function Carrusel() {
  return (
    <Box {...carruselContainer}>
      <Flex {...carruselTrack}>
        {duplicatedLogos.map((logo, index) => (
          <Flex key={index} {...carruselItem}>
            <Image
              src={logo}
              alt={`logo-${index}`}
              objectFit="contain"
              maxH="70px"
              maxW="180px"
              transition="all 0.25s ease"
              _hover={{
                transform: "scale(1.04)",
              }}
            />
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}