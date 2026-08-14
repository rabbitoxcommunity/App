import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SortKey } from '../data/filters';

export type TabParamList = {
  Home: undefined;
  Categories: undefined;
  Cart: undefined;
  Orders: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Legal: { type: 'terms' | 'privacy' };
  Tabs: NavigatorScreenParams<TabParamList>;
  CategoryListing: { categoryId: string };
  ProductDetail: { productId: string; variantId?: string };
  Checkout: { pickedLocation?: { latitude: number; longitude: number } } | undefined;
  OrderPlaced: { orderId: string };
  /** Omit `orderId` to track whichever order is currently live. */
  OrderTracking: { orderId?: string } | undefined;
  MyCredit: undefined;
  ToastGallery: undefined;
  Search: { query?: string };
  LocationPicker: { onLocationPicked: (location: { latitude: number; longitude: number; label?: string; lines?: string }) => void };
  Addresses: undefined;
};

/** Filter state handed between the listing screen and its bottom sheet. */
export type ListingFilters = {
  sort: SortKey;
  subcategoryIds: string[];
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
