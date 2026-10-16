import { Redirect, router, Stack, useGlobalSearchParams, useSegments } from 'expo-router';
import { View } from 'react-native';

import TopBar from '../../src/components/TopBar';
import { fmtDate } from '../../src/format';
import { useSession } from '../../src/session';
import { colors } from '../../src/theme';

// Everything behind sign-in shares the blue top bar.
export default function SignedInLayout() {
  const { token, selectedDate } = useSession();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  if (!token) return <Redirect href="/" />;

  const screen = segments[1];
  const home = selectedDate ? '/dashboard' : '/setup';
  const onBack = () => {
    if (screen === 'month' && params.year) router.replace(`/year/${params.year}`);
    else router.replace(home);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar canBack={screen === 'year' || screen === 'month'} onBack={onBack} dateChip={selectedDate ? fmtDate(selectedDate) : ''} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </View>
  );
}
