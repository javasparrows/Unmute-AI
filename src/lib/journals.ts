import type { Journal } from "@/types";

export const journals: Journal[] = [
  {
    id: "general",
    name: "General Academic",
    description: "Standard academic English",
    styleGuide:
      "Use formal academic English with clear, concise sentences. Follow standard scientific writing conventions.",
  },
  {
    id: "nature",
    name: "Nature",
    description: "Nature journal style",
    styleGuide:
      "Write in active voice where possible. Use concise, accessible language. Avoid jargon. Nature prefers short sentences and paragraphs. Lead with the main finding.",
  },
  {
    id: "science",
    name: "Science",
    description: "Science journal style",
    styleGuide:
      "Use clear, direct language accessible to a broad scientific audience. Prefer active voice. Keep technical terms to a minimum and define them when first used.",
  },
  {
    id: "pnas",
    name: "PNAS",
    description: "Proceedings of the National Academy of Sciences",
    styleGuide:
      "Use formal but accessible academic language. Balance technical precision with readability. PNAS encourages significance statements that convey broader impact.",
  },
  {
    id: "prl",
    name: "Physical Review Letters",
    description: "PRL style for physics",
    styleGuide:
      "Use precise, technical language appropriate for physics. Be concise — PRL has strict length limits. Use standard physics notation and terminology.",
  },
  {
    id: "lancet",
    name: "The Lancet",
    description: "The Lancet medical journal",
    styleGuide:
      "Use clear medical English. Follow CONSORT/STROBE guidelines as appropriate. Emphasize clinical significance. Use SI units.",
  },
  {
    id: "ieee",
    name: "IEEE",
    description: "IEEE Transactions style",
    styleGuide:
      "Use formal technical English. Follow IEEE editorial style. Use passive voice for methodology sections. Be precise with technical specifications.",
  },
  {
    id: "npj",
    name: "npj Digital Medicine",
    description: "Nature Portfolio - npj Digital Medicine",
    styleGuide:
      "Write in clear, accessible language bridging digital technology and medicine. Use active voice. Emphasize translational impact and clinical relevance.",
  },
];

export function getJournal(id: string): Journal {
  return journals.find((j) => j.id === id) ?? journals[0];
}
