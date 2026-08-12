import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../components/Icon';
import { Bump } from '../components/motion';
import { useLang } from '../hooks/useLang';
import { AccountScreen } from '../screens/AccountScreen';
import { CartScreen } from '../screens/CartScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { useCart } from '../store/CartContext';
import { colors, fontSize, weight } from '../theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/** Design: 25px glyph, 10px label, filled + green when active. */
function TabItem({
  icon,
  label,
  focused,
  badge,
}: {
  icon: IconName;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  const color = focused ? colors.primary : colors.placeholder;
  return (
    <View style={styles.item}>
      <View>
        {/* The glyph pops when the tab becomes active. */}
        <Bump value={focused ? 'on' : 'off'}>
          {/* Per the design, the active tab is the filled cut of the same
              glyph and inactive tabs are the outlined one. */}
          <Icon name={icon} size={25} color={color} filled={focused} />
        </Bump>
        {!!badge && badge > 0 && (
          <Bump value={badge} style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge > 99 ? '99+' : badge}</Text>
          </Bump>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color, fontWeight: focused ? weight.heavy : weight.bold },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function TabNavigator() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [styles.tabBar, { height: 62 + insets.bottom, paddingBottom: insets.bottom }],
        // The tab bar is drawn entirely by TabItem so it matches the design exactly.
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon="home"
              label={t('tabs.home')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.categories'),
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon="categories"
              label={t('tabs.categories')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.cart'),
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon="cart"
              label={t('tabs.cart')}
              focused={focused}
              badge={itemCount}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.orders'),
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon="orders"
              label={t('tabs.orders')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.account'),
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon="account"
              label={t('tabs.account')}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 10,
    elevation: 0,
  },
  tabBarItem: { paddingTop: 0 },
  item: { alignItems: 'center', gap: 5, width: 72 },
  label: { fontSize: fontSize.micro },
  badge: {
    position: 'absolute',
    top: -4,
    end: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: weight.heavy,
    color: colors.onPrimary,
  },
});
