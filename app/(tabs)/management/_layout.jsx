import { Stack } from 'expo-router'

const ManagementLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="cctv"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default ManagementLayout
