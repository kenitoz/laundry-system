import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../../../src/session';
import { colors, fonts } from '../../../src/theme';

const icon = (glyph) => function TabIcon({ color }) {
  return <Text style={{ color, fontSize: 17, lineHeight: 20 }}>{glyph}</Text>;
};

// The bottom bar only exists once a day is picked (same rule as the web nav).
export default function TabsLayout() {
  const { selectedDate } = useSession();
  const insets = useSafeAreaInsets();
  if (!selectedDate) return <Redirect href="/setup" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy, borderTopWidth: 0, height: 64 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(8, insets.bottom), paddingHorizontal: 8 },
        tabBarItemStyle: { borderRadius: 7, marginHorizontal: 2 },
        tabBarActiveBackgroundColor: colors.navActive,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#c5d8f4',
        tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="add" options={{ title: 'Add Customer', tabBarIcon: icon('♙') }} />
      <Tabs.Screen name="daily" options={{ title: 'Daily', tabBarIcon: icon('◷') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
    </Tabs>
  );
}
