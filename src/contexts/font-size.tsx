import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

export const fontSizes = { Pequeno: 0.9, Médio: 1, Grande: 1.2 } as const;
type FontSize = keyof typeof fontSizes;
const storageKey = 'pontoxtra:font-size';

const FontSizeContext = createContext<{ size: FontSize; selectSize: (size: FontSize) => void }>({
  size: 'Médio',
  selectSize: () => {},
});

export function FontSizeProvider({ children }: PropsWithChildren) {
  const [size, setSize] = useState<FontSize>('Médio');
  const selected = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then((saved) => {
      if (active && !selected.current && (saved === 'Pequeno' || saved === 'Médio' || saved === 'Grande')) {
        setSize(saved);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  function selectSize(next: FontSize) {
    selected.current = true;
    setSize(next);
    void AsyncStorage.setItem(storageKey, next).catch(() => {});
  }

  return <FontSizeContext.Provider value={{ size, selectSize }}>{children}</FontSizeContext.Provider>;
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
