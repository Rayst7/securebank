import { Ionicons } from '@expo/vector-icons'
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { BeneficiariesScreen } from '../screens/BeneficiariesScreen'
import { HistoryScreen } from '../screens/HistoryScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { colors, radius, spacing } from '../theme'
import { AppText } from '../components/AppText'
import { MainTabs } from './MainTabs'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.primary,
  },
}

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <StatusBar style="light" />
      <View style={styles.mark}>
        <Ionicons name="shield-checkmark" size={34} color={colors.white} />
      </View>
      <AppText variant="display" color={colors.white} weight="800">
        SecureBank
      </AppText>
      <AppText variant="caption" color="#9fb3c8">
        Banca digital segura
      </AppText>
      <ActivityIndicator
        size="small"
        color={colors.primarySoft}
        style={styles.spinner}
      />
    </View>
  )
}

export function RootNavigator() {
  const { isAuthenticated, restoring } = useAuth()

  if (restoring) {
    return <SplashScreen />
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={MainTabs} />
            <Stack.Screen
              name="Beneficiaries"
              component={BeneficiariesScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    gap: spacing.xs,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: radius.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  spinner: {
    marginTop: spacing.xl,
  },
})
