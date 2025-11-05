import { Stack } from 'expo-router'

const ControlLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="ManualControl"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AutoControl"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default ControlLayout
