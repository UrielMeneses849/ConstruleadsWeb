import { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
} from '@chakra-ui/react';

const downloadOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel-clasica', label: 'Excel - Clásica' },
  { value: 'excel-contactos', label: 'Excel - Contactos' },
  { value: 'excel-companias', label: 'Excel - Compañías' },
  { value: 'excel-prospeccion', label: 'Excel - Prospección' },
];

export default function DownloadPanel() {
  const [selectedOption, setSelectedOption] = useState(downloadOptions[0]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Flex
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      p={2}
      gap={2}
      align="center"
      boxShadow="none"
      w="320px"
      position="relative"
    >
      <Box flex="1" position="relative">
        <Flex
          as="button"
          type="button"
          w="100%"
          h="36px"
          px={3}
          align="center"
          justify="space-between"
          bg="var(--cl-input-bg)"
          border="1px solid var(--cl-border)"
          borderRadius="8px"
          color="var(--cl-text)"
          fontSize="13px"
          textAlign="left"
          transition="border-color 160ms ease, background 160ms ease"
          _hover={{ bg: 'var(--cl-hover)', borderColor: 'var(--cl-text-muted)' }}
          onClick={() => setIsOpen((value) => !value)}
        >
          <Text as="span" noOfLines={1}>
            {selectedOption.label}
          </Text>
          <Text as="span" color="var(--cl-text-muted)" fontSize="14px" ml={2}>
            {isOpen ? '⌃' : '⌄'}
          </Text>
        </Flex>

        {isOpen && (
          <Box
            position="absolute"
            top="44px"
            left={0}
            right={0}
            zIndex={50}
            bg="var(--cl-surface)"
            border="1px solid var(--cl-border)"
            borderRadius="8px"
            overflow="hidden"
            boxShadow="none"
          >
            {downloadOptions.map((option) => (
              <Flex
                as="button"
                type="button"
                key={option.value}
                w="100%"
                px={3}
                py={2}
                align="center"
                justify="space-between"
                bg="var(--cl-surface)"
                color="var(--cl-text)"
                fontSize="13px"
                textAlign="left"
                transition="background 160ms ease"
                _hover={{ bg: 'var(--cl-hover)' }}
                onClick={() => {
                  setSelectedOption(option);
                  setIsOpen(false);
                }}
              >
                <Text
                  as="span"
                  noOfLines={1}
                  fontWeight={selectedOption.value === option.value ? '600' : '500'}
                >
                  {option.label}
                </Text>
              </Flex>
            ))}
          </Box>
        )}
      </Box>

      <Button
        h="36px"
        minW="112px"
        bg="#FF6600"
        color="white"
        borderRadius="8px"
        fontSize="13px"
        _hover={{ bg: '#E65C00' }}
      >
        Descargar
      </Button>
    </Flex>
  );
}
