import About from "./components/About";
import Booking from "./components/Booking";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ReviewsCarousel from "./components/ReviewsCarousel";
import SchedulingForm from "./components/SchedulingForm";
import Services from "./components/Services";

export default function Home() {
  return (
    <div className="site-shell">
      <Header />

      <main>
        <Hero />
        <About />
        <Services />
        <Booking />
        {/* <ReviewsCarousel /> */}
        <SchedulingForm />
      </main>

      <Footer />
    </div>
  );
}
