import {
  Box,
  Text,
  Input,
  Button,
  Flex,
} from "@chakra-ui/react";
import { FiMail, FiLock, FiHeadphones, FiX, FiChevronRight } from "react-icons/fi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginByEmail, validarCodigo } from "../../api/auth";

export default function LoginModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  console.log("LOGIN MODAL RECIBIÓ:", {
  isOpen,
  onClose,
});

  const [email, setEmail] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [telefonoAsesor, setTelefonoAsesor] = useState("");
  const [currentStep, setCurrentStep] = useState('email');
  const [codigo, setCodigo] = useState('');
  const [codigoError, setCodigoError] = useState('');

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset="0"
      bg="rgba(0,0,0,0.55)"
      zIndex="99999"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="20px"
      onClick={onClose}
    >
      <Box
        bg="white"
        w="100%"
        maxW="600px"
        borderRadius="24px"
        p="32px"
        position="relative"
        boxShadow="0 20px 60px rgba(0,0,0,0.25)"
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          position="absolute"
          top="20px"
          right="20px"
          w="40px"
          h="40px"
          borderRadius="full"
          border="1px solid #D9D9D9"
          bg="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onClick={onClose}
        >
          <FiX size={18} color="#041A46" />
        </Box>

<Box
  display="flex"
  justifyContent="center"
  mb="32px"
>
  <img
    src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
    alt="Logo Construleads"
    style={{
      width: "360px",
      maxWidth: "100%",
      height: "auto",
    }}
  />
