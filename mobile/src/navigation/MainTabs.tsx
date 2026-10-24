import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { ComponentProps } from 'react'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashboardScreen } from '../screens/DashboardScreen'
import { MoreScreen } from '../screens/MoreScreen'
import { MovementsScreen } from '../screens/MovementsScreen'
import { PaymentsScreen } from '../screens/PaymentsScreen'
import { TransferScreen } from '../screens/TransferScreen'
import { colors } from '../theme'
import type { MainTabParamList } from './types'

const Tab = createBottomTabNavigator<MainTabParamList>()

type IconName = ComponentProps<typeof Ionicons>['name']

const ICONS: Record<
  keyof MainTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Movements: { active: 'list', inactive: 'list-outline' },
  Transfer: { active: 'paper-plane', inactive: 'paper-plane-outline' },
  Payments: { active: 'card', inactive: 'card-outline' },
  More: { active: 'grid', inactive: 'grid-outline' },
}

const LABELS: Record<keyof MainTabParamList, string> = {
  Dashboard: 'Inicio',
  Movements: 'Movimientos',
  Transfer: 'Transferir',
  Payments: 'Pagos',
  More: 'Más',
}

export function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: LABELS[route.name],
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
        tabBarStyle: [
          styles.bar,
          {
            height: 68 + insets.bottom,
            paddingBottom: insets.bottom + 4,
          },
        ],
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name].active : ICONS[route.name].inactive}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Movements" component={MovementsScreen} />
      <Tab.Screen name="Transfer" component={TransferScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  icon: {
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 2,
  },
})
