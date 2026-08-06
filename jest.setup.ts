/* eslint-disable @typescript-eslint/no-require-imports */

// Silence the Reanimated warning banner in tests.
process.env.EXPO_OS = process.env.EXPO_OS ?? 'ios';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

// A WebView is an opaque native view; tests care about the props we hand it,
// not about rendering a browser.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View, default: View };
});
