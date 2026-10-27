import { Stack } from 'expo-router';

/** Le brouillon est fourni au niveau racine pour survivre à la navigation. */
export default function AdhesionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
