import { Navigate } from 'react-router-dom';

export default function Construleads() {
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{
        padding: '40px',
      }}
    >
      <h1>
        🎉 Bienvenido a Construleads
      </h1>

      <p>
        Acceso validado correctamente.
      </p>
    </div>
  );
}