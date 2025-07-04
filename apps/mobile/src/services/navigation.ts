// apps/mobile/src/navigation/navigationService.ts
import { RootStackParamList } from '@/navigation/RootNavigator';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
