"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export interface AuthFormState {
  error?: string;
  success?: string;
}

const emailSchema = z.string().trim().toLowerCase().email("Ingresa un correo electrónico válido.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña.").max(200),
  next: z.string().optional(),
});

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  let accessToken: string;
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        password: parsed.data.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.detail || "Correo o contraseña incorrectos." };
    }

    const tokenResponse = await response.json();
    accessToken = tokenResponse.access_token;
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Error de conexión con el servidor." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect(safeNext(parsed.data.next));
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser?: boolean;
  created_at: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export interface Organization {
  id: string;
  name: string;
  short_name?: string;
  role: string;
}

export async function getMyOrganizations(): Promise<Organization[]> {
  const token = await getAuthToken();
  if (!token) return [];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  try {
    const response = await fetch(`${apiUrl}/auth/me/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "La contraseña debe tener al menos 12 caracteres.")
      .max(200)
      .regex(/[A-Za-z]/, "Incluye al menos una letra.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo no válido." };
  }

  return {
    success: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
  };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Contraseña no válida." };
  }

  return { error: "Funcionalidad pendiente de implementar." };
}
