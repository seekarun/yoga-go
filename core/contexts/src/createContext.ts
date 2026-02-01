"use client";

import { createContext, useContext, type Context } from "react";

/**
 * Creates a typed context with a custom hook
 *
 * Usage:
 * ```ts
 * const [MyContext, useMyContext, MyProvider] = createTypedContext<MyContextType>('MyContext');
 * ```
 */
export function createTypedContext<T>(
  displayName: string,
): [Context<T | undefined>, () => T, string] {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = displayName;

  const useTypedContext = (): T => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(
        `use${displayName} must be used within a ${displayName}Provider`,
      );
    }
    return context;
  };

  return [Context, useTypedContext, displayName];
}
