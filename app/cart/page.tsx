import { CartScreen } from "../../apps/shopnest/src/cart-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function CartPage() {
  return <ShopNestProvider initialMode="v2"><CartScreen /></ShopNestProvider>;
}
