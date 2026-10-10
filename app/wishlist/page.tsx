import { WishlistScreen } from "../../apps/shopnest/src/wishlist-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function WishlistPage() {
  return <ShopNestProvider initialMode="v2"><WishlistScreen /></ShopNestProvider>;
}
