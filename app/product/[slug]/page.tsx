import { ProductScreen } from "../../../apps/shopnest/src/product-screen";
import { ShopNestProvider } from "../../../apps/shopnest/src/store";

export default function ProductPage() {
  return <ShopNestProvider initialMode="v2"><ProductScreen slug="aurora-headphones" /></ShopNestProvider>;
}
