import {
    useState,
    type CSSProperties,
    type MouseEvent,
} from 'react';

type HeroStyle = CSSProperties & {
    '--rotate-x'?: string;
    '--rotate-y'?: string;
};

export default function Home() {
    const [heroStyle, setHeroStyle] =
        useState<HeroStyle>({
            '--rotate-x': '0deg',
            '--rotate-y': '0deg',
        });

    function handleMouseMove(
        event: MouseEvent<HTMLElement>
    ) {
        const rect =
            event.currentTarget.getBoundingClientRect();

        const x =
            ((event.clientX - rect.left) /
                rect.width -
                0.5) *
            2;

        const y =
            ((event.clientY - rect.top) /
                rect.height -
                0.5) *
            2;

        setHeroStyle({
            '--rotate-x': `${-y * 7}deg`,
            '--rotate-y': `${x * 9}deg`,
        });
    }

    function handleMouseLeave() {
        setHeroStyle({
            '--rotate-x': '0deg',
            '--rotate-y': '0deg',
        });
    }

    return (
        <main className="home-page">

            {/* ================= HERO ================= */}

            <section
                className="home-hero"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >

                <div className="hero-decor" aria-hidden="true">
                    <div className="hero-orb hero-orb-one" />

                    <div className="hero-orb hero-orb-two" />

                    <div className="hero-grid" />
                </div>

                <div className="hero-scanline" />

                {/* HERO CONTENT */}

                <div
                    className="home-hero-content"
                    data-reveal
                >
                    <p className="eyebrow">
                        <span className="eyebrow-dot" />

                        NEXT GENERATION
                        <span className="eyebrow-divider">
                            /
                        </span>
                        CAREER PLATFORM
                    </p>

                    <h1>
                        Build your{" "}
                        <span className="gradient-text">
                            future.
                        </span>
                        <br />

                        Find your{" "}
                        <span className="pink-text">
                            opportunity.
                        </span>
                    </h1>

                    <p className="hero-description">
                        Discover opportunities, connect
                        with companies, and build a
                        professional career profile
                        designed for the future.
                    </p>

                    <div className="hero-actions">

                        <a
                            href="/jobs"
                            className="primary-button"
                        >
                            <span>
                                Explore Jobs
                            </span>

                            <span className="button-arrow">
                                →
                            </span>
                        </a>

                        <a
                            href="/register"
                            className="secondary-button"
                        >
                            <span>
                                Create Account
                            </span>

                            <span className="button-arrow">
                                ↗
                            </span>
                        </a>

                    </div>

                    <div className="hero-stats">

                        <div>
                            <strong>
                                01
                            </strong>

                            <span>
                                Discover
                            </span>
                        </div>

                        <div>
                            <strong>
                                02
                            </strong>

                            <span>
                                Connect
                            </span>
                        </div>

                        <div>
                            <strong>
                                03
                            </strong>

                            <span>
                                Grow
                            </span>
                        </div>

                    </div>

                </div>

                {/* ================= FUTURISTIC VISUAL ================= */}

                <div
                    className="hero-visual"
                    style={{
                        transform: `
                            rotateX(${heroStyle['--rotate-x']})
                            rotateY(${heroStyle['--rotate-y']})
                        `,
                    }}
                >

                    <div className="hero-ring ring-one" />

                    <div className="hero-ring ring-two" />

                    <div className="hero-ring ring-three" />

                    <div className="hero-ring ring-four" />

                    {/* CHARACTER */}

                    <div
                        className="cyber-character"
                        data-reveal
                    >

                        <div className="character-aura" />

                        <div className="character-head">

                            <div className="character-hair" />

                            <div className="character-face">

                                <div className="character-eye eye-left" />

                                <div className="character-eye eye-right" />

                                <div className="character-mouth" />

                            </div>

                        </div>

                        <div className="character-neck" />

                        <div className="character-body">

                            <div className="character-chest">

                                <div className="character-core">
                                    CH
                                </div>

                            </div>

                            <div className="character-line line-one" />

                            <div className="character-line line-two" />

                        </div>

                        <div className="character-arm arm-left" />

                        <div className="character-arm arm-right" />

                        <div className="character-hand hand-left" />

                        <div className="character-hand hand-right" />

                    </div>

                    {/* CENTER CORE */}

                    <div className="hero-core">

                        <div className="core-inner">

                            <span>
                                CH
                            </span>

                        </div>

                    </div>

                    {/* FLOATING CARD 1 */}

                    <div
                        className="floating-card floating-card-one"
                        data-reveal
                    >

                        <span className="floating-icon">
                            ✓
                        </span>

                        <div>
                            <strong>
                                New Opportunity
                            </strong>

                            <small>
                                Frontend Developer
                            </small>
                        </div>

                    </div>

                    {/* FLOATING CARD 2 */}

                    <div
                        className="floating-card floating-card-two"
                        data-reveal
                    >

                        <span className="floating-icon">
                            ↗
                        </span>

                        <div>
                            <strong>
                                Career Growth
                            </strong>

                            <small>
                                Keep moving forward
                            </small>
                        </div>

                    </div>

                    {/* FLOATING CARD 3 */}

                    <div
                        className="floating-card floating-card-three"
                        data-reveal
                    >

                        <span className="floating-icon">
                            ◈
                        </span>

                        <div>
                            <strong>
                                Profile Active
                            </strong>

                            <small>
                                Your profile is visible
                            </small>
                        </div>

                    </div>

                    {/* FLOATING DOTS */}

                    <div className="floating-dot dot-one" />

                    <div className="floating-dot dot-two" />

                    <div className="floating-dot dot-three" />

                    <div className="floating-dot dot-four" />

                    <div className="floating-dot dot-five" />

                </div>

                <div className="hero-bottom-glow" />

            </section>

            {/* ================= FEATURES ================= */}

            <section className="home-features">

                <div
                    className="features-heading"
                    data-reveal
                >

                    <p className="eyebrow">
                        <span className="eyebrow-dot" />
                        WHY CAREERHUB
                    </p>

                    <h2>
                        Everything you need
                        <br />

                        to move{" "}
                        <span className="gradient-text">
                            forward.
                        </span>
                    </h2>

                    <p>
                        One futuristic platform for
                        discovering opportunities,
                        building your professional
                        identity, and connecting with
                        companies.
                    </p>

                </div>

                <div className="features-grid">

                    {/* FEATURE 01 */}

                    <article
                        className="feature-card"
                        data-reveal
                    >

                        <div className="feature-top">

                            <span className="feature-number">
                                01
                            </span>

                            <span className="feature-icon">
                                ↗
                            </span>

                        </div>

                        <div className="feature-line" />

                        <h3>
                            Find Opportunities
                        </h3>

                        <p>
                            Explore jobs that match
                            your skills, experience,
                            and career goals.
                        </p>

                        <a
                            href="/jobs"
                            className="feature-link"
                        >
                            Explore jobs
                            <span>
                                →
                            </span>
                        </a>

                    </article>

                    {/* FEATURE 02 */}

                    <article
                        className="feature-card"
                        data-reveal
                    >

                        <div className="feature-top">

                            <span className="feature-number">
                                02
                            </span>

                            <span className="feature-icon">
                                ◈
                            </span>

                        </div>

                        <div className="feature-line" />

                        <h3>
                            Build Your Profile
                        </h3>

                        <p>
                            Create a professional
                            profile and showcase
                            your skills and experience.
                        </p>

                        <a
                            href="/profile"
                            className="feature-link"
                        >
                            Build profile
                            <span>
                                →
                            </span>
                        </a>

                    </article>

                    {/* FEATURE 03 */}

                    <article
                        className="feature-card"
                        data-reveal
                    >

                        <div className="feature-top">

                            <span className="feature-number">
                                03
                            </span>

                            <span className="feature-icon">
                                ◎
                            </span>

                        </div>

                        <div className="feature-line" />

                        <h3>
                            Connect With Companies
                        </h3>

                        <p>
                            Apply for jobs and
                            communicate with hiring
                            teams.
                        </p>

                        <a
                            href="/jobs"
                            className="feature-link"
                        >
                            Start connecting
                            <span>
                                →
                            </span>
                        </a>

                    </article>

                </div>

            </section>

            {/* ================= FINAL CTA ================= */}

            <section
                className="home-cta"
                data-reveal
            >

                <div className="cta-grid" />

                <div className="cta-content">

                    <p className="eyebrow">
                        <span className="eyebrow-dot" />
                        YOUR NEXT MOVE
                    </p>

                    <h2>
                        Your career{" "}
                        <span className="gradient-text">
                            starts here.
                        </span>
                    </h2>

                    <p>
                        Create your profile, discover
                        opportunities, and take the next
                        step toward your future.
                    </p>

                    <div className="hero-actions">

                        <a
                            href="/register"
                            className="primary-button"
                        >
                            Get Started
                            <span>
                                →
                            </span>
                        </a>

                        <a
                            href="/jobs"
                            className="secondary-button"
                        >
                            Browse Jobs
                            <span>
                                ↗
                            </span>
                        </a>

                    </div>

                </div>

            </section>

        </main>
    );
}