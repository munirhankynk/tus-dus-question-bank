import { Tabs } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "../../constants"

type TabIconProps = {
  icon: string
  label: string
  focused: boolean
  isCenter?: boolean
  color?: string
}

const TabIcon = ({ icon, label, focused, isCenter, color }: TabIconProps) => {
  if (isCenter) {
    return (
      <View style={styles.centerTab}>
        <View style={[styles.centerIcon, focused && styles.centerIconActive]}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <Text style={[styles.centerLabel, focused && { color: COLORS.navy }]}>{label}</Text>
      </View>
    )
  }

  return (
    <View style={styles.tabItem}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text style={[
        styles.tabLabel,
        { color: focused ? (color || COLORS.navy) : COLORS.gray300 }
      ]}>{label}</Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray100,
          borderTopWidth: 1,
          height: 80,
          paddingTop: 8,
          paddingBottom: 20,
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📚" label="Kütüphane" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🌐" label="Topluluk" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📷" label="Yükle" focused={focused} isCenter />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👑" label="Premium" focused={focused} color={COLORS.premium} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  centerTab: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -15,
  },
  centerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  centerIconActive: {
    backgroundColor: COLORS.navy,
  },
  centerLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.gray300,
    marginTop: 4,
  },
})