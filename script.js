// Physics Engine Optimization
async function initPhysics() {
    // Use WeakMap for better memory management with DOM elements
    const imageLoadMap = new WeakMap();
    
    // More efficient image loading with Promise.all and WeakMap
    const imgElements = Array.from(document.querySelectorAll('.svg-sprites img'));
    await Promise.all(imgElements.map(img => {
        if (imageLoadMap.has(img)) return imageLoadMap.get(img);
        const promise = new Promise((resolve) => {
            if (img.complete) resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
        imageLoadMap.set(img, promise);
        return promise;
    }));

    // Module aliases - destructure for better minification
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Body, Vector } = Matter;

    // Create engine with optimized settings
    const engine = Engine.create({
        gravity: { x: 0, y: 0.5 },
        enableSleeping: true, // Enable sleeping for inactive bodies
        constraintIterations: 2 // Reduce constraint iterations for better performance
    });
    
    const world = engine.world;
    const container = document.getElementById('canvas-container');
    
    // Create renderer with optimized settings
    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: container.clientWidth,
            height: container.clientHeight,
            wireframes: false,
            background: 'transparent',
            pixelRatio: Math.min(window.devicePixelRatio, 2), // Cap pixel ratio for better performance
            showSleeping: false,
            showDebug: false
        }
    });

    // Optimized wall options
    const wallOptions = {
        isStatic: true,
        render: { visible: false },
        friction: 0,
        restitution: 0.7,
        chamfer: { radius: 0 } // Remove chamfer for walls
    };

    // Create walls with cached dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const walls = [
        Bodies.rectangle(containerWidth / 2, containerHeight + 30, containerWidth, 60, wallOptions),
        Bodies.rectangle(-30, containerHeight / 2, 60, containerHeight, wallOptions),
        Bodies.rectangle(containerWidth + 30, containerHeight / 2, 60, containerHeight, wallOptions)
    ];

    // Optimized body creation with shared options
    const bodyOptions = {
        restitution: 0.7,
        friction: 0.01,
        frictionAir: 0.005,
        density: 0.002,
        slop: 0,
        chamfer: { radius: 2 }
    };

    // Create bodies with optimized sprite rendering
    const bodies = imgElements.map((img, index) => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        return Bodies.rectangle(
            50 + Math.random() * (containerWidth - 100),
            -100 - (index * 100),
            width,
            height,
            {
                ...bodyOptions,
                render: {
                    sprite: {
                        texture: img.src,
                        xScale: 1,
                        yScale: 1
                    }
                }
            }
        );
    });

    // Optimized mouse constraint
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.1,
            render: { visible: false }
        }
    });

    // Add all bodies to world at once
    Composite.add(world, [...walls, ...bodies, mouseConstraint]);

    // Optimized mouse interaction with throttling
    let lastTime = 0;
    let lastMousePos = { x: 0, y: 0 };
    
    render.canvas.addEventListener('mousemove', (event) => {
        const currentTime = performance.now();
        if (currentTime - lastTime < 16) return; // Limit to ~60fps
        
        const mousePosition = {
            x: event.offsetX,
            y: event.offsetY
        };

        const mouseVelocity = {
            x: (mousePosition.x - lastMousePos.x) * 0.1,
            y: (mousePosition.y - lastMousePos.y) * 0.1
        };

        const speed = Math.sqrt(mouseVelocity.x * mouseVelocity.x + mouseVelocity.y * mouseVelocity.y);
        
        bodies.forEach(body => {
            const distance = Vector.magnitude(Vector.sub(body.position, mousePosition));
            if (distance < 100) {
                const force = Vector.mult(
                    Vector.normalise(Vector.sub(body.position, mousePosition)),
                    0.05 * (1 - distance/100) * Math.min(3, speed)
                );
                Body.applyForce(body, body.position, force);
            }
        });

        lastMousePos = mousePosition;
        lastTime = currentTime;
    }, { passive: true });

    // Optimized resize handler with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
            render.canvas.width = container.clientWidth;
            render.canvas.height = container.clientHeight;
            
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            
            Body.setPosition(walls[0], { 
                x: newWidth / 2,
                y: newHeight + 30
            });
            Body.setPosition(walls[2], {
                x: newWidth + 30,
                y: newHeight / 2
            });
        }, 250);
    });

    // Optimized runner
    const runner = Runner.create({
        isFixed: true,
        delta: 1000/60
    });
    Runner.run(runner, engine);
    Render.run(render);

    // Optimized reset with RAF
    let resetTimeout;
    function checkReset() {
        bodies.forEach(body => {
            if (body.position.y > container.clientHeight + 100) {
                Body.setPosition(body, {
                    x: 50 + Math.random() * (containerWidth - 100),
                    y: -100
                });
                Body.setVelocity(body, { x: 0, y: 0 });
                Body.setAngularVelocity(body, 0);
            }
        });
        resetTimeout = requestAnimationFrame(checkReset);
    }
    resetTimeout = requestAnimationFrame(checkReset);

    // Cleanup function
    return () => {
        Runner.stop(runner);
        Render.stop(render);
        cancelAnimationFrame(resetTimeout);
        World.clear(world, true);
        Engine.clear(engine);
        render.canvas.remove();
        render.canvas = null;
        render.context = null;
    };
}

