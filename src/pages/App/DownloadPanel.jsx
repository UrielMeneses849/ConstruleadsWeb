import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
} from '@chakra-ui/react';

const downloadOptions = [
  { value: 'pdf-obras', label: 'PDF - Obras' },
  { value: 'pdf-companias', label: 'PDF - Compañías' },
  { value: 'excel-clasica', label: 'Excel - Clásica' },
  { value: 'excel-contactos', label: 'Excel - Contactos' },
  { value: 'excel-companias', label: 'Excel - Compañías' },
  { value: 'excel-prospeccion', label: 'Excel - Prospección' },
];

export default function DownloadPanel({ selectedCount = 0 }) {
  const [selectedOption, setSelectedOption] = useState(downloadOptions[0]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <Flex
      ref={panelRef}
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      p={2}
      gap={2}
      align="center"
      boxShadow="none"
      w="clamp(288px, 24vw, 320px)"
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
            bottom="44px"
            left={0}
            zIndex={50}
            w="max-content"
            minW="220px"
            maxW="min(280px, calc(100vw - 32px))"
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
                whiteSpace="nowrap"
                transition="background 160ms ease"
                _hover={{ bg: 'var(--cl-hover)' }}
                onClick={() => {
                  setSelectedOption(option);
                  setIsOpen(false);
                }}
              >
                <Text
                  as="span"
                  whiteSpace="nowrap"
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
        minW={hasSelection ? '140px' : '128px'}
        bg="#FF653F"
        color="white"
        borderRadius="8px"
        fontSize="13px"
        _hover={{ bg: '#D94E2D' }}
      >
        {hasSelection ? 'Descargar selección' : 'Descargar todos'}
      </Button>
    </Flex>
  );
}
