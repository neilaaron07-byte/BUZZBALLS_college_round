import { CheckoutScreen } from "../../apps/shopnest/src/checkout-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function CheckoutPage() {
  return <ShopNestProvider initialMode="v2"><CheckoutScreen /></ShopNestProvider>;
}