</Box>

        {currentStep === 'email' ? (
  <>
    <Text fontSize="24px" fontWeight="500" color="#041A46" mb="8px">
      Inicia Sesión
    </Text>

    <Text fontSize="14px" color="#041A46" mb="32px" fontWeight="400">
      Ingresa tu correo y te enviaremos un código de acceso
    </Text>

    <Text fontSize="14px" color="#041A46" mb="12px">
      Correo electrónico
    </Text>

    <Flex
      border={hasError ? '1px solid #D92D20' : '1px solid #D9D9D9'}
      borderRadius="16px"
      align="center"
      px="20px"
      h="56px"
      mb="40px"
      gap="12px"
    >
      <FiMail size={18} />
      <Input
        border="none"
        placeholder="ejemplo@empresa.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setHasError(false);
          setErrorMessage('');
        }}
        _focus={{ boxShadow: 'none' }}
      />
    </Flex>

    <Button
      w="100%"
      h="48px"
      bg="#FF6600"
      color="white"
      borderRadius="20px"
      fontSize="15px"
      rightIcon={<FiChevronRight />}
      _hover={{ bg: '#E85D00' }}
      onClick={async () => {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!email.trim()) {
          setHasError(true);
          setErrorMessage('Debes ingresar un correo electrónico.');
          return;
        }

        if (!emailValido) {
          setHasError(true);
          setErrorMessage('Ingresa un correo electrónico válido.');
          return;
        }

        setHasError(false);
        setErrorMessage('');

        try {
          const response = await loginByEmail(email);

          if (response?.estatus !== '1') {
            setHasError(true);
            setErrorMessage(
              response?.mensaje || 'No fue posible validar tu acceso.'
            );

            if (response?.telefono) {
              setTelefonoAsesor(response.telefono);
            }

            return;
          }

          setCurrentStep('codigo');
        } catch (error) {
          console.error('ERROR LOGIN:', error);
          setHasError(true);
          setErrorMessage(
            'No fue posible validar tu acceso en este momento.'
          );
        }
      }}
    >
      Enviar código
    </Button>
  </>
) : (
  <>
    <Text fontSize="24px" fontWeight="500" color="#041A46" mb="8px">
      Verifica tu código
    </Text>

    <Text fontSize="14px" color="#041A46" mb="32px">
      Ingresa el código que enviamos a{' '}
      <Text as="span" fontWeight="700">
        {email}
      </Text>
    </Text>

    <Flex justify="center" gap="12px" mb="16px">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Input
          key={index}
          maxLength={1}
          value={codigo[index] || ''}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();

            const nuevoCodigo = codigo.split('');
            nuevoCodigo[index] = value;

            setCodigoError('');
            setCodigo(nuevoCodigo.join(''));

            if (value) {
              const next = document.getElementById(`otp-${index + 1}`);
              next?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              const nuevoCodigo = codigo.split('');

              if (codigo[index]) {
                nuevoCodigo[index] = '';
                setCodigo(nuevoCodigo.join(''));
                return;
              }

              const previous = document.getElementById(`otp-${index - 1}`);

              if (previous && index > 0) {
                nuevoCodigo[index - 1] = '';
                setCodigo(nuevoCodigo.join(''));
                previous.focus();
              }
            }
          }}
          onPaste={(e) => {
            e.preventDefault();

            const pasted = e.clipboardData
              .getData('text')
              .replace(/\s/g, '')
              .toUpperCase()
              .slice(0, 6);

            if (!pasted) return;

            setCodigo(pasted);

            const lastIndex = Math.min(pasted.length - 1, 5);
            const next = document.getElementById(`otp-${lastIndex}`);
            next?.focus();

            setCodigoError('');
          }}
          id={`otp-${index}`}
          w="48px"
          h="48px"
          textAlign="center"
          fontSize="20px"
          borderRadius="10px"
          border="1px solid #D9D9D9"
          _focus={{
            borderColor: '#FF6600',
            boxShadow: '0 0 0 1px #FF6600',
          }}
        />
      ))}
    </Flex>

    {codigoError && (
      <Text
        color="#D92D20"
        fontSize="13px"
        textAlign="center"
        mb="16px"
        fontWeight="500"
      >
        {codigoError}
      </Text>
    )}

    <Button
      w="100%"
      h="48px"
      bg="#FF6600"
      color="white"
      borderRadius="20px"
      fontSize="15px"
      isDisabled={codigo.length < 6}
      onClick={async () => {
        if (!codigo.trim()) {
          setCodigoError('Ingresa el código de verificación.');
          return;
        }

        if (codigo.length < 6) {
          setCodigoError('El código debe contener 6 caracteres.');
          return;
        }

        if (codigo.length > 6) {
          setCodigoError('El código debe contener 6 caracteres.');
          return;
        }

        try {
          setCodigoError('');

          const response = await validarCodigo(
            email,
            codigo
          );

          if (response?.estatus !== '1') {
            setCodigoError(
              response?.mensaje ||
              'Código incorrecto. Favor de verificar.'
            );
            return;
          }

          localStorage.setItem(
            'cl_authenticated',
            'true'
          );

          navigate('/construleads');
        } catch (error) {
          console.error('ERROR VALIDANDO OTP:', error);

          setCodigoError(
            'No fue posible validar el código. Intenta nuevamente.'
          );
        }
      }}
    >
      Validar código
    </Button>

    <Text
      mt="16px"
      textAlign="center"
      color="#FF6600"
      cursor="pointer"
      fontSize="14px"
      fontWeight="500"
      onClick={() => {
        setCurrentStep('email');
        setCodigo('');
        setCodigoError('');
      }}
    >
      ← Cambiar correo
    </Text>
  </>
)}

        <Flex align="center" my="24px" gap="16px">
          <Box flex="1" h="2px" bg="#D9D9D9" />

          <Flex
            w="50px"
            h="50px"
            borderRadius="full"
            bg="#F4F4F4"
            align="center"
            justify="center"
          >
            <FiLock size={20} />
          </Flex>

          <Box flex="1" h="2px" bg="#D9D9D9" />
        </Flex>


        {hasError && errorMessage && (
          <Text
            color="#D92D20"
            fontSize="13px"
            textAlign="center"
            mb="16px"
            fontWeight="500"
          >
            {errorMessage}
          </Text>
        )}

        {hasError && (
        <Flex
          border="1px solid #D9D9D9"
          borderRadius="20px"
          p="16px"
          align="center"
          justify="center"
          gap="16px"
        >
          <Flex
            w="56px"
            h="56px"
            borderRadius="full"
            bg="#FFF4EC"
            align="center"
            justify="center"
          >
            <FiHeadphones size={22} color="#FF6600" />
          </Flex>

          <Box>
            <Text color="#041A46" fontSize="14px">
              ¿No tienes acceso?
            </Text>
            <Text color="#FF6600" fontSize="14px" fontWeight="500">
              {telefonoAsesor
                ? `Llama al ${telefonoAsesor}`
                : 'Contacta a tu asesor'}
            </Text>
          </Box>
        </Flex>
        )}

        <Text
          textAlign="center"
          color="#041A46"
          mt="24px"
          fontSize="14px"
        >
          Consultar Aviso de Privacidad
        </Text>
      </Box>
    </Box>
  );
}