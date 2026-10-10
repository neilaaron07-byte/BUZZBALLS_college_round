import { SupportScreen } from "../../apps/shopnest/src/support-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function SupportPage() {
  return <ShopNestProvider initialMode="v2"><SupportScreen /></ShopNestProvider>;
}
