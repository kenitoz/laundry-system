import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../src/session';
import { colors, fonts } from '../src/theme';

// Start screen. Signed-in users skip it; the landing game replaces the placeholder body.
export default function Index() {
  const { token, selectedDate } = useSession();
  const insets = useSafeAreaInsets();
  if (token) return <Redirect href={selectedDate ? '/dashboard' : '/setup'} />;
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 22, paddingTop: insets.top, backgroundColor: colors.blue }}>
      <Text style={{ color: '#fff', fontSize: 28, fontFamily: fonts.display }}>Bubblebee</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/login')}
        style={{ marginTop: 22, borderRadius: 12, backgroundColor: colors.yellow, padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: colors.navy, fontSize: 16, fontFamily: fonts.sansBold }}>Tap to Sign In</Text>
      </Pressable>
    </View>
  );
}