function initUpgradeAnimation() {
    const container = document.querySelector('.container');
    const numIcons = 3;
    let currentIcon = 0;
    const iconDelay = 400; // Reduced to 300ms
    const animationDuration = 1600;

    function createIcon(type, number) {
        const icon = document.createElement('img');
        icon.src = `./icons/upgrade-icons/icon-${type}-${number}.svg`;
        icon.classList.add('upgrade-icon', `icon-${type}`);
        icon.alt = `Icon ${type} ${number}`;
        return icon;
    }

    function animateSequence() {
        if (currentIcon >= numIcons) {
            currentIcon = 0;
        }

        // Animate icons moving to laptop
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const iconBefore = createIcon('before', currentIcon + 1);
                container.appendChild(iconBefore);
                
                requestAnimationFrame(() => {
                    iconBefore.classList.add('moving-to-laptop');
                    iconBefore.style.animationDelay = `${i * 0.1}s`; // Add slight delay for spacing
                });
                
                setTimeout(() => {
                    iconBefore.remove();
                }, animationDuration + 100);
            }, i * iconDelay);
        }

        const afterSequenceDelay = iconDelay * 6; // Reduced delay
        
        // Animate icons moving from laptop
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const iconAfter = createIcon('after', currentIcon + 1);
                container.appendChild(iconAfter);
                
                requestAnimationFrame(() => {
                    iconAfter.classList.add('moving-from-laptop');
                    iconAfter.style.animationDelay = `${i * 0.1}s`; // Add slight delay for spacing
                });
                
                setTimeout(() => {
                    iconAfter.remove();
                }, animationDuration + 100);
            }, afterSequenceDelay + (i * iconDelay));
        }

        currentIcon++;

        const totalDuration = afterSequenceDelay + (3 * iconDelay) + animationDuration;
        setTimeout(animateSequence, totalDuration);
    }

    setTimeout(animateSequence, 1000);
}

// Add the initialization call


