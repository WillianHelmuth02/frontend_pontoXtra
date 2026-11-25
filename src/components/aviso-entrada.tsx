import { useEffect, useState } from 'react';
import { Text } from '@/components/app-text';
import { avisoPontualidade, type Jornada } from '@/utils/jornadas';

export function AvisoEntrada({ jornada }: { jornada: Jornada }) {
  const [agora, setAgora] = useState(Date.now);
  const entrada = jornada.entrada_em;
  useEffect(() => {
    if (entrada) return;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [entrada]);

  const aviso = avisoPontualidade(jornada, entrada ? Date.parse(entrada) : agora);
  if (!aviso) return null;
  return <Text accessibilityLiveRegion="polite" style={{
    color: '#704300', backgroundColor: '#FFF2CD', padding: 12, borderRadius: 8,
  }}>{aviso}</Text>;
}
