import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function LiveScreen() {
  return (
    <Screen title="Live" subtitle="Every aircraft in view, as a list">
      <Text tone="muted">Live aircraft data arrives in the next phase.</Text>
    </Screen>
  );
}
