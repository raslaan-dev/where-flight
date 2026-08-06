import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function SavedScreen() {
  return (
    <Screen title="Saved" subtitle="Flights you follow, available offline">
      <Text tone="muted">Followed flights arrive in a later phase.</Text>
    </Screen>
  );
}
