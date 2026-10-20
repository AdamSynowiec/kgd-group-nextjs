import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false w HTML ze statycznego eksportu i przy hydratacji, true po zamontowaniu w przeglądarce.
 * Panel trzyma sesję w localStorage — rzeczy od niej zależne (menu wg uprawnień, login)
 * oraz od bieżącej daty renderujemy dopiero po zamontowaniu, żeby nie było hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
