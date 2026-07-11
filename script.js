/* JavaScript Controls and Interactive Logic */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const giftBox = document.getElementById('birthday-gift-box');
    const surpriseScreen = document.getElementById('surprise-screen');
    const mainScreen = document.getElementById('main-screen');
    const audioControl = document.getElementById('audio-control');
    const loveEnvelope = document.getElementById('love-envelope');
    const loveLetter = document.getElementById('love-letter');
    const envelopeWaxSeal = document.getElementById('envelope-wax-seal');
    const letterBackdrop = document.getElementById('letter-backdrop');
    const letterCloseBtn = document.getElementById('letter-close-btn');
    const letterOriginalParent = loveLetter ? loveLetter.parentElement : null;

    // Lightbox elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const modalClose = document.querySelector('.modal-close');
    const polaroids = document.querySelectorAll('.polaroid-card');

    // --- Bouquet Photo Carousel -------------------------------------------------
    // The stems/ribbon/bouquet shape never move. Only the 10 photos rotate
    // through those same fixed fan "seats" when the user drags/swipes — like a
    // deck of cards being fanned, looping endlessly in both directions.
    const bouquetWrap = document.getElementById('photo-bouquet');
    const bouquetSlots = Array.from(document.querySelectorAll('.polaroid-card'));
    const totalPhotoSlots = bouquetSlots.length;

    // Snapshot each slot's original photo/caption/data as the base "deck".
    const photoDeck = bouquetSlots.map(slot => {
        const imgEl = slot.querySelector('img');
        const captionEl = slot.querySelector('.photo-caption');
        return {
            src: imgEl.getAttribute('src'),
            alt: imgEl.getAttribute('alt'),
            caption: captionEl.textContent,
            dataCaption: slot.getAttribute('data-caption'),
            dataIndex: slot.getAttribute('data-index')
        };
    });

    let bouquetRotation = 0; // how many steps the deck has rotated through the seats

    function paintBouquetSlots(pulse) {
        bouquetSlots.forEach((slot, seatIndex) => {
            const photo = photoDeck[(seatIndex + bouquetRotation + totalPhotoSlots * 1000) % totalPhotoSlots];
            const imgEl = slot.querySelector('img');
            const captionEl = slot.querySelector('.photo-caption');

            imgEl.src = photo.src;
            imgEl.alt = photo.alt;
            captionEl.textContent = photo.caption;
            slot.setAttribute('data-caption', photo.dataCaption);
            slot.setAttribute('data-index', photo.dataIndex);

            if (pulse) {
                slot.classList.remove('slot-pulse');
                // Force reflow so the animation can retrigger on repeated shifts
                void slot.offsetWidth;
                slot.classList.add('slot-pulse');
            }
        });
    }

    // How many pixels of drag are needed to rotate by one seat — tuned down
    // a bit on smaller screens where the fan itself is smaller.
    function getBouquetStepPx() {
        const w = window.innerWidth;
        if (w <= 480) return 42;
        if (w <= 900) return 54;
        return 68;
    }

    let bouquetDragging = false;
    let bouquetDragMoved = false;
    let bouquetDragStartX = 0;
    let bouquetDragBaseline = 0;

    function bouquetDragStart(e) {
        bouquetDragging = true;
        bouquetDragMoved = false;
        bouquetDragBaseline = 0;
        bouquetDragStartX = e.clientX;
        bouquetWrap.classList.add('is-dragging');
    }

    function bouquetDragMove(e) {
        if (!bouquetDragging) return;
        const deltaX = e.clientX - bouquetDragStartX;

        if (Math.abs(deltaX) > 4) {
            bouquetDragMoved = true;
        }

        const step = getBouquetStepPx();

        // Live "follow" nudge on the photos themselves while dragging, capped
        // to a small range, so the fan visibly responds to the finger/cursor
        // before a seat-swap snap happens.
        const nudge = Math.max(-16, Math.min(16, (deltaX - bouquetDragBaseline) * 0.22));
        bouquetSlots.forEach(slot => {
            slot.querySelector('.photo-container').style.transform = `translateX(${nudge}px)`;
        });

        // Dragging right = pictures shift right = the photo that was one seat
        // to the left now "follows" into the middle from the left side.
        while (deltaX - bouquetDragBaseline >= step) {
            bouquetRotation = (bouquetRotation - 1 + totalPhotoSlots) % totalPhotoSlots;
            bouquetDragBaseline += step;
            paintBouquetSlots(true);
        }
        while (deltaX - bouquetDragBaseline <= -step) {
            bouquetRotation = (bouquetRotation + 1) % totalPhotoSlots;
            bouquetDragBaseline -= step;
            paintBouquetSlots(true);
        }
    }

    function bouquetDragEnd() {
        if (!bouquetDragging) return;
        bouquetDragging = false;
        bouquetWrap.classList.remove('is-dragging');
        bouquetSlots.forEach(slot => {
            const container = slot.querySelector('.photo-container');
            container.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
            container.style.transform = 'translateX(0px)';
            setTimeout(() => { container.style.transition = ''; }, 260);
        });
    }

    if (bouquetWrap) {
        bouquetWrap.addEventListener('pointerdown', (e) => {
            bouquetDragStart(e);
            bouquetWrap.setPointerCapture(e.pointerId);
        });
        bouquetWrap.addEventListener('pointermove', bouquetDragMove);
        bouquetWrap.addEventListener('pointerup', bouquetDragEnd);
        bouquetWrap.addEventListener('pointercancel', bouquetDragEnd);
    }

    // --- Canvas Particle System ---
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    let particles = [];
    let burstParticles = [];
    let animationId = null;

    // Resize canvas to fill window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Class representing cherry blossom petals and hearts
    class Particle {
        constructor(isBurst = false, originX = 0, originY = 0) {
            this.isBurst = isBurst;
            if (isBurst) {
                this.x = originX;
                this.y = originY;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 3;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed - Math.random() * 2; // slight upward bias
                this.size = Math.random() * 8 + 6;
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.008;
            } else {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * -100 - 10;
                this.vx = Math.random() * 1.5 - 0.75;
                this.vy = Math.random() * 1.2 + 0.8;
                this.size = Math.random() * 6 + 4;
                this.alpha = Math.random() * 0.7 + 0.3;
                this.decay = 0;
            }

            // Color palette (purples and pinks)
            const colors = ['#f4b3c2', '#e88ea5', '#ba9fd4', '#d8bcff', '#fff4f6', '#fcd5e0'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.shape = Math.random() > 0.5 ? 'heart' : 'circle';
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.02 - 0.01;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;

            if (this.shape === 'heart') {
                ctx.beginPath();
                // Drawing a small path heart
                const size = this.size;
                ctx.moveTo(0, -size / 4);
                ctx.bezierCurveTo(-size / 2, -size / 2 - size / 4, -size, -size / 4, -size, size / 4);
                ctx.bezierCurveTo(-size, size, -size / 4, size * 1.2, 0, size * 1.6);
                ctx.bezierCurveTo(size / 4, size * 1.2, size, size, size, size / 4);
                ctx.bezierCurveTo(size, -size / 4, size / 2, -size / 2 - size / 4, 0, -size / 4);
                ctx.closePath();
                ctx.fill();
            } else {
                // Blossom petal (oval shape)
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size / 1.6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        update() {
            if (this.isBurst) {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.12; // gravity
                this.vx *= 0.98; // air drag
                this.alpha -= this.decay;
            } else {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;

                // Sway side to side
                this.vx += Math.sin(Date.now() * 0.001 + this.x) * 0.01;
            }
        }
    }

    // Generate continuous background particles
    function initAmbientParticles() {
        for (let i = 0; i < 40; i++) {
            particles.push(new Particle(false));
            // randomize y-coordinates to spread them across the screen on start
            particles[i].y = Math.random() * canvas.height;
        }
    }
    initAmbientParticles();

    // Create explosion burst particles
    function createBurst(x, y) {
        for (let i = 0; i < 120; i++) {
            burstParticles.push(new Particle(true, x, y));
        }
    }

    // Animation Loop
    function animationLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Ambient particles falling
        particles.forEach((p, idx) => {
            p.update();
            p.draw();

            // Reset if particle goes off screen
            if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
                particles[idx] = new Particle(false);
            }
        });

        // 2. Burst explosion particles
        for (let i = burstParticles.length - 1; i >= 0; i--) {
            const bp = burstParticles[i];
            bp.update();
            bp.draw();
            if (bp.alpha <= 0 || bp.y > canvas.height + 10) {
                burstParticles.splice(i, 1);
            }
        }

        animationId = requestAnimationFrame(animationLoop);
    }
    animationId = requestAnimationFrame(animationLoop);


    // --- Audiosphere: Romantic Synth Music Loop ---
    let audioCtx = null;
    let isPlaying = false;
    let synthTimerId = null;
    let tempo = 120; // BPM
    let beatDuration = 60 / tempo; // Seconds per beat
    let sequenceIndex = 0;

    // Melody sequence: C Major pentatonic arpeggios (soft, wind-chime music box feel)
    // Format: [Frequency or Note, BeatsDuration, VolumeMultiplier]
    // Frequency helper values
    // Define note frequencies
    const A2 = 110.00, G2 = 98.00;
    const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;

    // Let's create a beautiful, romantic music loop
    const musicSequence = [
        // Phrase 1: Cmaj7 arpeggio
        [C3, 1, 0.4], [E3, 1, 0.3], [G3, 1, 0.3], [C4, 1, 0.5],
        [E4, 1, 0.4], [G4, 1, 0.4], [C5, 2, 0.6], [E5, 2, 0.5],
        [C5, 1, 0.4], [G4, 1, 0.3], [E4, 1, 0.3], [C4, 1, 0.3],

        // Phrase 2: Fmaj7 arpeggio (sweet shift)
        [F3, 1, 0.4], [A3, 1, 0.3], [C4, 1, 0.3], [F4, 1, 0.5],
        [A4, 1, 0.4], [C5, 1, 0.4], [F5, 2, 0.6], [A5, 2, 0.5],
        [F5, 1, 0.4], [C5, 1, 0.3], [A4, 1, 0.3], [F4, 1, 0.3],

        // Phrase 3: Am7 arpeggio
        [A2, 1, 0.4], [C3, 1, 0.3], [E3, 1, 0.3], [A3, 1, 0.5],
        [C4, 1, 0.4], [E4, 1, 0.4], [A4, 2, 0.6], [C5, 2, 0.5],
        [A4, 1, 0.4], [E4, 1, 0.3], [C4, 1, 0.3], [A3, 1, 0.3],

        // Phrase 4: G6 arpeggio resolving to C
        [G2, 1, 0.4], [B3, 1, 0.3], [D4, 1, 0.3], [G4, 1, 0.5],
        [B4, 1, 0.4], [D5, 1, 0.4], [G5, 2, 0.6], [B5, 2, 0.5],
        [G5, 1, 0.4], [D5, 1, 0.3], [B4, 1, 0.3], [G4, 1, 0.3]
    ];

    function playTone(freq, duration, volume) {
        if (!audioCtx) return;

        // Keep synth sound incredibly soft, clean, and celestial
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Setup soft sound character using triangle wave (sounds like a musical box / bell piano)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        // Envelope: fade-in slightly to prevent click, sustain, fade-out exponentially
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.15, audioCtx.currentTime + 0.05); // low volume limit
        gainNode.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime + duration - 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    }

    function startMusicLoop() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        sequenceIndex = 0;

        function scheduleNextNote() {
            if (!isPlaying) return;

            const noteInfo = musicSequence[sequenceIndex];
            const freq = noteInfo[0];
            const durationBeats = noteInfo[1];
            const volume = noteInfo[2];

            const durationSeconds = durationBeats * beatDuration;

            // Play primary note
            playTone(freq, durationSeconds, volume);

            // Add a higher harmonic arpeggio layer occasionally (giving it a glittering chime effect)
            if (Math.random() > 0.6 && freq < 400) {
                // play an octave or perfect fifth higher, delayed slightly
                setTimeout(() => {
                    if (isPlaying) {
                        playTone(freq * 2, durationSeconds * 0.5, volume * 0.4);
                    }
                }, 150);
            }

            sequenceIndex = (sequenceIndex + 1) % musicSequence.length;

            // Schedule the next note in the loop
            synthTimerId = setTimeout(scheduleNextNote, durationSeconds * 1000);
        }

        scheduleNextNote();
    }

    function stopMusic() {
        isPlaying = false;
        if (synthTimerId) {
            clearTimeout(synthTimerId);
            synthTimerId = null;
        }
        audioControl.classList.remove('playing');
        audioControl.querySelector('.music-tooltip').innerText = "Play Music 🎵";
    }

    function toggleMusic() {
        if (isPlaying) {
            stopMusic();
        } else {
            isPlaying = true;
            audioControl.classList.add('playing');
            audioControl.querySelector('.music-tooltip').innerText = "Pause Music 🔇";
            startMusicLoop();
        }
    }

    audioControl.addEventListener('click', toggleMusic);

    // --- Surprise gift box click hander ---
    giftBox.addEventListener('click', () => {
        // 1. Add burst classes
        giftBox.classList.add('box-burst');

        // 2. Play particle explosion
        const boundingBox = giftBox.getBoundingClientRect();
        const boxCenterX = boundingBox.left + boundingBox.width / 2;
        const boxCenterY = boundingBox.top + boundingBox.height / 2;
        createBurst(boxCenterX, boxCenterY);

        // Create secondary burst above the box for visual filling
        setTimeout(() => {
            createBurst(boxCenterX, boxCenterY - 100);
        }, 150);

        // 3. Audio plays automatically on box opening click
        if (!isPlaying) {
            isPlaying = true;
            audioControl.classList.add('playing');
            audioControl.querySelector('.music-tooltip').innerText = "Pause Music 🔇";
            startMusicLoop();
        }

        // 4. Transition screen from S1 to S2
        setTimeout(() => {
            surpriseScreen.classList.remove('active');
            surpriseScreen.classList.add('hidden');

            mainScreen.classList.remove('hidden');
            mainScreen.classList.add('active');

            // Unlock page scrolling now that the main content is revealed
            document.body.classList.remove('lock-scroll');

            // Fire small celebration sparks on the main page header
            setTimeout(() => {
                const header = document.querySelector('.main-title');
                const headerRect = header.getBoundingClientRect();
                createBurst(headerRect.left, headerRect.top + headerRect.height / 2);
                createBurst(headerRect.right, headerRect.top + headerRect.height / 2);
            }, 800);

        }, 1200);
    });

    // --- Love Envelope & Letter: paper pops out into a floating modal ---
    function openLetter() {
        if (loveEnvelope.classList.contains('flap-open')) return;

        // Step 1: Open the flap
        loveEnvelope.classList.add('flap-open');

        // Step 2: Pop the paper out into a centered floating modal.
        // Moving it to <body> means its size/position no longer depends on
        // the envelope or card layout at all, so there's nothing to clip
        // or squeeze on any screen size.
        setTimeout(() => {
            loveLetter.classList.add('is-modal', 'modal-entering');
            document.body.appendChild(loveLetter);
            document.body.appendChild(letterBackdrop);
            letterBackdrop.classList.add('active');

            // Force the "entering" starting state to apply before removing it,
            // so the pop-in transition actually animates.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    loveLetter.classList.remove('modal-entering');
                });
            });

            const rect = loveLetter.getBoundingClientRect();
            createBurst(rect.left + rect.width / 2, rect.top + 30);
        }, 550);
    }

    function closeLetter() {
        if (!loveLetter.classList.contains('is-modal')) return;

        // Animate the paper back down, then tuck it back inside the envelope
        loveLetter.classList.add('modal-entering');
        letterBackdrop.classList.remove('active');

        setTimeout(() => {
            loveLetter.classList.remove('is-modal', 'modal-entering');
            if (letterOriginalParent) letterOriginalParent.appendChild(loveLetter);
            loveEnvelope.classList.remove('flap-open');
        }, 450);
    }

    loveEnvelope.addEventListener('click', (e) => {
        if (e.target.closest('.letter-body')) return;
        openLetter();
    });

    envelopeWaxSeal.addEventListener('click', (e) => {
        e.stopPropagation();
        openLetter();
    });

    if (letterCloseBtn) {
        letterCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLetter();
        });
    }

    if (letterBackdrop) {
        letterBackdrop.addEventListener('click', closeLetter);
    }


    // --- Photo Bouquet Lightbox Modal controls ---
    polaroids.forEach(card => {
        card.addEventListener('click', (e) => {
            // If the user was dragging/swiping to rotate the bouquet, don't
            // also pop open the lightbox for whichever photo ends up under
            // the cursor/finger.
            if (bouquetDragMoved) {
                return;
            }

            // Click animations
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                // Reset card transformation styles governed by hover classes
                card.style.transform = '';
            }, 150);

            const imgEl = card.querySelector('img');
            const caption = card.getAttribute('data-caption');
            const imgSrc = imgEl.src;

            // Set content in lightbox
            lightboxImg.src = imgSrc;
            lightboxCaption.textContent = caption;

            // Open screen modal
            lightboxModal.classList.remove('hidden');
            lightboxModal.setAttribute('aria-hidden', 'false');

            // Create cute sparkle effect around the clicked card
            const rect = card.getBoundingClientRect();
            createBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
    });

    // Hiding the Lightbox modal
    function closeLightbox() {
        lightboxModal.classList.add('hidden');
        lightboxModal.setAttribute('aria-hidden', 'true');
        lightboxImg.src = '';
        lightboxCaption.textContent = '';
    }

    modalClose.addEventListener('click', closeLightbox);

    // Close on outer modal background click
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });

    // Close modal on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
            closeLightbox();
        }
        if (e.key === 'Escape' && loveLetter.classList.contains('is-modal')) {
            closeLetter();
        }
    });

    // --- Birthday Cake: blow out candles to reveal the wish message ---
    const candles = document.querySelectorAll('.candle');
    const cakeHint = document.getElementById('cake-hint');
    const finaleRevealCard = document.getElementById('finale-reveal-card');

    if (candles.length && finaleRevealCard) {
        let candlesLit = candles.length;

        candles.forEach(candle => {
            candle.addEventListener('click', () => {
                if (candle.classList.contains('blown')) return;

                candle.classList.add('blown');
                candlesLit -= 1;

                // Little burst right at the candle's flame position
                const rect = candle.getBoundingClientRect();
                if (typeof createBurst === 'function') {
                    createBurst(rect.left + rect.width / 2, rect.top);
                }

                if (candlesLit === 0) {
                    if (cakeHint) {
                        cakeHint.textContent = '✨ Wish made! Here it comes... ✨';
                        cakeHint.classList.add('hint-done');
                    }
                    setTimeout(() => {
                        finaleRevealCard.classList.add('revealed');
                        const cardRect = finaleRevealCard.getBoundingClientRect();
                        if (typeof createBurst === 'function') {
                            createBurst(cardRect.left + cardRect.width / 2, cardRect.top + 40);
                        }
                    }, 400);
                }
            });
        });
    }

    // --- Scroll-Reveal for Birthday Finale Section ---
    // Uses IntersectionObserver to fire slide-in animations when cards scroll into view

    function initScrollReveal() {
        const revealTargets = document.querySelectorAll(
            '.finale-detail-card, .cake-wish-wrap'
        );

        if (!revealTargets.length) return;

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const delay = parseInt(el.getAttribute('data-delay') || '0', 10);

                    setTimeout(() => {
                        el.classList.add('in-view');

                        // Spawn hearts burst at element center when it reveals
                        const rect = el.getBoundingClientRect();
                        if (typeof createBurst === 'function') {
                            createBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        }
                    }, delay);

                    revealObserver.unobserve(el); // Reveal once only
                }
            });
        }, {
            threshold: 0.18,      // Activate when 18% of element is in viewport
            rootMargin: '0px 0px -60px 0px'  // Slight bottom offset so reveal is slightly before edge
        });

        revealTargets.forEach(el => revealObserver.observe(el));
    }

    // Wait until the main screen becomes visible before setting up observers
    // Because the finale section is hidden inside the #main-screen at first
    const mainScreenEl = document.getElementById('main-screen');
    const mainScreenMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.removedNodes.forEach(node => {
                if (node.classList && node.classList.contains('hidden')) {
                    // Main screen is now visible, set up scroll reveal
                    setTimeout(initScrollReveal, 1500);
                    mainScreenMutationObserver.disconnect();
                }
            });
        });
    });

    // Also detect class changes (when hidden class is removed from main-screen)
    const mainScreenClassObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'class') {
                const el = mutation.target;
                if (!el.classList.contains('hidden')) {
                    setTimeout(initScrollReveal, 1500);
                    mainScreenClassObserver.disconnect();
                }
            }
        });
    });

    mainScreenClassObserver.observe(mainScreenEl, { attributes: true });

});