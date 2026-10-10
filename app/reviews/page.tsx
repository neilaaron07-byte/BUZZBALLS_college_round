import { ReviewsScreen } from "../../apps/shopnest/src/reviews-panel";
import { ShopNestProvider } from "../../apps/shopnest/src/store";

export default function ReviewsPage() {
  return <ShopNestProvider initialMode="v2"><ReviewsScreen /></ShopNestProvider>;
}
