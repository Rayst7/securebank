import type { NavigatorScreenParams } from '@react-navigation/native'

export type MainTabParamList = {
  Dashboard: undefined
  Movements: { accountId?: string } | undefined
  Transfer: undefined
  Payments: undefined
  More: undefined
}

export type RootStackParamList = {
  Login: undefined
  App: NavigatorScreenParams<MainTabParamList> | undefined
  Beneficiaries: undefined
  History: undefined
}
