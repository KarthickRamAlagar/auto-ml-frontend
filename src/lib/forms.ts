import { z } from "zod";
import { ApiError } from "./api";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

// These rules mirror worker/src/lib/schemas.ts; the Worker is still the authority and re-checks everything.
export const usernameRule = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username can be at most 30 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and underscores.");
export const emailRule = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");
export const contactRule = z
  .string()
  .trim()
  .max(24, "That number is too long.")
  .refine((v) => /^\+?[0-9]{7,15}$/.test(v.replace(/[\s()-]/g, "")), "Enter a valid phone number, for example +919876543210.");
export const passwordRule = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password can be at most 128 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Use at least one letter and one number.");

/** Puts the Worker's per-field 422 messages next to the right inputs; returns a general message for anything else. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): string | null {
  if (e instanceof ApiError && (e.status === 422 || e.status === 409)) {
    const fields = (e.detail as { fields?: Record<string, string> } | undefined)?.fields;
    if (fields) {
      let any = false;
      for (const [k, m] of Object.entries(fields)) {
        setError(k as Path<T>, { type: "server", message: m });
        any = true;
      }
      if (any) return null;
    }
  }
  return (e as Error).message || "Something went wrong. Please try again.";
}
