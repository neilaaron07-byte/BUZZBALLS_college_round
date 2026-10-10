"use client";
/* URL query hydration is deliberately deferred until the browser owns the fixture. */
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { categories } from "./catalog";
import { catalogSummary, emptyCatalogQuery, formatCatalogSummary, parseCatalogQuery, queryCatalog, queryDescription, type CatalogQuery } from "./catalog-engine";
import { ProductCard, ShopNestFooter, ShopNestHeader } from "./components";
import { useShopNest } from "./store";

export function SearchScreen() {
  const { mode } = useShopNest();
  const [catalogQuery, setCatalogQuery] = useState<CatalogQuery>(emptyCatalogQuery);
  const [mobileFilters, setMobileFilters] = useState(false);
  useEffect(() => { setCatalogQuery(parseCatalogQuery(window.location.search)); }, []);
  const results = useMemo(() => queryCatalog(catalogQuery), [catalogQuery]);
  const summary = useMemo(() => catalogSummary(results), [results]);
  const filterCount = Number(catalogQuery.category !== "all") + Number(catalogQuery.price !== "all") + Number(catalogQuery.sort !== "featured");
  const reset = () => setCatalogQuery(emptyCatalogQuery());
  return <main className="sn-app"><ShopNestHeader eyebrow="Catalog / browse" /><div className="sn-page sn-search-page"><div className="sn-breadcrumb"><a href="/">ShopNest</a><span>/</span><b>Catalog</b></div><header className="sn-page-heading"><div><span className="sn-overline">SHOPNEST / CATALOG</span><h1>Find your next <em>favorite.</em></h1><p>{formatCatalogSummary(summary)} · release {mode.toUpperCase()} is active</p></div><button type="button" className="sn-filter-trigger" onClick={() => setMobileFilters((value) => !value)}><SlidersHorizontal size={15} aria-hidden="true" /> Filters {filterCount ? <b>{filterCount}</b> : null}</button></header><div className="sn-search-bar"><Search size={17} aria-hidden="true" /><input value={catalogQuery.text} onChange={(event) => setCatalogQuery({ ...catalogQuery, text: event.target.value })} placeholder="Search audio, desk, travel…" aria-label="Search products" />{catalogQuery.text ? <button type="button" onClick={() => setCatalogQuery({ ...catalogQuery, text: "" })} aria-label="Clear search"><X size={14} aria-hidden="true" /></button> : null}</div><div className="sn-catalog-layout"><aside className={`sn-filter-panel${mobileFilters ? " is-open" : ""}`}><div className="sn-filter-head"><strong>Filter catalog</strong><button type="button" onClick={reset}>Reset</button></div><label className="sn-filter-group"><span>Category</span><select value={catalogQuery.category} onChange={(event) => setCatalogQuery({ ...catalogQuery, category: event.target.value as CatalogQuery["category"] })}><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label><label className="sn-filter-group"><span>Price</span><select value={catalogQuery.price} onChange={(event) => setCatalogQuery({ ...catalogQuery, price: event.target.value as CatalogQuery["price"] })}><option value="all">Any price</option><option value="under-100">Under $100</option><option value="100-200">$100–$200</option><option value="over-200">Over $200</option></select></label><label className="sn-filter-group"><span>Sort by</span><select value={catalogQuery.sort} onChange={(event) => setCatalogQuery({ ...catalogQuery, sort: event.target.value as CatalogQuery["sort"] })}><option value="featured">Featured</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></aside><section className="sn-results" aria-live="polite">{results.length ? <div className="sn-product-grid">{results.map((product) => <ProductCard key={product.slug} product={product} />)}</div> : <div className="sn-empty-state"><span><Filter size={18} aria-hidden="true" /></span><h2>No exact matches</h2><p>Nothing matched {queryDescription(catalogQuery)}. Try a wider category or remove one filter.</p><button type="button" className="sn-button sn-button-dark" onClick={reset}>Reset filters</button></div>}</section></div></div><ShopNestFooter /></main>;
}
