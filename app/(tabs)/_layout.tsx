import { Tabs } from 'expo-router';
import { COLORS } from '../../constants';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.navy,
      tabBarInactiveTintColor: COLORS.gray300,
      tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: COLORS.gray100, paddingBottom: 8, paddingTop: 4, height: 60 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    }}>
      <Tabs.Screen name="library" options={{ tabBarLabel: 'Kütüphane' }} />
      <Tabs.Screen name="community" options={{ tabBarLabel: 'Topluluk' }} />
      <Tabs.Screen name="upload" options={{ tabBarLabel: 'Yükle' }} />
<Tabs.Screen
  name="premium"
  options={{
    tabBarLabel: 'Premium',
    tabBarActiveTintColor: COLORS.premium
  }}
/>      <Tabs.Screen name="profile" options={{ tabBarLabel: 'Profil' }} />
    </Tabs>
  );
}