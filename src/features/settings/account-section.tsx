import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useCredentialsStore } from '@/stores/credentials-store';
import { space } from '@/theme';

/**
 * "Connect your OpenSky account" — the upgrade from 400 to 4,000 credits/day.
 *
 * The client secret goes straight into the hardware keystore and is never
 * echoed back: once connected, the UI says *that* you are connected, not what
 * with. Disconnecting wipes both keys and drops back to anonymous mode, which
 * keeps working — the account is an upgrade, never a requirement.
 */

export function AccountSection() {
  const credentials = useCredentialsStore((state) => state.credentials);
  const connect = useCredentialsStore((state) => state.connect);
  const disconnect = useCredentialsStore((state) => state.disconnect);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await connect({ clientId, clientSecret });
      setClientId('');
      setClientSecret('');
    } finally {
      setBusy(false);
    }
  };

  if (credentials) {
    return (
      <View style={styles.stack}>
        <Text variant="bodyStrong">Connected as {credentials.clientId}</Text>
        <Text variant="caption" tone="muted">
          4,000 credits a day, 5-second update resolution, and flight paths on the
          detail screen. The secret is stored in this device's keystore only.
        </Text>
        <Button
          label="Disconnect"
          variant="secondary"
          onPress={() => void disconnect()}
          accessibilityHint="Removes the stored API client and returns to anonymous mode"
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Text variant="caption" tone="muted">
        Anonymous mode gives 400 credits a day. A free OpenSky account raises that
        to 4,000 and unlocks flight paths. Create an API client at
        opensky-network.org and paste its ID and secret here — they are kept in
        this device's secure keystore, never in the app's files.
      </Text>
      <TextField
        accessibilityLabel="OpenSky client ID"
        placeholder="Client ID"
        value={clientId}
        onChangeText={setClientId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        accessibilityLabel="OpenSky client secret"
        placeholder="Client secret"
        value={clientSecret}
        onChangeText={setClientSecret}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Button
        label={busy ? 'Connecting…' : 'Connect'}
        onPress={() => void submit()}
        disabled={busy || clientId.trim().length === 0 || clientSecret.trim().length === 0}
        accessibilityHint="Stores the API client securely and switches to the authenticated tier"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
});
