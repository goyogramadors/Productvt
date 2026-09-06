import { z } from 'zod';

/**
 * Validación de formularios de auth con Zod (React Hook Form + `@hookform/resolvers/zod`, per
 * instrucción de la Fase 2). Los mensajes están en español porque son user-facing.
 */

export const loginSchema = z.object({
  email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().max(60, 'Máximo 60 caracteres.').optional(),
    email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
    // 6 caracteres es el mínimo que exige Firebase Authentication para email/password.
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
