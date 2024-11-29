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
          damping: 0.1,
          render: {
              visible: false,
          }
      }
  });

  // Track mouse state
  let isMouseInContainer = false;
  let isDragging = false;

  // Store the original mouse position update function
  const originalMousePositionUpdate = mouse.mouseup.bind(mouse);

  // Override mouse position update
  mouse.mouseup = function() {
      if (!isMouseInContainer) {
          // If outside container, release the constraint
          mouseConstraint.constraint.bodyB = null;
          isDragging = false;
          return;
      }
      originalMousePositionUpdate();
  };

  // Mouse enter handler
  container.addEventListener('mouseenter', () => {
      isMouseInContainer = true;
  });

  container.addEventListener('mouseleave', () => {
      isMouseInContainer = false;
      if (isDragging) {
          // Smoothly release the constraint
          mouseConstraint.constraint.stiffness = 0.0001;
          setTimeout(() => {
              mouseConstraint.constraint.bodyB = null;
              mouseConstraint.constraint.stiffness = 0.1;
              isDragging = false;
          }, 50);
      }
  });

  // Handle mouse events for dragging
  render.canvas.addEventListener('mousedown', () => {
      if (isMouseInContainer) {
          isDragging = true;
      }
  });

  render.canvas.addEventListener('mouseup', () => {
      isDragging = false;
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
      
      if (isMouseInContainer && !isDragging) {
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

  // Handle window resize
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
      "Транскрибация в аудиотекст",
      "Перевод в аудиотекст",
      "Конвертация в аудиотекст",
      "Преобразование в аудиотекст",
      "Транскрипция в аудиотекст",
      "Расшифровка в аудиотекст"
  ];

  class SpringElement {
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
              
              if (distance < 300 && distance > 5) {
                  const angle = Math.atan2(dy, dx);
                  const force = (50 - distance) / 8;
                  this.x = Math.cos(angle) * force;
                  this.y = Math.sin(angle) * force;
              }
          } else {
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
  let springElements = [];
  let isHovered = false;
  let mouseX = 0;
  let mouseY = 0;

  function updateSpringAnimation() {
      springElements.forEach(element => {
          element.update(mouseX, mouseY, isHovered);
      });
      requestAnimationFrame(updateSpringAnimation);
  }

  return () => {
      const typingBlock = document.querySelector('.typing-block');
      const typingText = document.getElementById('typing-text');
      const cursorElement = document.getElementById('cursor');

      if (!typingBlock || !typingText || !cursorElement) return;

      springElements = [new SpringElement(typingBlock)];

      function typePhrase() {
        const currentPhrase = phrases[phraseIndex];
        const mainWord = currentPhrase.split(" в ")[0];
        const suffix = " в аудиотекст";
    
        if (!isDeleting && charIndex <= currentPhrase.length) {
            if (charIndex <= mainWord.length) {
                typingText.innerHTML = currentPhrase.substring(0, charIndex);
            } else {
                const suffixProgress = charIndex - mainWord.length;
                typingText.innerHTML = mainWord + 
                    `<span class="suffix">${suffix.substring(0, suffixProgress)}</span>`;
            }
            charIndex++;
    
            if (charIndex > currentPhrase.length) {
                setTimeout(() => {
                    isDeleting = true;
                    typePhrase();
                }, 2000);
                return;
            }
        } else if (isDeleting) {
            if (charIndex <= mainWord.length) {
                typingText.innerHTML = mainWord.substring(0, charIndex);
            } else {
                const suffixProgress = charIndex - mainWord.length;
                typingText.innerHTML = mainWord + 
                    `<span class="suffix">${suffix.substring(0, suffixProgress)}</span>`;
            }
            charIndex--;
    
            if (charIndex === -1) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(() => typePhrase(), 500);
                return;
            }
        }
    
        const delay = isDeleting ? 50 : 100;
        setTimeout(() => typePhrase(), delay);
    }

      let cursorVisible = true;
      function blinkCursor() {
          cursorVisible = !cursorVisible;
          cursorElement.style.visibility = cursorVisible ? 'visible' : 'hidden';
      }
      setInterval(blinkCursor, 530);

      typingBlock.addEventListener('mousemove', (e) => {
          mouseX = e.clientX;
          mouseY = e.clientY;
      });

      typingBlock.addEventListener('mouseenter', () => {
          isHovered = true;
      });

      typingBlock.addEventListener('mouseleave', () => {
          isHovered = false;
      });

      requestAnimationFrame(typePhrase);
      requestAnimationFrame(updateSpringAnimation);
  };
})();


