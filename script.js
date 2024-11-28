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

    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Body, Vector, World } = Matter;

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

    // Disable object dragging
    mouseConstraint.constraint.stiffness = 0;

    // Track mouse state
    let isMouseInContainer = false;
    let mouseExitPoint = null;
    let mouseExitTime = 0;

    // Mouse enter handler
    container.addEventListener('mouseenter', () => {
        isMouseInContainer = true;
    });

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
        
        if (isMouseInContainer) {
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
        }

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
            
            if (Math.abs(body.velocity.y) > 0.1 || Math.abs(body.velocity.x) > 0.1) {
                allBodiesSettled = false;
            }
        });

        resetTimeout = requestAnimationFrame(checkReset);
    }
    resetTimeout = requestAnimationFrame(checkReset);

    Composite.add(world, [...walls, ...bodies, mouseConstraint]);

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
  
    class SpringWord {
      constructor(element) {
        this.element = element;
        this.x = 0;
        this.y = 0;
        this.velX = 0;
        this.velY = 0;
        this.springConstant = 0.2;
        this.friction = 0.8;
      }
  
      update(mouseX, mouseY, isHovered) {
        if (isHovered) {
          const rect = this.element.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const dx = mouseX - centerX;
          const dy = mouseY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Add minimum distance threshold to prevent center-hover issues
          if (distance < 300 && distance > 5) {  // Added minimum distance of 5px
            const angle = Math.atan2(dy, dx);
            const force = (50 - distance) / 8;
            this.x = Math.cos(angle) * force;
            this.y = Math.sin(angle) * force;
          }
        } else {
          // Spring force
          const forceX = -this.springConstant * this.x;
          const forceY = -this.springConstant * this.y;
          
          this.velX = (this.velX + forceX) * this.friction;
          this.velY = (this.velY + forceY) * this.friction;
          
          this.x += this.velX;
          this.y += this.velY;
        }
  
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
      }
    }
  
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let springWord = null;
    let isHovered = false;
    let mouseX = 0;
    let mouseY = 0;
  
    function updateSpringAnimation() {
      if (springWord) {
        springWord.update(mouseX, mouseY, isHovered);
      }
      requestAnimationFrame(updateSpringAnimation);
    }
  
    return () => {
      const typingElement = document.getElementById('typing-text');
      const cursorElement = document.getElementById('cursor');
      if (!typingElement || !cursorElement) return;
  
      springWord = new SpringWord(typingElement);
  
      function typePhrase() {
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
  
      // Cursor blink
      let cursorVisible = true;
      function blinkCursor() {
        cursorVisible = !cursorVisible;
        cursorElement.style.visibility = cursorVisible ? 'visible' : 'hidden';
      }
      setInterval(blinkCursor, 530);
  
      // Mouse event handlers
      typingElement.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });
  
      typingElement.addEventListener('mouseenter', () => {
        isHovered = true;
      });
  
      typingElement.addEventListener('mouseleave', () => {
        isHovered = false;
      });
  
      // Start animations
      requestAnimationFrame(typePhrase);
      requestAnimationFrame(updateSpringAnimation);
    };
  })();

