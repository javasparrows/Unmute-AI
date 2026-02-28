import Link from "next/link";
import {
  ArrowRight,
  Languages,
  BookOpen,
  Layers,
  GitBranch,
  DollarSign,
  FileCheck,
  Clock,
  XCircle,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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

const problems = [
  {
    icon: Clock,
    stat: "40%",
    label: "of research time",
    description: "spent on language, not science",
  },
  {
    icon: XCircle,
    stat: "1 in 4",
    label: "papers rejected",
    description: "due to language quality issues",
  },
  {
    icon: Wallet,
    stat: "$1,200+",
    label: "per paper",
    description: "for professional translation services",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-secondary py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your research deserves
            <br />
            to be heard.
          </h1>
          <p className="mt-6 text-lg text-secondary-foreground/70 max-w-2xl mx-auto leading-relaxed">
            AI-powered academic translation that understands journal styles,
            paper structure, and your intent. Write in your language, publish in
            any.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Get Started — Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Publishing in English shouldn&apos;t be
              <br />
              the hardest part of your research.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Non-native English speakers face systemic barriers in academic
              publishing. The cost is measured in time, money, and lost
              discoveries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {problems.map((problem) => (
              <div key={problem.stat} className="text-center">
                <problem.icon className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <div className="text-4xl font-bold">{problem.stat}</div>
                <div className="text-sm font-medium mt-1">{problem.label}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {problem.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-secondary py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Not a grammar checker.
            <br />
            Your academic translation partner.
          </h2>
          <p className="mt-6 text-secondary-foreground/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Lexora doesn&apos;t just translate words. It understands the
            structure of academic writing, adapts to journal-specific
            conventions, and preserves your research intent across languages.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div>
              <div className="text-2xl font-bold">Contextual</div>
              <p className="mt-2 text-sm text-secondary-foreground/70">
                Powered by Gemini 2.5 Flash, understanding academic context
                and preserving LaTeX markup, not just vocabulary.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">Bidirectional</div>
              <p className="mt-2 text-sm text-secondary-foreground/70">
                Edit in either language. Changes propagate sentence-by-sentence
                in real time.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">Transparent</div>
              <p className="mt-2 text-sm text-secondary-foreground/70">
                Every API call tracked. See costs before they happen. No
                lock-in, no surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to publish globally
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Purpose-built for researchers, by researchers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-none bg-card">
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

      {/* Social Mission */}
      <section className="bg-secondary py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            Language should never
            <br />
            limit science.
          </h2>
          <p className="mt-6 text-secondary-foreground/70 text-lg max-w-xl mx-auto">
            Great research happens everywhere. We believe the world&apos;s best
            ideas deserve an equal voice, regardless of the language they were
            born in.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Start writing for the world.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Free to start. No credit card required.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Get Started — Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-serif font-bold text-foreground">Lexora</div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <span>Terms</span>
            <span>Privacy</span>
          </div>
          <div>&copy; {new Date().getFullYear()} Lexora</div>
        </div>
      </footer>
    </div>
  );
}