//---------------------------------------------------PARALAX------------------------------------------------------------//

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  window.history.scrollRestoration = 'manual';
  const header = document.querySelector('.header');
  const container = document.querySelector('.container');
  const feed = document.querySelector('.feed');
  const tryFreeButton = document.querySelector('.try-free');
  const canvasContainer = document.querySelector('#canvas-container');
  const typingBlock = document.querySelector('.typing-block');
  const typingBlock3 = document.querySelector('.typing-block-3');
  const registrationBlue = document.querySelector('.registration-blue');
  
  let lastScrollTop = 0;
  let isMouseOverCanvas = false;
  
  // Parallax variables
  const maxMovement = 8;
  let currentBackgroundX = 0;
  let currentBackgroundY = 0;
  let targetBackgroundX = 0;
  let targetBackgroundY = 0;
  
  const totalScrollHeight = window.innerHeight * 2;
  document.body.style.height = `${totalScrollHeight}px`;
  
  // Modified exit positions for more dramatic downward movement
  const exitPositions = {
    'header': {x: 550, y: 350 },
    'typing-block': { x: -150, y: 450 },
    'typing-block-3': { x: 150, y: 450 },
    'registration-blue': { x: -200, y: 350 },
    'container': { x: 200, y: 550 },
    'feed': { x: 400, y: 650 }
};

// Create only one star for the feed
const circles = {};
Object.keys(exitPositions).forEach(elementClass => {
    if (elementClass !== 'feed') {  // Create circles for non-feed elements
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
    }
});

