import { StyleSheet, View } from 'react-native'
import { colors } from '../theme'
import { initials } from '../utils/format'
import { AppText } from './AppText'

interface AvatarProps {
  firstName: string
  lastName: string
  size?: number
}

export function Avatar({ firstName, lastName, size = 52 }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel={`${firstName} ${lastName}`}
    >
      <AppText
        variant="label"
        color={colors.primaryStrong}
        weight="800"
        style={{ fontSize: size * 0.32 }}
      >
        {initials(firstName, lastName)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#b7e4dc',
  },
})
