
/**
 * O projeto usa somente tema claro, inclusive na renderização estática Web.
 * Dispensa sincronização após hidratação e acompanha userInterfaceStyle do app.
 */
export function useColorScheme() {
  return 'light' as const;
}
