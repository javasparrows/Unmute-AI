import Link from "next/link";
import {
  ArrowRight,
  Languages,
  BookOpen,
  Layers,
  GitBranch,
  DollarSign,
  FileCheck,
  PenLine,
  LayoutTemplate,
  Sparkles,
  Shield,
  Brain,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const steps = [
  {
    icon: PenLine,
    number: "01",
    title: "Draft Freely",
    description:
      "Write your paper in any language you think in. No mental translation required.",
  },
  {
    icon: LayoutTemplate,
    number: "02",
    title: "Structure Instantly",
    description:
      "AI translates and adapts to your target journal's style in real time, sentence by sentence.",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "Refine & Submit",
    description:
      "Edit in either language. Polish your manuscript and submit with confidence.",
  },
];

const coreValues = [
  {
    icon: Brain,
    title: "Academic Precision",
    description:
      "Trained on academic conventions. Understands IMRAD structure, LaTeX markup, and journal-specific styling.",
  },
  {
    icon: Zap,
    title: "Zero Cognitive Load",
    description:
      "Think in your language, publish in any. No more context-switching between writing and translating.",
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    description:
      "Your research stays yours. Transparent API usage, no data retention, full cost visibility.",
  },
];

const features = [
  {
    icon: Languages,
    title: "Real-time Bidirectional Translation",
    description:
      "Edit source and translation side by side. Changes sync instantly with sentence-level precision.",
  },
  {
    icon: BookOpen,
    title: "Journal-Specific Styling",
    description:
      "Choose from 8 academic journal styles. Your translation matches the target publication's conventions.",
  },
  {
    icon: Layers,
    title: "LaTeX-Aware Translation",
    description:
      "Preserves \\cite{}, \\ref{}, equations, and all LaTeX commands intact. Your markup stays untouched.",
  },
  {
    icon: FileCheck,
    title: "AI Paper Structure Check",
    description:
      "Automatic IMRAD structure validation. Catch missing sections before submission.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description:
      "Save and restore versions of your translation. Never lose progress on a revision.",
  },
  {
    icon: DollarSign,
    title: "Transparent Cost Tracking",
    description:
      "See exactly what each translation costs in real time. No surprise bills.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-secondary py-28 sm:py-36">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-secondary-foreground">
            Focus on the research.
            <br />
            <span className="text-primary">We handle the language.</span>
          </h1>
          <p className="mt-6 text-lg text-secondary-foreground/70 max-w-2xl mx-auto leading-relaxed">
            AI-powered academic translation that understands journal styles,
            paper structure, and your intent. Write in your language, publish in
            any.
          </p>
          <div className="mt-10">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Start Writing for Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t let the language barrier
            <br />
            slow your intellect.
          </h2>
          <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Non-native English speakers face systemic barriers in academic
            publishing. Up to 40% of research time is spent wrestling with
            language instead of advancing science.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl text-secondary-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-secondary-foreground/70 text-lg">
              From draft to submission in three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-mono text-primary mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-secondary-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-secondary-foreground/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Built for researchers, by researchers.
            </h2>
          </div>

          {/* Core values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-2xl bg-accent/50"
              >
                <value.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 shadow-none bg-card"
              >
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-secondary py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight text-secondary-foreground">
            Evaluated by merit,
            <br />
            not by fluency.
          </h2>
          <p className="mt-6 text-secondary-foreground/70 text-lg max-w-xl mx-auto">
            Great research happens everywhere. We believe the world&apos;s best
            ideas deserve an equal voice, regardless of the language they were
            born in.
          </p>
          <div className="mt-10">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Try Unmute AI Today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-serif font-bold text-foreground">Unmute AI</div>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/tokushoho"
              className="hover:text-foreground transition-colors"
            >
              特商法表記
            </Link>
          </div>
          <div>&copy; {new Date().getFullYear()} Unmute AI</div>
        </div>
      </footer>
    </div>
  );
}
