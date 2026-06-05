

import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';

const VerificationStep = ({
  email,
  code,
  setCode,
  onBack,
  onVerify,
}) => {
  const handleChange = (value, index) => {
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text
          fontSize="36px"
          fontWeight="700"
          color="#041A46"
          mb={2}
        >
          Revisa tu correo
        </Text>

        <Text color="#041A46">
          Abre el correo enviado a {email} e ingresa el código de acceso.
        </Text>
      </Box>

      <Box>
        <Text mb={3} color="#041A46" fontWeight="500">
          Código de verificación
        </Text>

        <HStack spacing={3} justify="center">
          {code.map((digit, index) => (
            <Input
              key={index}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              maxLength={1}
              textAlign="center"
              fontSize="24px"
              fontWeight="700"
              w="60px"
              h="60px"
            />
          ))}
        </HStack>
      </Box>

      <Text
        color="#FF6A00"
        cursor="pointer"
        fontWeight="600"
        onClick={onBack}
      >
        ← Cambiar correo
      </Text>

      <Button
        bg="#FF6A00"
        color="white"
        size="lg"
        _hover={{ bg: '#E85F00' }}
        onClick={onVerify}
      >
        Verificar y acceder
      </Button>
    </VStack>
  );
};

export default VerificationStep;