// Create a single star for the feed
const feedStar = document.createElement('div');
feedStar.className = 'exit-circle';
feedStar.style.cssText = `
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
document.body.appendChild(feedStar);

  function lerp(start, end, factor) {
      return start + (end - start) * factor;
  }

  function updateParallax() {
    if (!isMouseOverCanvas) {
        currentBackgroundX = lerp(currentBackgroundX, targetBackgroundX, 0.1);
        currentBackgroundY = lerp(currentBackgroundY, targetBackgroundY, 0.1);

        const scrollOffset = window.pageYOffset * 0.08; // Reduced from 0.15
        document.body.style.backgroundPosition = 
            `calc(50% + ${currentBackgroundX}px) calc(${-scrollOffset}px + ${currentBackgroundY}px)`;
    }
    requestAnimationFrame(updateParallax);
}

function handleMouseMove(e) {
    if (!isMouseOverCanvas) {
        const xPercentage = e.clientX / window.innerWidth;
        const yPercentage = e.clientY / window.innerHeight;
        // Added easing to mouse movement
        targetBackgroundX = (xPercentage - 0.5) * maxMovement * 1;
        targetBackgroundY = (yPercentage - 0.5) * maxMovement * 1;
    }
}

  function calculateTransform(scrollPosition, startPosition, endPosition) {
    // Ensure proper progress calculation over the full scroll range
    const progress = Math.max(0, Math.min(1, 
        (scrollPosition - startPosition) / (endPosition - startPosition)
    ));
    
    // Adjusted scale and opacity calculations
    const scale = Math.max(0.1, 1 - progress);
    const opacity = Math.max(0, 1 - progress);
    
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

    if (elementClass === 'feed') {
      const feedImages = Array.from(element.querySelectorAll('img'));
      const totalImages = feedImages.length;
      const delayBetweenItems = 0.1;

      feedImages.forEach((img, index) => {
        const delayedProgress = Math.min(1, Math.max(0, 
          (progress * 1.6) - (index * delayBetweenItems)
      ));
          const itemScale = Math.max(0.1, 1 - (delayedProgress * 0.8));
          // Adjusted opacity calculation to ensure complete fade out
          const itemOpacity = Math.max(0, Math.min(1, 2 - (delayedProgress * 2)));
          
          const accelerationFactor = Math.pow(delayedProgress, 2);
          const exitX = exitPos.x * accelerationFactor;
          const exitY = exitPos.y * accelerationFactor;

          img.style.transform = `
              translate3d(${exitX}px, ${exitY}px, 0)
              scale(${itemScale})
              rotateX(15deg)
          `;
          img.style.transformOrigin = 'bottom center';
          img.style.opacity = itemOpacity.toString();
          
          if (index === totalImages - 1) {
              const rect = img.getBoundingClientRect();
              feedStar.style.left = `${rect.left + (rect.width / 2)}px`;
              feedStar.style.top = `${rect.top + rect.height}px`;
              
              const starProgress = delayedProgress > 0.6 ? ((delayedProgress - 0.6) * 1.67) : 0;
              feedStar.style.opacity = starProgress;
              feedStar.style.transform = `scale(${starProgress * 2.5})`;
          }
      });

      // Apply base transform to feed container with perspective
      let yOffset = getResponsiveValue(10);
      if (screenHeight < 900) yOffset = getResponsiveValue(30);
      if (screenHeight < 700) yOffset = getResponsiveValue(70);
      
      element.style.transform = `translate(-50%, ${yOffset}%) rotateX(15deg)`;
  } else {
        // Original animation code for non-feed elements
        const accelerationFactor = Math.pow(progress, 1.8);
        const exitX = exitPos.x * accelerationFactor;
        const exitY = exitPos.y * accelerationFactor;
        
        const circle = circles[elementClass];
        if (circle) {
            const rect = element.getBoundingClientRect();
            circle.style.left = `${rect.left + (rect.width / 2)}px`;
            circle.style.top = `${rect.top + rect.height}px`;
            
            const starProgress = progress > 0.4 ? ((progress - 0.4) * 1.67) : 0;
            circle.style.opacity = starProgress;
            circle.style.transform = `scale(${starProgress * 1.5})`;
        }
        
        let baseTransform = '';
        if (element.classList.contains('container')) {
            let yOffset = getResponsiveValue(-160);
            if (screenHeight < 700) yOffset = getResponsiveValue(-100);
            baseTransform = `translate(-50%, ${yOffset}%)`;
        } else if (element.classList.contains('typing-block') || 
                  element.classList.contains('typing-block-3') ||
                  element.classList.contains('registration-blue')) {
            baseTransform = 'translateX(-50%)';
        }
        
        element.style.transform = `${baseTransform} 
            translate(${exitX}px, ${exitY}px) 
            scale(${scale})`;
        element.style.opacity = opacity.toString();
    }
}

const feedImages = document.querySelectorAll('.feed img');
    feedImages.forEach(img => {
        img.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        img.style.willChange = 'transform, opacity';
    });

  function handleScroll() {
      const scrollPosition = window.pageYOffset;
      
      const headerStartScroll = 0;
      const headerEndScroll = 300;
      const typingStartScroll = 50;
      const typingEndScroll = 200;
      const registrationStartScroll = 100;
      const registrationEndScroll = 400;
      const containerStartScroll = 200;
      const containerEndScroll = 500;
      const feedStartScroll = 100;
      const feedEndScroll = 2200;

      applyAnimation(header, scrollPosition, headerStartScroll, headerEndScroll);
      applyAnimation(typingBlock, scrollPosition, typingStartScroll, typingEndScroll);
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
  let lastScrollPosition = window.pageYOffset;
  let scrollTimeout;

  // Throttled scroll handler
 window.addEventListener('scroll', () => {
    // Clear any pending timeouts
    clearTimeout(scrollTimeout);
    
    // Update scroll position immediately
    handleScroll();
    
    // Set a timeout to ensure smooth movement after rapid scrolling
    scrollTimeout = setTimeout(() => {
      const currentPosition = window.pageYOffset;
      if (currentPosition !== lastScrollPosition) {
        handleScroll();
        lastScrollPosition = currentPosition;
      }
    }, 50);
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