// Optimized Text Animation
const initTextAnimation = (() => {
    const phrases = [
        "транскрибация",
        "перевод",
        "конвертация",
        "преобразование",
        "транскрипция",
        "расшифровка"
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let animationFrame;
    
    return () => {
        const typingElement = document.getElementById('typing-text');
        const cursorElement = document.getElementById('cursor');
        if (!typingElement || !cursorElement) return;
        
        function typePhrase(timestamp) {
            const currentPhrase = phrases[phraseIndex];
            
            if (!isDeleting && charIndex <= currentPhrase.length) {
                typingElement.textContent = currentPhrase.substring(0, charIndex);
                charIndex++;
                
                if (charIndex > currentPhrase.length) {
                    setTimeout(() => {
                        isDeleting = true;
                        requestAnimationFrame(typePhrase);
                    }, 10000);
                    return;
                }
            } else if (isDeleting && charIndex > 0) {
                typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                charIndex = 0;
                setTimeout(() => requestAnimationFrame(typePhrase), 500);
                return;
            }
            
            const delay = isDeleting ? 50 : 100;
            setTimeout(() => requestAnimationFrame(typePhrase), delay);
        }
        
        // Optimized cursor blink
        let cursorVisible = true;
        function blinkCursor() {
            cursorVisible = !cursorVisible;
            cursorElement.style.visibility = cursorVisible ? 'visible' : 'hidden';
        }
        
        setInterval(blinkCursor, 530);
        requestAnimationFrame(typePhrase);
    };
})();

// Optimized Feed Animation
function initFeedAnimation() {
    const feeds = document.querySelectorAll('.feed');
    if (!feeds.length) return;

    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(`
        .feed {
            overflow: visible !important;
            will-change: transform;
        }
        .feed img {
            transform-style: preserve-3d;
            backface-visibility: hidden;
            pointer-events: none;
            transform-origin: center;
            display: block;
            margin: 0.001vh 0; /* Consistent 10px gap between items */
            will-change: transform, opacity;
            transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1),
                       opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (prefers-reduced-motion: reduce) {
            .feed img {
                transition: transform 0.1s linear, opacity 0.1s linear;
            }
        }
    `);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];

    const windowHeight = window.innerHeight;
    let lastScrollTop = window.pageYOffset;
    let scrollVelocity = 0;
    let ticking = false;

    const ease = t => 1 + (--t) * t * t;
    
    feeds.forEach(feed => {
        const items = Array.from(feed.getElementsByTagName('img'));
        const itemCache = new WeakMap();
        
        function updateItems() {
            const feedRect = feed.getBoundingClientRect();
            
            if (feedRect.top < windowHeight && feedRect.bottom > 0) {
                items.forEach(item => {
                    const rect = item.getBoundingClientRect();
                    const viewportPosition = (rect.top + rect.height / 2) / windowHeight;
                    
                    // Adjusted scale calculations for tighter grouping
                    let targetScale;
                    if (viewportPosition <= 0.3) {
                        const normalizedPos = viewportPosition / 0.3;
                        targetScale = 0.85 + (normalizedPos * 0.1); // Smaller range: 0.85 to 0.95
                    } else if (viewportPosition <= 0.7) {
                        const normalizedPos = (viewportPosition - 0.3) / 0.4;
                        targetScale = 0.95 + (normalizedPos * 0.1); // Smaller range: 0.95 to 1.05
                    } else {
                        const normalizedPos = (viewportPosition - 0.7) / 0.3;
                        targetScale = 1.05 + (normalizedPos * 0.05); // Smaller range: 1.05 to 1.1
                    }

                    // Reduced velocity influence
                    const velocityScale = 1 + (Math.abs(scrollVelocity) * 0.0005);
                    const scale = targetScale * velocityScale;
                    
                    // Simplified movement calculations
                    const centerOffset = viewportPosition - 0.5;
                    const baseParallax = (viewportPosition - 0.5) * 10; // Reduced movement
                    const velocityParallax = scrollVelocity * 0.05; // Reduced velocity influence
                    const rotation = 15 + ((viewportPosition - 0.5) * 2); // 
                    const zTranslation = (viewportPosition - 0.5) * -40; // Reduced depth
                    
                    const transform = `
                        translate3d(0, ${baseParallax + velocityParallax}px, ${zTranslation}px)
                        scale(${scale})
                        rotateX(${rotation}deg)
                    `;
                    
                    // Simplified opacity calculation
                    const opacity = 0.9;
                    
                    const cache = itemCache.get(item) || {};
                    if (
                        !cache.transform ||
                        Math.abs(cache.opacity - opacity) > 0.01 ||
                        cache.transform !== transform
                    ) {
                        item.style.transform = transform;
                        item.style.opacity = opacity;
                        
                        itemCache.set(item, { transform, opacity });
                    }
                });
            }
        }
        
        // Optimized scroll handler with throttling
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                if (scrollTimeout) {
                    cancelAnimationFrame(scrollTimeout);
                }
                
                scrollTimeout = requestAnimationFrame(() => {
                    const currentScrollTop = window.pageYOffset;
                    scrollVelocity = (currentScrollTop - lastScrollTop) * 0.1;
                    lastScrollTop = currentScrollTop;
                    
                    updateItems();
                    scrollVelocity *= 0.9;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    });

    // Initialize
    window.dispatchEvent(new Event('scroll'));
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initPhysics();
    initTextAnimation();
    initFeedAnimation();
    initUpgradeAnimation();
});


////
// document.addEventListener('DOMContentLoaded', () => {
// 	const feed2 = document.querySelector('.feed2');
// 	const items = Array.from(feed2.getElementsByTagName('img'));
// 	const itemHeight = 200;
// 	const animationDuration = 6000; // 3 seconds for one complete cycle
  
// 	// Clone items and set initial positions
// 	function setupItems() {
// 	  items.forEach((item, index) => {
// 		item.style.top = `${index * itemHeight}px`;
		
// 		// Create data attributes for animation tracking
// 		item.dataset.initialPosition = index * itemHeight;
// 		item.dataset.currentPosition = index * itemHeight;
// 	  });
// 	}
  
// 	function animateItems() {
// 	  items.forEach((item, index) => {
// 		const currentPos = parseFloat(item.dataset.currentPosition);
// 		let newPos = currentPos - 1; // Move up by 1px
  
// 		// If item has moved up beyond view, reset to bottom
// 		if (newPos < -itemHeight) {
// 		  newPos = (items.length - 1) * itemHeight;
// 		  item.style.opacity = '0';
// 		  setTimeout(() => {
// 			item.style.opacity = '1';
// 		  }, 50);
// 		}
  
// 		// Calculate scale based on position
// 		const centerPoint = feed2.clientHeight / 2;
// 		const distanceFromCenter = Math.abs(newPos - centerPoint);
// 		const maxDistance = feed2.clientHeight;
// 		const scale = 1 - (distanceFromCenter / maxDistance) * 0.3;
		
// 		// Calculate opacity
// 		const opacity = 1 - (distanceFromCenter / maxDistance) * 0.5;
  
// 		// Apply transformations
// 		item.style.transform = `translateY(${newPos}px) scale(${scale})`;
// 		item.style.opacity = opacity;
		
// 		// Update position data
// 		item.dataset.currentPosition = newPos;
// 	  });
  
// 	  requestAnimationFrame(animateItems);
// 	}
  
// 	// Initialize
// 	setupItems();
// 	requestAnimationFrame(animateItems);
//   });

//////////////////
window.scroll({
	top: 2500, 
	left: 0, 
	behavior: 'smooth'
  });
  
  // Scroll certain amounts from current position 
  window.scrollBy({ 
	top: 100, // could be negative value
	left: 0, 
	behavior: 'smooth' 
  });
  

  function makeButtonClickable(button) {
    let lastClickTime = 0;
    const delay = 120;
  
    function handleMouseDown() {
      const currentTime = Date.now();
      if (currentTime - lastClickTime > delay) {
        button.classList.add("fast-click");
        const descendants = button.querySelectorAll("*");
        descendants.forEach((descendant) =>
          descendant.classList.add("fast-click")
        );
        lastClickTime = currentTime;
      }
    }
  
    function handleMouseUp() {
      setTimeout(() => {
        button.classList.remove("fast-click");
        const descendants = button.querySelectorAll("*");
        descendants.forEach((descendant) =>
          descendant.classList.remove("fast-click")
        );
      }, delay);
    }
  
    function handleMouseLeave() {
      button.classList.remove("fast-click");
      const descendants = button.querySelectorAll("*");
      descendants.forEach((descendant) =>
        descendant.classList.remove("fast-click")
      );
    }
  
    button.addEventListener("mousedown", handleMouseDown);
    button.addEventListener("mouseup", handleMouseUp);
    button.addEventListener("mouseleave", handleMouseLeave);
  }
  
  const loginButton = document.querySelector(".login");
  makeButtonClickable(loginButton);
  
  const anotherButton = document.querySelector(".logo");
  const logoImg = document.querySelector(".logo-img");
  
  if (anotherButton) {
    makeButtonClickable(anotherButton);
  }
  if (logoImg) {
    makeButtonClickable(logoImg);
  }
  
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((i) => makeButtonClickable(i));
  