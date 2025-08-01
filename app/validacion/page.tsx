'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCircle2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Validacion() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Ingresar cédula, 2: Crear contraseña
  interface UserData {
  correo_electronico: string;
  cedula: string;
}

const [userData, setUserData] = useState<UserData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleValidarCedula = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createSupabaseClient();

      // Verificar si el usuario existe en la tabla usuario_nomina
      const { data, error: queryError } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('cedula', cedula)
        .single();

      if (queryError) {
        // Si no se encuentra el usuario, mostrar modal
        setShowModal(true);
        return;
      }

      // Verificar si el usuario ya tiene una cuenta en auth
      const { data: authData, error: authError } = await supabase
        .from('usuario_nomina')
        .select('auth_user_id')
        .eq('cedula', cedula)
        .single();

      if (authData && authData.auth_user_id) {
        setError('Ya existe una cuenta asociada a esta cédula. Por favor inicie sesión.');
        return;
      }

      // Si el usuario existe en nomina pero no tiene cuenta, pasar al siguiente paso
      // Asegurarse de que data tenga las propiedades requeridas por UserData
      if (data && typeof data.correo_electronico === 'string' && typeof data.cedula === 'string') {
        setUserData({
          correo_electronico: data.correo_electronico,
          cedula: data.cedula
        });
      } else {
        throw new Error('Datos de usuario incompletos');
      }
      setStep(2);
    } catch (err) {
      setError('Error al validar la cédula. Por favor intente nuevamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrearCuenta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();

      // Crear cuenta en Auth
      if (!userData?.correo_electronico) {
        setError('Datos del usuario no encontrados');
        setIsLoading(false);
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData?.correo_electronico || '',
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Actualizar el registro en usuario_nomina con el auth_user_id
        const { error: updateError } = await supabase
          .from('usuario_nomina')
          .update({ auth_user_id: authData.user.id })
          .eq('cedula', cedula);

        if (updateError) throw updateError;

        // Redirigir a la página principal
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/fondosecciones.webp')] bg-cover bg-center bg-no-repeat p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
        <div className="inline-block p-4 bg-primary/10mb-4">
            <img src="/logo360.webp" alt="Logo" className="max-w-[250px] w-full" />
          </div>
        </div>

        <Card className="border-none shadow-lg glassmorphism-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {step === 1 ? 'Validar Cédula' : 'Crear Contraseña'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1
                ? 'Ingresa tu número de cédula para validar tus datos'
                : 'Crea una contraseña para tu cuenta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <form onSubmit={handleValidarCedula} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Cédula</Label>
                  <Input
                    id="cedula"
                    type="text"
                    placeholder="Ingresa tu número de cédula"
                    className='bg-white'
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Validando...' : 'Validar Cédula'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCrearCuenta} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Gestión Humana 360. Todos los derechos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Modal para usuario no encontrado */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Usuario no encontrado</h3>
              <p className="mt-2 text-sm text-gray-500">
                No se encontraron datos del empleado en nuestra base de datos.
              </p>
            </div>
            <div className="mt-5">
              <Button onClick={closeModal} className="w-full">
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
