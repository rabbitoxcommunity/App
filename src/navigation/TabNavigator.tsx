import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { useLang } from '../hooks/useLang';
import { AccountScreen } from '../screens/AccountScreen';
import { CartScreen } from '../screens/CartScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { colors } from '../theme';
import { GlassTabBar } from './GlassTabBar';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const { t } = useLang();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // The bar is drawn entirely by `GlassTabBar`; the icon, label and badge
        // all live there, so the navigator supplies only the accessible name.
        sceneStyle: { backgroundColor: colors.surface },
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.categories') }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.cart') }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.orders') }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.account') }}
      />
    </Tab.Navigator>
  );
}
