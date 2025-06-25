/// <reference types="preact" />
import { useState } from 'preact/hooks';
import { login } from '../lib/auth';
import type { JSX } from 'preact';

interface LoginFormProps {
  onCancel?: () => void;
}

export const LoginForm = ({ onCancel }: LoginFormProps): JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    const { name, value } = e.currentTarget;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
  };

  return (
    <div class="flex min-h-[400px] items-center justify-center">
      <div class="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div>
          <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Iniciar Sesión como Administrador
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Ingresa tus credenciales de administrador
          </p>
        </div>
        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div class="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email" class="sr-only">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                class="relative block w-full rounded-t-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Correo electrónico"
                value={email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="password" class="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                class="relative block w-full rounded-b-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Contraseña"
                value={password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {error && (
            <div class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div class="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                class="group relative flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                Volver al Cronograma
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              class="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 