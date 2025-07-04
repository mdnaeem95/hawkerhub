// types/navigation.ts
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ScanTable: undefined;
  StallList: { hawkerId: string; tableNumber: string };
  CustomerMain: undefined;
  VendorMain: undefined;
  // add other screens here...
};
