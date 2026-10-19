import { useLocalSearchParams } from 'expo-router';
import JourneyCorrection from '@/components/journey-correction';

export default function CorrecaoRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <JourneyCorrection key={typeof id === 'string' ? id : ''} id={typeof id === 'string' ? id : ''} />;
}
