import { LoginScreen } from "../../apps/shopnest/src/login-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function LoginPage() {
  return <ShopNestProvider initialMode="v2"><LoginScreen /></ShopNestProvider>;
}
