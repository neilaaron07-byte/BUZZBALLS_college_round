import { SearchScreen } from "../../apps/shopnest/src/search-screen";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function SearchPage() {
  return <ShopNestProvider initialMode="v2"><SearchScreen /></ShopNestProvider>;
}
