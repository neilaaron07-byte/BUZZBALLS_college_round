import { AccountScreen } from "../../apps/shopnest/src/account-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function AccountPage() {
  return <ShopNestProvider initialMode="v2"><AccountScreen /></ShopNestProvider>;
}
