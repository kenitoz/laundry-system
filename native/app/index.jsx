import { Text, View } from 'react-native';

// Placeholder start screen; the landing game replaces it.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#123d86' }}>
      <Text style={{ color: '#fff', fontSize: 28 }}>Bubblebee</Text>
    </View>
  );
}
