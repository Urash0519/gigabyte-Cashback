import { useLocale } from "./i18n";
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
  const { t } = useLocale();
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
          <small>{t("UP TO")}</small>
          <strong>{money(ceiling(campaign), campaign.data.currency)}</strong>
          <small>{t("PER PRODUCT")}</small>
        </div>
      )}
    </div>
  );
}

export function HowItWorks() {
  const { t } = useLocale();
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
          <h3>{t(title)}</h3>
          <p>{t(text)}</p>
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
  const { t } = useLocale();
  const list = campaigns.filter((c) => c.data.markets.includes(market));
  const featured = list.find(available) ?? list[0];
  return (
    <>
      <section className="promotion-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            {t("GIGABYTE REWARDS ·")}
            {t(marketNames[market] ?? market)}
          </p>
          <h1>
            {t("Build more.")}
            <br />
            <em>{t("Get more back.")}</em>
          </h1>
          <p>
            {t(
              "Your next upgrade, rewarded. Explore eligible products and bring them together in one cashback claim.",
            )}
          </p>
          <div className="actions">
            <a className="button button-primary" href="#cashback-offers">
              {t("Explore cashback ↗")}
            </a>
            <button className="button hero-secondary" onClick={onTrack}>
              {t("Track a claim")}
            </button>
          </div>
          <div className="hero-points">
            <span>
              <b>01</b> {t("Choose products")}
            </span>
            <span>
              <b>02</b> {t("One invoice")}
            </span>
            <span>
              <b>03</b> {t("Track every step")}
            </span>
          </div>
        </div>
        <PromotionArt campaign={featured} />
      </section>
      <div className="market-strip">
        <span>{t("FIVE MARKETS. ONE PROGRAMME.")}</span>
        {markets.map((m) => (
          <span key={m} className={m === market ? "selected" : ""}>
            <b>{m}</b> {t(marketNames[m])}
          </span>
        ))}
      </div>
      <section className="promotion-section" id="cashback-offers">
        <div className="section-title">
          <div>
            <p className="eyebrow">{t("CASHBACK OFFERS")}</p>
            <h2>{t("Your next upgrade starts here.")}</h2>
          </div>
          <p>
            {t("Explore promotions for {market}.", {
              market: t(marketNames[market]),
            })}
            <br />
            {t("Eligibility and rewards depend on each offer.")}
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
                    {available(c)
                      ? t("Open for claims")
                      : t("Not accepting claims")}
                  </Badge>
                </div>
                <h3>{c.data.name}</h3>
                <p>{c.data.description}</p>
                <p>
                  <strong>
                    {t("Up to {amount}", {
                      amount: money(ceiling(c), c.data.currency),
                    })}
                  </strong>{" "}
                  {t("per eligible product")}
                </p>
                <dl>
                  <div>
                    <dt>{t("Purchase period")}</dt>
                    <dd>{period(c.data.purchaseStart, c.data.purchaseEnd)}</dd>
                  </div>
                  <div>
                    <dt>{t("Claim period")}</dt>
                    <dd>{period(c.data.claimStart, c.data.claimEnd)}</dd>
                  </div>
                </dl>
                <button className="offer-link" onClick={() => onOpen(c)}>
                  {t("View offer")}
                  <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
        {!list.length && (
          <Empty>
            {t(
              "No published campaigns for this market. Choose another market or check back later.",
            )}
          </Empty>
        )}
      </section>
      <section className="benefit-strip" aria-label={t("Programme benefits")}>
        {[
          ["✓", "Same-invoice claims", "Keep eligible products together"],
          ["◎", "Cross-border purchases", "Check each offer’s eligible stores"],
          ["€", "Traceable decisions", "Follow review and payment separately"],
        ].map(([icon, title, text]) => (
          <div key={t(title)}>
            <span>{icon}</span>
            <p>
              <b>{t(title)}</b>
              <small>{t(text)}</small>
            </p>
          </div>
        ))}
      </section>
      <section className="promotion-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">{t("HOW IT WORKS")}</p>
            <h2>{t("From upgrade to cashback.")}</h2>
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
  const { t } = useLocale();
  const [section, setSection] = useState("products");
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const products = c.data.products.filter((p) =>
    `${p.model} ${p.id} ${p.category} ${p.series}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const retailers = c.data.retailers.filter((r) =>
    `${r.name} ${r.country} ${marketNames[r.country] ?? ""} ${t(marketNames[r.country] ?? "")}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const accepting = available(c);
  return (
    <>
      <section className="promotion-hero detail-hero">
        <div className="hero-copy">
          <button className="back-offers" onClick={onBack}>
            {t("← All offers")}
          </button>
          <p className="eyebrow">
            {t(marketNames[market])} · {c.data.type}
          </p>
          <h1>{c.data.name}</h1>
          <p>{c.data.description}</p>
          <div className="hero-dates">
            <div>
              <small>{t("BUY BETWEEN")}</small>
              <b>{period(c.data.purchaseStart, c.data.purchaseEnd)}</b>
            </div>
            <div>
              <small>{t("CLAIM WINDOW")}</small>
              <b>{period(c.data.claimStart, c.data.claimEnd)}</b>
            </div>
          </div>
          <button
            className="button button-primary"
            disabled={busy || !accepting}
            onClick={onStart}
          >
            {accepting
              ? t("Start your claim →")
              : t("Claims currently unavailable")}
          </button>
          <p className="hero-caption">
            {t("Wait {days} days after purchase · {timeZone}", {
              days: c.data.waitingDays,
              timeZone: c.data.timeZone,
            })}
          </p>
          <p className="hero-caption">
            {t(
              "Up to {amount} per eligible product. Your total depends on the products and campaign rules.",
              { amount: money(ceiling(c), c.data.currency) },
            )}
          </p>
        </div>
        <PromotionArt campaign={c} />
      </section>
      <nav className="detail-tabs" aria-label={t("Campaign details")}>
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
            {t(label)}
          </button>
        ))}
      </nav>
      <section className="promotion-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">{t("PROMOTION DETAILS")}</p>
            <h2>
              {section === "products"
                ? t("Choose your reward.")
                : section === "retailers"
                  ? t("Shop across borders.")
                  : section === "how"
                    ? t("From purchase to payout.")
                    : t("Clear rules. No surprises.")}
            </h2>
          </div>
          {["products", "retailers"].includes(section) && (
            <label className="promotion-search">
              <span>
                {section === "products"
                  ? t("Search products")
                  : t("Search stores or countries")}
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  section === "products"
                    ? t("Product, series or category")
                    : t("Store or country")
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
                    {t("Claim →")}
                  </button>
                </article>
              ))}
            </div>
            {!products.length && (
              <Empty>{t("No products match your search.")}</Empty>
            )}
            <p className="promotion-note">
              {t(
                "Maximum {count} item(s) per category. All claimed products must be on the same invoice. Selecting Claim opens the application; choose your products in the purchase step.",
                { count: c.data.maxItemsPerCategory },
              )}
            </p>
          </>
        )}
        {section === "retailers" && (
          <>
            <p className="cross-border-note">
              {t(
                "Your activity market is {market}. Your purchase country may differ. Select an eligible retailer by purchase country when applying.",
                { market: t(marketNames[market]) },
              )}
            </p>
            <div className="retailer-display">
              {retailers.map((r) => (
                <article key={r.id}>
                  <span>{r.country}</span>
                  <div>
                    <h3>{r.name}</h3>
                    <p>{t(marketNames[r.country] ?? r.country)}</p>
                    {(r.validFrom || r.validTo) && (
                      <small>
                        {r.validFrom?.slice(0, 10) ?? t("No start limit")} —{" "}
                        {r.validTo?.slice(0, 10) ?? t("No end limit")}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!retailers.length && (
              <Empty>{t("No stores match your search.")}</Empty>
            )}
          </>
        )}
        {section === "how" && (
          <>
            <HowItWorks />
            <p className="cross-border-note">
              {t(
                "For this offer, wait {days} days after purchase and submit within the claim window. Review and payment timing follow the campaign terms.",
                { days: c.data.waitingDays },
              )}
            </p>
          </>
        )}
        {section === "terms" && (
          <div className="promotion-terms">
            <details open>
              <summary>
                {t("Terms — {version}", { version: c.data.termsVersion })}
              </summary>
              <p className="pre-wrap">
                {c.data.terms || t("Terms have not been provided.")}
              </p>
            </details>
            <details>
              <summary>{t("Privacy notice")}</summary>
              <p className="pre-wrap">
                {c.data.privacy || t("Privacy notice has not been provided.")}
              </p>
            </details>
            <details>
              <summary>{t("Frequently asked questions")}</summary>
              <p className="pre-wrap">
                {c.data.faq || t("No FAQs have been provided.")}
              </p>
            </details>
            {c.data.supportEmail && (
              <p>
                {t("Need help?")}{" "}
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
