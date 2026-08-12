import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import { useToast } from '../components/Toast';
import { defaultVariant, hasVariants, isPurchasable, t as tr, variantLabel } from '../data/catalog';
import type { Product, ProductVariant } from '../data/types';
import { useCart } from '../store/CartContext';
import type { RootNavigation } from '../navigation/types';
import { useLang } from './useLang';

/**
 * The one place "add this product" is decided:
 *  - out of stock  → nothing happens (the button is disabled anyway)
 *  - has variants  → open the detail screen so the customer picks a SKU
 *  - otherwise     → add the single SKU and confirm with a toast
 */
export function useAddToCart() {
  const navigation = useNavigation<RootNavigation>();
  const { addItem } = useCart();
  const { show } = useToast();
  const { t, language } = useLang();

  const confirm = useCallback(
    (product: Product, variant: ProductVariant) => {
      show({
        title: t('toast.addedToCart'),
        body: `${tr(product.name, language)} · ${variantLabel(product, variant, language)}`,
        action: { label: t('common.view'), onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }) },
      });
    },
    [navigation, show, t, language],
  );

  /** Called by the + button on a product card or row. */
  const addProduct = useCallback(
    (product: Product) => {
      if (hasVariants(product)) {
        navigation.navigate('ProductDetail', { productId: product.id });
        return;
      }
      const variant = defaultVariant(product);
      if (!isPurchasable(variant.stock)) {
        show({
          title: t('toast.outOfStock', { name: tr(product.name, language) }),
          tone: 'warning',
          icon: 'error',
        });
        return;
      }
      addItem(product.id, variant.id);
      confirm(product, variant);
    },
    [addItem, confirm, navigation, show, t, language],
  );

  /** Called by the product detail screen once a SKU is chosen. */
  const addVariant = useCallback(
    (product: Product, variant: ProductVariant, quantity: number) => {
      if (!isPurchasable(variant.stock)) return false;
      addItem(product.id, variant.id, quantity);
      confirm(product, variant);
      return true;
    },
    [addItem, confirm],
  );

  return { addProduct, addVariant };
}
