"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { GlobalModalProvider } from "@/context/GlobalModalContext";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      <GlobalModalProvider>
        {children}
      </GlobalModalProvider>
    </NextThemesProvider>
  );
}