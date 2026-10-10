import { HomeScreen } from "../apps/shopnest/src/home-screen";
import { ShopNestProvider } from "../apps/shopnest/src/store";

export default function Home() {
  return <ShopNestProvider initialMode="v2"><HomeScreen /></ShopNestProvider>;
}
