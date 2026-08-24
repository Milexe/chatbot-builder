export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceMonthly: number;
  description: string;
  features: string[];
  limits: {
    bots: number;
    messagesPerMonth: number;
    documents: number;
    maxFileMb: number;
    removeBranding: boolean;
    customColors: boolean;
  };
  highlighted?: boolean;
  cta: string;
};

/** Product pricing + gates — enforced in app, mirrored on landing. */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceMonthly: 0,
    description: "Try the product with one bot and a light message cap.",
    features: [
      "1 chatbot",
      "50 messages / month",
      "Up to 3 documents (5 MB each)",
      "In-app chat",
      "Embed widget with Chatbot Builder branding",
    ],
    limits: {
      bots: 1,
      messagesPerMonth: 50,
      documents: 3,
      maxFileMb: 5,
      removeBranding: false,
      customColors: false,
    },
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$29",
    priceMonthly: 29,
    description: "For service businesses that put the widget on a real site.",
    features: [
      "3 chatbots",
      "2,000 messages / month",
      "Up to 30 documents",
      "Remove branding",
      "Custom widget colors",
      "Answer citations from your docs",
    ],
    limits: {
      bots: 3,
      messagesPerMonth: 2000,
      documents: 30,
      maxFileMb: 5,
      removeBranding: true,
      customColors: true,
    },
    highlighted: true,
    cta: "Upgrade to Pro",
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "$79",
    priceMonthly: 79,
    description: "Higher limits for teams with more traffic and more bots.",
    features: [
      "10 chatbots",
      "10,000 messages / month",
      "Up to 100 documents",
      "Everything in Pro",
      "Allowed embed domains",
      "Priority-friendly quotas",
    ],
    limits: {
      bots: 10,
      messagesPerMonth: 10000,
      documents: 100,
      maxFileMb: 5,
      removeBranding: true,
      customColors: true,
    },
    cta: "Upgrade to Business",
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}
