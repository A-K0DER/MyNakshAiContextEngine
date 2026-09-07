import { FetchedContext } from "../types";

// One small resolver per context field. Each knows how to pull its value out
// of whatever the fetch orchestrator returned — and returns undefined if the
// backing service failed or the field isn't available, letting the engine
// treat it as "unresolved" without any special-casing per intent.
export type ContextResolver = (ctx: FetchedContext) => string | undefined;

export const CONTEXT_RESOLVERS: Record<string, ContextResolver> = {
  "Career Horoscope": (ctx) => ctx.horoscope.data?.career,
  "Finance Horoscope": (ctx) => ctx.horoscope.data?.finance,
  "Health Horoscope": (ctx) => ctx.horoscope.data?.health,
  "Relationship Horoscope": (ctx) => ctx.horoscope.data?.relationship,

  "Current Dasha": (ctx) => {
    const dasha = ctx.kundli.data?.currentDasha;
    return dasha ? `${dasha.mahadasha} Mahadasha / ${dasha.antardasha} Antardasha` : undefined;
  },
  Lagna: (ctx) => ctx.kundli.data?.lagna,
  "Moon Sign": (ctx) => ctx.kundli.data?.moonSign,
  "6th House": (ctx) => {
    const house = ctx.kundli.data?.houses[6];
    return house ? `Lord ${house.lord}, ${house.strength}` : undefined;
  },
  "7th House": (ctx) => {
    const house = ctx.kundli.data?.houses[7];
    return house ? `Lord ${house.lord}, ${house.strength}` : undefined;
  },
  "10th House": (ctx) => {
    const house = ctx.kundli.data?.houses[10];
    return house ? `Lord ${house.lord}, ${house.strength}` : undefined;
  },

  "Today's Panchang": (ctx) => {
    const p = ctx.panchang.data;
    return p ? `${p.tithi} tithi, ${p.nakshatra} nakshatra, ${p.yoga} yoga` : undefined;
  },

  "Birth Details": (ctx) => {
    const b = ctx.user.data?.birthDetails;
    return b ? `${b.date} ${b.time}, ${b.place}` : undefined;
  },
};
