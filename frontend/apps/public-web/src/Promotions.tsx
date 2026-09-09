import { useState } from "react";
import {
  marketNames,
  markets,
  type Campaign,
} from "@gigabyte-cashback/api-client";
import { Badge, Empty, money } from "@gigabyte-cashback/ui";

// A single-product ceiling stays honest when household, category and invoice rules differ.
const ceiling = (c: Campaign) =>
  Math.max(0, ...c.data.products.map((p) => p.cashbackMinor));
const period = (from: string, to: string) =>
  `${from.slice(0, 10)} — ${to.slice(0, 10)}`;
const available = (c: Campaign) =>
  c.data.acceptingClaims &&
  c.availableMinor > 0 &&
  Date.now() >= Date.parse(c.data.claimStart) &&
  Date.now() <= Date.parse(c.data.claimEnd);

export function PromotionArt({
  campaign,
  compact = false,
}: {
  campaign?: Campaign;
  compact?: boolean;
}) {
  return (
    <div
      className={`promotion-art ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      {campaign?.data.bannerUrl ? (
        <img src={campaign.data.bannerUrl} alt="" />
      ) : (
        <>
          <div className="art-orbit" />
          <div className="art-package">
            <span>AORUS</span>
            <strong>XTREME</strong>
            <small>PERFORMANCE SERIES</small>
            <div className="art-stripes">▰ ▰ ▰</div>
          </div>
        </>
      )}
      {campaign && !compact && (
        <div className="reward-seal">
          <small>UP TO</small>
          <strong>{money(ceiling(campaign), campaign.data.currency)}</strong>
          <small>PER PRODUCT</small>
        </div>
      )}
    </div>
  );
}

export function HowItWorks() {
  return (
    <div className="journey-grid">
      {[
        [
          "01",
          "Choose your upgrade",
          "Check the products, participating retailers and purchase dates for your selected market.",
        ],
        [
          "02",
          "Prepare your claim",
          "Sign in, enter your details and add eligible products from one invoice after the waiting period.",
        ],
        [
          "03",
          "Send your evidence",
          "Upload your invoice and a serial-number image for each product. Review your details before submitting.",
        ],
        [
          "04",
          "Follow every step",
          "Open My claims to follow the review, respond to requests and check your payment status.",
        ],
      ].map(([n, title, text]) => (
        <article key={n}>
          <span>{n}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

export function Promotions({
  campaigns,
  market,
  onOpen,
  onTrack,
}: {
  campaigns: Campaign[];
  market: string;
  onOpen: (c: Campaign) => void;
  onTrack: () => void;
}) {
  const list = campaigns.filter((c) => c.data.markets.includes(market));
  const featured = list.find(available) ?? list[0];
  return (
    <>
      <section className="promotion-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            GIGABYTE REWARDS · {marketNames[market]?.toUpperCase()}
          </p>
          <h1>
            Build more.
            <br />
            <em>Get more back.</em>
          </h1>
          <p>
            Your next upgrade, rewarded. Explore eligible products and bring
            them together in one cashback claim.
          </p>
          <div className="actions">
            <a className="button button-primary" href="#cashback-offers">
              Explore cashback ↗
            </a>
            <button className="button hero-secondary" onClick={onTrack}>
              Track a claim
            </button>
          </div>
          <div className="hero-points">
            <span>
              <b>01</b> Choose products
            </span>
            <span>
              <b>02</b> One invoice
            </span>
            <span>
              <b>03</b> Track every step
            </span>
          </div>
        </div>
        <PromotionArt campaign={featured} />
      </section>
      <div className="market-strip">
        <span>FIVE MARKETS. ONE PROGRAMME.</span>
        {markets.map((m) => (
          <span key={m} className={m === market ? "selected" : ""}>
            <b>{m}</b> {marketNames[m]}
          </span>
        ))}
      </div>
      <section className="promotion-section" id="cashback-offers">
        <div className="section-title">
          <div>
            <p className="eyebrow">CASHBACK OFFERS</p>
            <h2>Your next upgrade starts here.</h2>
          </div>
          <p>
            Explore promotions for {marketNames[market]}.<br />
            Eligibility and rewards depend on each offer.
          </p>
        </div>
        <div className="offer-grid">
          {list.map((c) => (
            <article className="offer-card" key={c.id}>
              <PromotionArt campaign={c} compact />
              <div className="offer-body">
                <div className="offer-meta">
                  <span>
                    {[...new Set(c.data.products.map((p) => p.category))].join(
                      " · ",
                    )}
                  </span>
                  <Badge>
                    {available(c) ? "Open for claims" : "Not accepting claims"}
                  </Badge>
                </div>
                <h3>{c.data.name}</h3>
                <p>{c.data.description}</p>
                <p>
                  <strong>Up to {money(ceiling(c), c.data.currency)}</strong>{" "}
                  per eligible product
                </p>
                <dl>
                  <div>
                    <dt>Purchase period</dt>
                    <dd>{period(c.data.purchaseStart, c.data.purchaseEnd)}</dd>
                  </div>
                  <div>
                    <dt>Claim period</dt>
                    <dd>{period(c.data.claimStart, c.data.claimEnd)}</dd>
                  </div>
                </dl>
                <button className="offer-link" onClick={() => onOpen(c)}>
                  View offer <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
        {!list.length && (
          <Empty>
            No published campaigns for this market. Choose another market or
            check back later.
          </Empty>
        )}
      </section>
      <section className="benefit-strip" aria-label="Programme benefits">
        {[
          ["✓", "Same-invoice claims", "Keep eligible products together"],
          ["◎", "Cross-border purchases", "Check each offer’s eligible stores"],
          ["€", "Traceable decisions", "Follow review and payment separately"],
        ].map(([icon, title, text]) => (
          <div key={title}>
            <span>{icon}</span>
            <p>
              <b>{title}</b>
              <small>{text}</small>
            </p>
          </div>
        ))}
      </section>
      <section className="promotion-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>From upgrade to cashback.</h2>
          </div>
        </div>
        <HowItWorks />
      </section>
    </>
  );
}

export function PromotionDetails({
  campaign: c,
  market,
  busy,
  onBack,
  onStart,
}: {
  campaign: Campaign;
  market: string;
  busy: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const [section, setSection] = useState("products");
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const products = c.data.products.filter((p) =>
    `${p.model} ${p.id} ${p.category} ${p.series}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const retailers = c.data.retailers.filter((r) =>
    `${r.name} ${r.country} ${marketNames[r.country] ?? ""}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const accepting = available(c);
  return (
    <>
      <section className="promotion-hero detail-hero">
        <div className="hero-copy">
          <button className="back-offers" onClick={onBack}>
            ← All offers
          </button>
          <p className="eyebrow">
            {marketNames[market]} · {c.data.type}
          </p>
          <h1>{c.data.name}</h1>
          <p>{c.data.description}</p>
          <div className="hero-dates">
            <div>
              <small>BUY BETWEEN</small>
              <b>{period(c.data.purchaseStart, c.data.purchaseEnd)}</b>
            </div>
            <div>
              <small>CLAIM WINDOW</small>
              <b>{period(c.data.claimStart, c.data.claimEnd)}</b>
            </div>
          </div>
          <button
            className="button button-primary"
            disabled={busy || !accepting}
            onClick={onStart}
          >
            {accepting ? "Start your claim →" : "Claims currently unavailable"}
          </button>
          <p className="hero-caption">
            Wait {c.data.waitingDays} days after purchase · {c.data.timeZone} ·
            Version {c.publishedVersion}
          </p>
          <p className="hero-caption">
            Up to {money(ceiling(c), c.data.currency)} per eligible product.
            Your total depends on the products and campaign rules.
          </p>
        </div>
        <PromotionArt campaign={c} />
      </section>
      <nav className="detail-tabs" aria-label="Campaign details">
        {[
          ["products", "Eligible products"],
          ["retailers", "Retailers"],
          ["how", "How it works"],
          ["terms", "Terms & FAQs"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            className={section === id ? "active" : ""}
            onClick={() => {
              setSection(id);
              setSearch("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="promotion-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">PROMOTION DETAILS</p>
            <h2>
              {section === "products"
                ? "Choose your reward."
                : section === "retailers"
                  ? "Shop across borders."
                  : section === "how"
                    ? "From purchase to payout."
                    : "Clear rules. No surprises."}
            </h2>
          </div>
          {["products", "retailers"].includes(section) && (
            <label className="promotion-search">
              <span>
                {section === "products"
                  ? "Search products"
                  : "Search stores or countries"}
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  section === "products"
                    ? "Product, series or category"
                    : "Store or country"
                }
              />
            </label>
          )}
        </div>
        {section === "products" && (
          <>
            <div className="product-rewards">
              {products.map((p) => (
                <article key={p.id}>
                  <div className="product-symbol" aria-hidden="true">
                    {p.category === "Monitor"
                      ? "▣"
                      : p.category === "Motherboard"
                        ? "▦"
                        : "▰"}
                  </div>
                  <div>
                    <small>
                      {p.series} · {p.category}
                    </small>
                    <h3>{p.model}</h3>
                    <span className="muted">{p.id}</span>
                  </div>
                  <strong>{money(p.cashbackMinor, c.data.currency)}</strong>
                  <button
                    className="offer-link"
                    disabled={busy || !accepting}
                    onClick={onStart}
                  >
                    Claim →
                  </button>
                </article>
              ))}
            </div>
            {!products.length && <Empty>No products match your search.</Empty>}
            <p className="promotion-note">
              Maximum {c.data.maxItemsPerCategory} item(s) per category. All
              claimed products must be on the same invoice. Selecting Claim
              opens the application; choose your products in the purchase step.
            </p>
          </>
        )}
        {section === "retailers" && (
          <>
            <p className="cross-border-note">
              Your activity market is <b>{marketNames[market]}</b>. Your
              purchase country may differ. Select an eligible retailer by
              purchase country when applying.
            </p>
            <div className="retailer-display">
              {retailers.map((r) => (
                <article key={r.id}>
                  <span>{r.country}</span>
                  <div>
                    <h3>{r.name}</h3>
                    <p>{marketNames[r.country] ?? r.country}</p>
                    {(r.validFrom || r.validTo) && (
                      <small>
                        {r.validFrom?.slice(0, 10) ?? "No start limit"} —{" "}
                        {r.validTo?.slice(0, 10) ?? "No end limit"}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!retailers.length && <Empty>No stores match your search.</Empty>}
          </>
        )}
        {section === "how" && (
          <>
            <HowItWorks />
            <p className="cross-border-note">
              For this offer, wait {c.data.waitingDays} days after purchase and
              submit within the claim window. Review and payment timing follow
              the campaign terms.
            </p>
          </>
        )}
        {section === "terms" && (
          <div className="promotion-terms">
            <details open>
              <summary>Terms — {c.data.termsVersion}</summary>
              <p className="pre-wrap">
                {c.data.terms || "Terms have not been provided."}
              </p>
            </details>
            <details>
              <summary>Privacy notice</summary>
              <p className="pre-wrap">
                {c.data.privacy || "Privacy notice has not been provided."}
              </p>
            </details>
            <details>
              <summary>Frequently asked questions</summary>
              <p className="pre-wrap">
                {c.data.faq || "No FAQs have been provided."}
              </p>
            </details>
            {c.data.supportEmail && (
              <p>
                Need help?{" "}
                <a href={`mailto:${c.data.supportEmail}`}>
                  {c.data.supportEmail}
                </a>
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
