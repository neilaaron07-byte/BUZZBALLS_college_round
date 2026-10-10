import { ReleaseScreen } from "../../apps/shopnest/src/release-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function ReleasePage() {
  return <ShopNestProvider initialMode="v2"><ReleaseScreen /></ShopNestProvider>;
}