//---------------------------------------------------PARALAX------------------------------------------------------------//

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  window.history.scrollRestoration = 'manual';

  const container = document.querySelector('.container');
  const feed = document.querySelector('.feed');
  const feedImages = feed ? Array.from(feed.querySelectorAll('img')) : [];
  const tryFreeButton = document.querySelector('.try-free');
  const canvasContainer = document.querySelector('#canvas-container');
  const typingBlock = document.querySelector('.typing-block');
  const typingBlock3 = document.querySelector('.typing-block-3');
  const registrationBlue = document.querySelector('.registration-blue');
  
  let lastScrollTop = 0;
  let isMouseOverCanvas = false;
  
  // Parallax variables
  const maxMovement = 15;
  let currentBackgroundX = 0;
  let currentBackgroundY = 0;
  let targetBackgroundX = 0;
  let targetBackgroundY = 0;
  
  const totalScrollHeight = window.innerHeight * 2;
  document.body.style.height = `${totalScrollHeight}px`;
  
  // Modified exit positions for more dramatic downward movement
  const exitPositions = {
      'typing-block': { x: -150, y: 350 },
      'typing-block-3': { x: 150, y: 350 },
      'registration-blue': { x: -200, y: 450 },
      'container': { x: 200, y: 450 },
      'feed': { x: 0, y: 550 }
  };

  // Enhanced star-like circles
  const circles = {};
  Object.keys(exitPositions).forEach(elementClass => {
      const circle = document.createElement('div');
      circle.className = 'exit-circle';
      circle.style.cssText = `
          position: fixed;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 
              0 0 15px 2px rgba(255, 255, 255, 0.95),
              0 0 30px 4px rgba(255, 255, 255, 0.7),
              0 0 45px 6px rgba(255, 255, 255, 0.4);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
          transform: scale(0);
      `;
      document.body.appendChild(circle);
      circles[elementClass] = circle;
  });

  function lerp(start, end, factor) {
      return start + (end - start) * factor;
  }

  function updateParallax() {
      if (!isMouseOverCanvas) {
          currentBackgroundX = lerp(currentBackgroundX, targetBackgroundX, 0.1);
          currentBackgroundY = lerp(currentBackgroundY, targetBackgroundY, 0.1);

          const scrollOffset = window.pageYOffset * 0.15;
          document.body.style.backgroundPosition = 
              `calc(50% + ${currentBackgroundX}px) calc(${-scrollOffset}px + ${currentBackgroundY}px)`;
      }
      requestAnimationFrame(updateParallax);
  }

  function handleMouseMove(e) {
      if (!isMouseOverCanvas) {
          const xPercentage = e.clientX / window.innerWidth;
          const yPercentage = e.clientY / window.innerHeight;
          targetBackgroundX = (xPercentage - 0.5) * maxMovement;
          targetBackgroundY = (yPercentage - 0.5) * maxMovement;
      }
  }

  function calculateTransform(scrollPosition, startPosition, endPosition) {
      const progress = Math.max(0, Math.min(1, 
          (scrollPosition - startPosition) / (endPosition - startPosition)));
      
      // Modified scale reduction for smoother transition
      const scale = Math.max(0.1, 1 - (progress * 0.9));
      // Faster opacity fade for earlier star transition
      const opacity = Math.max(0, 1 - (progress * 2.5));
      
      return { progress, scale, opacity };
  }

  function applyAnimation(element, scrollPosition, startScroll, endScroll) {
      if (!element) return;
      
      const { progress, scale, opacity } = calculateTransform(scrollPosition, startScroll, endScroll);
      const elementClass = Array.from(element.classList)[0];
      const exitPos = exitPositions[elementClass];
      
      const screenHeight = window.innerHeight;
      
      const getResponsiveValue = (baseValue) => {
          if (screenHeight < 700) return baseValue * 0.6;  
          if (screenHeight < 900) return baseValue * 0.8; 
          if (screenHeight < 1080) return baseValue;       
          return baseValue * 1.2;                       
      };
      
      // Enhanced exit animation with stronger acceleration
      const accelerationFactor = Math.pow(progress, 1.8);
      const exitX = exitPos.x * accelerationFactor;
      const exitY = exitPos.y * accelerationFactor;
      
      // Earlier star appearance with smooth scaling
      const circle = circles[elementClass];
      if (circle) {
          const rect = element.getBoundingClientRect();
          circle.style.left = `${rect.left + (rect.width / 2)}px`;
          circle.style.top = `${rect.top + (rect.height)}px`;
          
          // Start showing stars at 40% progress
          const starProgress = progress > 0.4 ? ((progress - 0.4) * 1.67) : 0;
          circle.style.opacity = starProgress;
          circle.style.transform = `scale(${starProgress * 1.5})`;
      }
      
      // Apply transforms
      let baseTransform = '';
      if (element.classList.contains('container')) {
          let yOffset = getResponsiveValue(-160);
          if (screenHeight < 700) yOffset = getResponsiveValue(-100);
          baseTransform = `translate(-50%, ${yOffset}%)`;
      } else if (element.classList.contains('typing-block') || 
                 element.classList.contains('typing-block-3') ||
                 element.classList.contains('registration-blue')) {
          baseTransform = 'translateX(-50%)';
      } else if (element.classList.contains('feed')) {
          let yOffset = getResponsiveValue(10);
          if (screenHeight < 900) yOffset = getResponsiveValue(30);
          if (screenHeight < 700) yOffset = getResponsiveValue(70);
          baseTransform = `translate(-50%, ${yOffset}%)`;
      }
      
      element.style.transform = `${baseTransform} 
          translate(${exitX}px, ${exitY}px) 
          scale(${scale})`;
      element.style.opacity = opacity.toString();
  }

  function handleScroll() {
      const scrollPosition = window.pageYOffset;
      
      const typingStartScroll = 0;
      const typingEndScroll = 200;
      const registrationStartScroll = 100;
      const registrationEndScroll = 400;
      const containerStartScroll = 200;
      const containerEndScroll = 500;
      const feedStartScroll = 500;
      const feedEndScroll = 1000;

      applyAnimation(typingBlock, scrollPosition, typingStartScroll, typingEndScroll);
      applyAnimation(typingBlock3, scrollPosition, typingStartScroll, typingEndScroll);
      applyAnimation(registrationBlue, scrollPosition, registrationStartScroll, registrationEndScroll);
      applyAnimation(container, scrollPosition, containerStartScroll, containerEndScroll);
      applyAnimation(feed, scrollPosition, feedStartScroll, feedEndScroll);

      if (tryFreeButton) {
          if (scrollPosition > 600) {
              tryFreeButton.classList.add('visible');
          } else {
              tryFreeButton.classList.remove('visible');
          }
      }

      lastScrollTop = scrollPosition;
  }

  // Add smooth transitions
  [typingBlock, typingBlock3, registrationBlue, container, feed].forEach(element => {
      if (element) {
          element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
          element.style.willChange = 'transform, opacity';
      }
  });

  function handleMouseLeave() {
      targetBackgroundX = 0;
      targetBackgroundY = 0;
  }

  // Event listeners for parallax
  if (canvasContainer) {
      canvasContainer.addEventListener('mouseenter', () => {
          isMouseOverCanvas = true;
          targetBackgroundX = 0;
          targetBackgroundY = 0;
      });

      canvasContainer.addEventListener('mouseleave', () => {
          isMouseOverCanvas = false;
      });
  }

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', handleMouseLeave);

  // Throttled scroll handler
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

  // Initialize animations
  updateParallax();
  handleScroll();
});
//---------------------------------------------------INIT------------------------------------------------------------//
  document.addEventListener('DOMContentLoaded', () => {
    initPhysics();
    initTextAnimation();
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
  
//---------------------------------------------------BACKGROUND------------------------------------------------------------//
