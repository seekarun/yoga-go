import {
  Header,
  Hero,
  Features,
  HowItWorks,
  Pricing,
  CTA,
  Footer,
} from "@/components";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
