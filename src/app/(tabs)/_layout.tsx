import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { borderWidthFor, fontSize, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Map', icon: 'map-outline' },
  { name: 'live', title: 'Live', icon: 'radar' },
  { name: 'saved', title: 'Saved', icon: 'bookmark-outline' },
  { name: 'airports', title: 'Airports', icon: 'airport' },
  { name: 'settings', title: 'Settings', icon: 'cog-outline' },
];

export default function TabsLayout() {
  const { colors, stackedLayout } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgMuted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: borderWidthFor(colors),
        },
        // Once text is large the labels stop fitting under five icons, so the
        // bar goes icon-only rather than truncating "Airports" to "Airpo...".
        tabBarShowLabel: !stackedLayout,
        tabBarLabelStyle: { fontSize: fontSize.xs },
      }}>
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // Explicit, because the visible label disappears at large text sizes.
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
