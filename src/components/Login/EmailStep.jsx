import {
  Box,
  Button,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";

const EmailStep = ({ email, setEmail, onNext }) => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text
          fontSize="36px"
          fontWeight="700"
          color="#041A46"
          mb={2}
        >
          Accede a tu cuenta
        </Text>

        <Text color="#041A46">
          Ingresa tu correo electrónico para recibir un código de acceso.
        </Text>
      </Box>

 <Box>
  <Text
    mb={2}
    color="#041A46"
    fontWeight="500"
  >
    Correo electrónico
  </Text>

  <Input
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="correo@empresa.com"
    size="lg"
  />
</Box>

      <Button
        bg="#FF6A00"
        color="white"
        size="lg"
        _hover={{ bg: '#E85F00' }}
        onClick={onNext}
      >
        Enviar código
      </Button>
    </VStack>
  );
};

export default EmailStep;
