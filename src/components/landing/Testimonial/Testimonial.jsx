import { useEffect, useRef, useState } from "react";

import {
  Box,
  Flex,
  Heading,
  Image,
  Text,
} from "@chakra-ui/react";

import {
  testimonialSection,
  testimonialContainer,
  testimonialTitle,
  testimonialHighlight,
  testimonialWrapper,
  testimonialGrid,
  testimonialCard,
  testimonialAvatar,
  testimonialName,
  testimonialRole,
  testimonialText,
  testimonialQuote,
  arrowButton,
} from "./style";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const testimonials = [
  {
    name: "Adolfo Gutiérrez Álvarez",
    role: "Building & Infrastructure - Urrea",
    text: "Gracias a Construleads y BR Analytics entendimos mejor a nuestros clientes. Generamos propuestas más efectivas.",
    image: `${import.meta.env.BASE_URL}logos/urrea.svg`,
  },
  {
    name: "Omar Armas",
    role: "Gerente de Inteligencia de Mercados - Berel",
    text: "Construleads nos brinda información clave para recomendaciones y nuevas oportunidades de negocio.",
    image: `${import.meta.env.BASE_URL}logos/berel.png`,
  },
  {
    name: "Ruben Reyes Torres",
    role: "Gerente Línea Adhesivos - HomeDepot",
    text: "El acceso a Construleads nos acerca más a nuestros clientes y nos lleva a proyectos con mejores oportunidades.",
    image: `${import.meta.env.BASE_URL}logos/TheHomeDepot.png`,
  },
];

export default function Testimonial() {
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
      {...testimonialSection}
    >
      <Flex {...testimonialContainer}>
        <Heading
          {...testimonialTitle}
          opacity={isVisible ? 1 : 0}
          transform={isVisible ? "translateY(0)" : "translateY(60px)"}
          transition="all 1s cubic-bezier(0.22, 1, 0.36, 1)"
        >
          Líderes de la industria ya
          <br />
          <Box as="span" {...testimonialHighlight}>
            prospectan con nosotros
          </Box>
        </Heading>

        <Flex
          {...testimonialWrapper}
          opacity={isVisible ? 1 : 0}
          transform={isVisible ? "translateY(0)" : "translateY(80px)"}
          transition="all 1.1s cubic-bezier(0.22, 1, 0.36, 1)"
        >
          <Flex {...arrowButton}>
            <FiChevronLeft boxSize={7} />
          </Flex>

          <Box {...testimonialGrid}>
            {testimonials.map((testimonial, index) => (
              <Flex
                key={index}
                {...testimonialCard}
                opacity={isVisible ? 1 : 0}
                transform={isVisible ? "translateY(0)" : "translateY(120px)"}
                transition={`all 1s cubic-bezier(0.22, 1, 0.36, 1) ${0.25 + index * 0.2}s`}
              >
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  {...testimonialAvatar}
                />

                <Text {...testimonialName}>
                  {testimonial.name}
                </Text>

                <Text {...testimonialRole}>
                  {testimonial.role}
                </Text>

                <Text {...testimonialText}>
                  {testimonial.text}
                </Text>

                <Text {...testimonialQuote}>
                  ”
                </Text>
              </Flex>
            ))}
          </Box>

          <Flex {...arrowButton}>
            <FiChevronRight boxSize={7} />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}