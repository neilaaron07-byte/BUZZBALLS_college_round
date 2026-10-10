"use client";
/* The standalone fixture keeps its root link as a normal document boundary. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { ShopNestFooter, ShopNestHeader } from "./components";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "error" | "locked" | "success">("idle");
  const [attempts, setAttempts] = useState(0);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (state === "locked") return; if (email === "demo@shopnest.local" && password === "patchwork") { setState("success"); return; } const next = attempts + 1; setAttempts(next); setState(next >= 3 ? "locked" : "error"); };
  return <main className="sn-app"><ShopNestHeader eyebrow="Account / local demo" /><div className="sn-page sn-login-page"><div className="sn-login-card"><div className="sn-login-mark"><Sparkles size={18} aria-hidden="true" /></div><span className="sn-overline">SHOPNEST / ACCOUNT</span><h1>Welcome <em>back.</em></h1><p>Sign in to view saved objects and demo orders. No account leaves this browser.</p>{state === "success" ? <div className="sn-login-success" role="status"><ShieldCheck size={18} aria-hidden="true" /><strong>You are signed in.</strong><span>Your saved collection is ready in this local session.</span><a className="sn-button sn-button-dark" href="/">Return to ShopNest <ArrowRight size={15} aria-hidden="true" /></a></div> : <form onSubmit={submit}><label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" disabled={state === "locked"} /></label><label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" disabled={state === "locked"} /></label>{state === "error" ? <p className="sn-form-error" role="alert">That demo sign-in did not match. Try demo@shopnest.local and patchwork.</p> : null}{state === "locked" ? <p className="sn-form-error" role="alert">Sign-in paused after three attempts. The local lock protects the demo state; reset to try again.</p> : null}<button className="sn-button sn-button-dark" type="submit" disabled={state === "locked"}>Sign in <ArrowRight size={15} aria-hidden="true" /></button>{state === "locked" ? <button className="sn-text-button" type="button" onClick={() => { setAttempts(0); setState("idle"); setEmail(""); setPassword(""); }}><LockKeyhole size={14} aria-hidden="true" /> Reset local lock</button> : null}</form>}<small className="sn-login-note"><LockKeyhole size={13} aria-hidden="true" /> Demo credentials stay in this browser.</small></div></div><ShopNestFooter /></main>;
}
