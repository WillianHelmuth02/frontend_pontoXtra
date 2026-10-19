import { useLocalSearchParams } from 'expo-router';
import JourneyDetails from '@/components/journey-details';

/** O ID permanece string do início ao fim, inclusive na navegação. A key reinicia
 * o estado da página quando uma navegação troca a jornada na mesma rota.
 */
export default function JornadaRoute() {
  const { id, criada } = useLocalSearchParams<{ id?: string; criada?: string }>();
  return <JourneyDetails key={typeof id === 'string' ? id : ''} id={typeof id === 'string' ? id : ''} criada={criada === '1'} />;
}
