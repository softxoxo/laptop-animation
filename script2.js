//---------------------------------------------------LAPTOP------------------------------------------------------------//
async function initPhysics() {
    const imageLoadMap = new WeakMap();
    
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

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Body, Vector } = Matter;

    const engine = Engine.create({
        gravity: { x: 0, y: 0.5 },
        enableSleeping: true,
        constraintIterations: 2
    });
    
    const world = engine.world;
    const container = document.getElementById('canvas-container');
    
    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: container.clientWidth,
            height: container.clientHeight,
            wireframes: false,
            background: 'transparent',
            pixelRatio: Math.min(window.devicePixelRatio, 2),
            showSleeping: false,
            showDebug: false
        }
    });

    const wallOptions = {
        isStatic: true,
        render: { visible: false },
        friction: 0,
        restitution: 0.7,
        chamfer: { radius: 0 }
    };

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const walls = [
        Bodies.rectangle(containerWidth / 2, containerHeight + 30, containerWidth, 60, wallOptions),
        Bodies.rectangle(-30, containerHeight / 2, 60, containerHeight, wallOptions),
        Bodies.rectangle(containerWidth + 30, containerHeight / 2, 60, containerHeight, wallOptions)
    ];

    const bodyOptions = {
        restitution: 0.7,
        friction: 0.01,
        frictionAir: 0.005,
        density: 0.002,
        slop: 0,
        chamfer: { radius: 2 }
    };

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

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.1,
            render: { visible: false }
        }
    });

    Composite.add(world, [...walls, ...bodies, mouseConstraint]);

    let lastTime = 0;
    let lastMousePos = { x: 0, y: 0 };
    
    render.canvas.addEventListener('mousemove', (event) => {
        const currentTime = performance.now();
        if (currentTime - lastTime < 16) return;
        
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

    const runner = Runner.create({
        isFixed: true,
        delta: 1000/60
    });
    Runner.run(runner, engine);
    Render.run(render);

    let resetTimeout;
    let topWallAdded = false;
    
    function checkReset() {
        let allBodiesSettled = true;
        
        bodies.forEach(body => {
            if (body.position.y > containerHeight + 100) {
                Body.setPosition(body, {
                    x: 50 + Math.random() * (containerWidth - 100),
                    y: -100
                });
                Body.setVelocity(body, { x: 0, y: 0 });
                Body.setAngularVelocity(body, 0);
                allBodiesSettled = false;
            }
            
            // Check if body is still moving significantly
            if (Math.abs(body.velocity.y) > 0.1 || Math.abs(body.velocity.x) > 0.1) {
                allBodiesSettled = false;
            }
        });

        // Add top wall after bodies have settled
        if (allBodiesSettled && !topWallAdded) {
            const topWall = Bodies.rectangle(containerWidth / 2, -30, containerWidth, 60, wallOptions);
            Composite.add(world, topWall);
            topWallAdded = true;
        }

        resetTimeout = requestAnimationFrame(checkReset);
    }
    resetTimeout = requestAnimationFrame(checkReset);

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
//---------------------------------------------------UPGRADE------------------------------------------------------------//

let isContainerVisible = true; 

function initUpgradeAnimation() {
    const container = document.querySelector('.container');
    const numIcons = 3;
    let currentIcon = 0;
    let isAnimating = false;
    const iconDelay = 400;
    const animationDuration = 1600;
    
    const activeIcons = new Set();

    function createIcon(type, number) {
        const icon = document.createElement('img');
        icon.src = `./icons2/upgrade-icons/icon-${type}-${number}.svg`;
        icon.classList.add('upgrade-icon', `icon-${type}`);
        icon.alt = `Icon ${type} ${number}`;
        return icon;
    }

    function cleanupIcon(icon) {
        if (activeIcons.has(icon)) {
            icon.remove();
            activeIcons.delete(icon);
        }
    }

    function cleanupAllIcons() {
        activeIcons.forEach(cleanupIcon);
    }

    function animateIcon(type, index, baseDelay) {
        return new Promise((resolve) => {
            if (!isContainerVisible) {
                resolve();
                return;
            }

            const icon = createIcon(type, currentIcon + 1);
            activeIcons.add(icon);
            container.appendChild(icon);
            
            icon.offsetHeight;

            icon.classList.add(type === 'before' ? 'moving-to-laptop' : 'moving-from-laptop');
            icon.style.animationDelay = `${baseDelay + (index * 0.64)}s`;

            const cleanupTime = animationDuration + (baseDelay + (index * 0.64)) * 1600 + 100;
            setTimeout(() => {
                cleanupIcon(icon);
                resolve();
            }, cleanupTime);
        });
    }

    async function animateSequence() {
        if (isAnimating || !isContainerVisible) return;
        isAnimating = true;

        try {
            cleanupAllIcons();

            if (!isContainerVisible) {
                isAnimating = false;
                return;
            }

            const toPromises = Array.from({ length: 3 }, (_, i) => 
                animateIcon('before', i, 0)
            );
            await Promise.all(toPromises);

            if (!isContainerVisible) {
                cleanupAllIcons();
                isAnimating = false;
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            if (!isContainerVisible) {
                cleanupAllIcons();
                isAnimating = false;
                return;
            }

            const fromPromises = Array.from({ length: 3 }, (_, i) => 
                animateIcon('after', i, 0)
            );
            await Promise.all(fromPromises);

            currentIcon = (currentIcon + 1) % numIcons;

            setTimeout(() => {
                isAnimating = false;
                if (isContainerVisible) {
                    animateSequence();
                }
            }, 500);

        } catch (error) {
            console.error('Animation error:', error);
            isAnimating = false;
        }
    }

    setTimeout(animateSequence, 1000);
}

// Initialize animation and scroll handling
document.addEventListener('DOMContentLoaded', () => {
    initUpgradeAnimation();
    
    // Handle scroll event to update container visibility
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollPercentage = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                
                // Update container visibility flag
                if (scrollPercentage > 20 && isContainerVisible) {
                    isContainerVisible = false;
                    const container = document.querySelector('.container');
                    const activeIcons = container.querySelectorAll('.upgrade-icon');
                    activeIcons.forEach(icon => icon.remove());
                } else if (scrollPercentage <= 20 && !isContainerVisible) {
                    isContainerVisible = true;
                    initUpgradeAnimation();
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });
});

//---------------------------------------------------TEXT-ANIMATION------------------------------------------------------------//
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

//---------------------------------------------------PARALAX------------------------------------------------------------//

  document.addEventListener('DOMContentLoaded', () => {
   
// Force scroll to top on page load
window.scrollTo(0, 0);
window.history.scrollRestoration = 'manual';

    const container = document.querySelector('.container');
    const feed = document.querySelector('.feed');
    const feedImages = Array.from(feed.querySelectorAll('img'));
    const tryFreeButton = document.querySelector('.try-free');
    let lastScrollTop = 0;
    
    // Calculate total scroll height needed
    const totalScrollHeight = window.innerHeight * 3;
    document.body.style.height = `${totalScrollHeight}px`;
  
    function handleScroll() {
      const scrollPosition = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const scrollPercentage = (scrollPosition / (totalScrollHeight - windowHeight)) * 100;
  
      // Move background slightly
      document.body.style.backgroundPosition = `center ${-scrollPosition * 0.1}px`;
  
      // Handle laptop container
      if (scrollPercentage > 20) {
        container.classList.add('hidden');
      } else {
        container.classList.remove('hidden');
      }
  
      // Handle feed images
      if (scrollPercentage > 30 && scrollPercentage < 80) {
        const feedStartPosition = windowHeight;
        const currentPosition = feedStartPosition - (scrollPosition - (windowHeight * 0.3));
        feed.style.transform = `translate(-50%, ${currentPosition}px)`;
        
        // Show/hide feed images based on scroll position
        feedImages.forEach((img, index) => {
          let imageScrollStart = 30 + (index * 4);
          let imageScrollEnd = imageScrollStart + 30;
          if (index > 3) {
            imageScrollEnd = imageScrollStart + 29;
          }
          if (index > 5) {
            imageScrollEnd = imageScrollStart - 10;
          }
          
          if (scrollPercentage > imageScrollStart && scrollPercentage < imageScrollEnd) {
            img.classList.add('visible');
            img.classList.remove('hidden');
          } else if (scrollPercentage >= imageScrollEnd) {
            img.classList.add('hidden');
            img.classList.remove('visible');
          } else {
            img.classList.remove('visible', 'hidden');
          }
        });
      }
  
      // Handle try-free button visibility
      if (scrollPercentage > 85) {
        tryFreeButton.classList.add('visible');
      } else {
        tryFreeButton.classList.remove('visible');
      }
  
      lastScrollTop = scrollPosition;
    }
  
    // Throttle scroll event
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });
  
    // Initial call
    handleScroll();
  });

//---------------------------------------------------INIT------------------------------------------------------------//
  document.addEventListener('DOMContentLoaded', () => {
    initPhysics();
    initTextAnimation();
    initUpgradeAnimation();
});
  
//---------------------------------------------------HEADER------------------------------------------------------------//
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
  