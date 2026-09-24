type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    pulse: number;
};

type MouseState = {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
};

let cleanupEffects: (() => void) | null = null;

export function initCyberEffects() {
    if (cleanupEffects) {
        cleanupEffects();
        cleanupEffects = null;
    }

    /* =====================================================
       CANVAS
       ===================================================== */

    const canvas =
        document.createElement('canvas');        canvas.className =
            'cyber-particle-canvas'; // soft ambient dots tuned for the light theme

    canvas.setAttribute(
        'aria-hidden',
        'true'
    );

    document.body.prepend(canvas);

    const context =
        canvas.getContext('2d');

    if (!context) {
        canvas.remove();
        return;
    }

    /*
     * After the null check, use ctx.
     * This keeps TypeScript completely safe.
     */
    const ctx: CanvasRenderingContext2D =
        context;

    let width =
        window.innerWidth;

    let height =
        window.innerHeight;

    const mouse: MouseState = {
        x: width / 2,
        y: height / 2,
        targetX: width / 2,
        targetY: height / 2,
    };

    const particles: Particle[] = [];

    /* =====================================================
       PARTICLE COUNT
       ===================================================== */

    function getParticleCount() {
        /* Fewer particles: the O(n²) connection pass dominates the frame cost. */
        const isSmallScreen = width < 768;
        if (isSmallScreen) return 0;

        return Math.min(
            42,
            Math.max(
                18,
                Math.floor(
                    (width * height) /
                    55000
                )
            )
        );
    }

    /* =====================================================
       RESIZE
       ===================================================== */

    function resizeCanvas() {
        width =
            window.innerWidth;

        height =
            window.innerHeight;

        const ratio =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );

        canvas.width =
            width * ratio;

        canvas.height =
            height * ratio;

        canvas.style.width =
            `${width}px`;

        canvas.style.height =
            `${height}px`;

        ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );
    }

    /* =====================================================
       CREATE PARTICLE
       ===================================================== */

    function createParticle(): Particle {
        return {
            x:
                Math.random() *
                width,

            y:
                Math.random() *
                height,

            vx:
                (Math.random() - 0.5) *
                0.18,

            vy:
                (Math.random() - 0.5) *
                0.18,

            size:
                Math.random() *
                1.8 +
                0.4,

            alpha:
                Math.random() *
                0.55 +
                0.15,

            pulse:
                Math.random() *
                Math.PI *
                2,
        };
    }

    /* =====================================================
       CREATE PARTICLES
       ===================================================== */

    function createParticles() {
        particles.length = 0;

        const particleCount =
            getParticleCount();

        for (
            let i = 0;
            i < particleCount;
            i++
        ) {
            particles.push(
                createParticle()
            );
        }
    }

    /* =====================================================
       DRAW PARTICLE
       ===================================================== */

    function drawParticle(
        particle: Particle,
        time: number
    ) {
        const pulse =
            Math.sin(
                time * 0.001 +
                particle.pulse
            ) * 0.25;

        const alpha =
            Math.max(
                0.05,
                particle.alpha +
                pulse
            );

        const gradient =
            ctx.createRadialGradient(
                particle.x,
                particle.y,
                0,
                particle.x,
                particle.y,
                particle.size * 8
            );

        gradient.addColorStop(
            0,
            `rgba(46, 110, 242, ${alpha * 0.6})`
        );

        gradient.addColorStop(
            0.35,
            `rgba(16, 185, 129, ${alpha * 0.35
            })`
        );

        gradient.addColorStop(
            1,
            'rgba(46, 110, 242, 0)'
        );

        /* Glow */

        ctx.beginPath();

        ctx.fillStyle =
            gradient;

        ctx.arc(
            particle.x,
            particle.y,
            particle.size * 8,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /* Core */

        ctx.beginPath();

        ctx.fillStyle =
            `rgba(30, 79, 214, ${alpha * 0.45})`;

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    /* =====================================================
       DRAW CONNECTIONS
       ===================================================== */

    function drawConnections() {
        const maxDistance = 110;

        for (
            let i = 0;
            i < particles.length;
            i++
        ) {
            const a =
                particles[i];

            for (
                let j = i + 1;
                j < particles.length;
                j++
            ) {
                const b =
                    particles[j];

                const dx =
                    a.x - b.x;

                const dy =
                    a.y - b.y;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                if (
                    distance >
                    maxDistance
                ) {
                    continue;
                }

                const opacity =
                    (1 -
                        distance /
                        maxDistance) *
                    0.13;

                ctx.beginPath();

                ctx.strokeStyle =
                    `rgba(46,110,242,${opacity * 0.35})`;

                ctx.lineWidth = 0.5;

                ctx.moveTo(
                    a.x,
                    a.y
                );

                ctx.lineTo(
                    b.x,
                    b.y
                );

                ctx.stroke();
            }
        }
    }

    /* =====================================================
       UPDATE PARTICLE
       ===================================================== */

    function updateParticle(
        particle: Particle
    ) {
        const dx =
            mouse.x -
            particle.x;

        const dy =
            mouse.y -
            particle.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        const interactionRadius =
            180;

        if (
            distance <
            interactionRadius
        ) {
            const force =
                (1 -
                    distance /
                    interactionRadius) *
                0.018;

            particle.vx -=
                dx * force;

            particle.vy -=
                dy * force;
        }

        particle.vx *= 0.995;

        particle.vy *= 0.995;

        particle.x +=
            particle.vx;

        particle.y +=
            particle.vy;

        /* Horizontal wrap */

        if (particle.x < -20) {
            particle.x =
                width + 20;
        }

        if (
            particle.x >
            width + 20
        ) {
            particle.x = -20;
        }

        /* Vertical wrap */

        if (particle.y < -20) {
            particle.y =
                height + 20;
        }

        if (
            particle.y >
            height + 20
        ) {
            particle.y = -20;
        }
    }

    /* =====================================================
       ANIMATION
       ===================================================== */

    let animationFrame = 0;

    /* Throttle to ~30fps: the ambient field does not need 60fps and this
       halves the canvas work per second. */
    let lastFrameTime = 0;
    const FRAME_INTERVAL = 1000 / 30;

    function animate(
        time: number
    ) {
        animationFrame =
            requestAnimationFrame(
                animate
            );

        if (
            time - lastFrameTime <
            FRAME_INTERVAL
        ) {
            return;
        }

        lastFrameTime = time;

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        /* Smooth mouse */

        mouse.x +=
            (mouse.targetX -
                mouse.x) *
            0.06;

        mouse.y +=
            (mouse.targetY -
                mouse.y) *
            0.06;

        /* Update + draw particles */

        for (
            const particle of particles
        ) {
            updateParticle(
                particle
            );

            drawParticle(
                particle,
                time
            );
        }

        /* Connections */

        drawConnections();
    }

    /* =====================================================
       POINTER MOVE
       ===================================================== */

    function handlePointerMove(
        event: PointerEvent
    ) {
        mouse.targetX =
            event.clientX;

        mouse.targetY =
            event.clientY;

        /*
         * These variables are used
         * directly by styles.css.
         */

        document.documentElement.style.setProperty(
            '--mx',
            `${event.clientX}px`
        );

        document.documentElement.style.setProperty(
            '--my',
            `${event.clientY}px`
        );
    }

    /* =====================================================
       RESIZE HANDLER
       ===================================================== */

    function handleResize() {
        resizeCanvas();

        createParticles();
    }

    /* =====================================================
       SCROLL REVEAL
       ===================================================== */

    const revealObserver =
        new IntersectionObserver(
            (entries) => {
                for (
                    const entry of entries
                ) {
                    if (
                        entry.isIntersecting
                    ) {
                        entry.target.classList.add(
                            'is-visible'
                        );

                        revealObserver.unobserve(
                            entry.target
                        );
                    }
                }
            },
            {
                threshold: 0.12,

                rootMargin:
                    '0px 0px -60px 0px',
            }
        );

    function observeRevealElements() {
        const elements =
            document.querySelectorAll(
                '[data-reveal]'
            );

        elements.forEach(
            (element) => {
                if (
                    element.classList.contains(
                        'is-visible'
                    )
                ) {
                    return;
                }

                revealObserver.observe(
                    element
                );
            }
        );
    }

    /*
     * Initial elements
     */

    observeRevealElements();

    /* =====================================================
       MUTATION OBSERVER
       ===================================================== */

    const mutationObserver =
        new MutationObserver(() => {
            observeRevealElements();
        });

    mutationObserver.observe(
        document.body,
        {
            childList: true,
            subtree: true,
        }
    );

    /* =====================================================
       INITIALIZE
       ===================================================== */

    resizeCanvas();

    createParticles();

    window.addEventListener(
        'resize',
        handleResize
    );

    window.addEventListener(
        'pointermove',
        handlePointerMove,
        {
            passive: true,
        }
    );

    animationFrame =
        requestAnimationFrame(
            animate
        );

    /* =====================================================
       CLEANUP
       ===================================================== */

    cleanupEffects = () => {
        cancelAnimationFrame(
            animationFrame
        );

        window.removeEventListener(
            'resize',
            handleResize
        );

        window.removeEventListener(
            'pointermove',
            handlePointerMove
        );

        revealObserver.disconnect();

        mutationObserver.disconnect();

        canvas.remove();

        document.documentElement.style.removeProperty(
            '--mx'
        );

        document.documentElement.style.removeProperty(
            '--my'
        );
    };

    return cleanupEffects;
}