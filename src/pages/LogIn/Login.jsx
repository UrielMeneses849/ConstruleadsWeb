

import { useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import LoginModal from '../../components/Login/LoginModal';

export default function Login() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="#F7F9FC"
      direction="column"
      gap={6}
    >
      <Text
        fontSize="32px"
        fontWeight="700"
        color="#041A46"
      >
        Login Construleads
      </Text>

      <Button
        bg="#D95B27"
        color="white"
        size="lg"
        onClick={() => setIsOpen(true)}
        _hover={{ bg: '#B9471E' }}
      >
        Abrir Login
      </Button>

      <LoginModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </Flex>
  );
}
