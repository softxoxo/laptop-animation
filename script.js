
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
        "Транскрибация аудио в текст",
        "Перевод аудио в текст",
        "Конвертация аудио в текст",
        "Преобразование аудио в текст",
        "Транскрипция аудио в текст",
        "Расшифровка аудио в текст"
    ];

    class SpringElement {
        constructor(element) {
            this.element = element;
            this.x = 0;
            this.y = 0;
            this.velX = 0;
            this.velY = 0;
            this.springConstant = 0.2;
            this.friction = 0.9;
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

    function createLetterSpan(char) {
        const span = document.createElement('span');
        span.textContent = char;
        
        if (char === ' ') {
            span.style.display = 'inline';
            span.style.marginRight = '0.15em'; // Adds space between words
        } else {
            span.style.display = 'inline-block';
            span.style.position = 'relative';
        }
        
        return span;
    }

    function wrapLettersInSpans(text) {
        return [...text].map(char => {
            const span = createLetterSpan(char);
            return span;
        });
    }

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

        function updateSpringElements() {
            springElements = [];
            typingText.querySelectorAll('span').forEach(span => {
                springElements.push(new SpringElement(span));
            });
        }

        function typePhrase() {
            const currentPhrase = phrases[phraseIndex];
            const mainWord = currentPhrase.split(" аудио ")[0];
            const suffix = " аудио в текст";

            if (!isDeleting && charIndex <= currentPhrase.length) {
                if (charIndex <= mainWord.length) {
                    typingText.innerHTML = '';
                    const letterSpans = wrapLettersInSpans(mainWord.substring(0, charIndex));
                    letterSpans.forEach(span => typingText.appendChild(span));
                } else {
                    const suffixProgress = charIndex - mainWord.length;
                    typingText.innerHTML = '';
                    
                    const mainLetterSpans = wrapLettersInSpans(mainWord);
                    mainLetterSpans.forEach(span => typingText.appendChild(span));
                    
                    const suffixSpan = document.createElement('span');
                    suffixSpan.className = 'suffix';
                    const suffixLetterSpans = wrapLettersInSpans(suffix.substring(0, suffixProgress));
                    suffixLetterSpans.forEach(span => suffixSpan.appendChild(span));
                    typingText.appendChild(suffixSpan);
                }
                
                updateSpringElements();
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
                    typingText.innerHTML = '';
                    const letterSpans = wrapLettersInSpans(mainWord.substring(0, charIndex));
                    letterSpans.forEach(span => typingText.appendChild(span));
                } else {
                    const suffixProgress = charIndex - mainWord.length;
                    typingText.innerHTML = '';
                    
                    const mainLetterSpans = wrapLettersInSpans(mainWord);
                    mainLetterSpans.forEach(span => typingText.appendChild(span));
                    
                    const suffixSpan = document.createElement('span');
                    suffixSpan.className = 'suffix';
                    const suffixLetterSpans = wrapLettersInSpans(suffix.substring(0, suffixProgress));
                    suffixLetterSpans.forEach(span => suffixSpan.appendChild(span));
                    typingText.appendChild(suffixSpan);
                }
                
                updateSpringElements();
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

//---------------------------------------------------BG-MOVE------------------------------------------------------------//

const bgMove = () => {
  window.scrollTo(0, 0);
  window.history.scrollRestoration = 'manual';
  const canvasContainer = document.querySelector('#canvas-container');
  
  let lastScrollTop = 0;
  let isMouseOverCanvas = false;
  
  // Parallax variables
  const maxMovement = 8;
  let currentBackgroundX = 0;
  let currentBackgroundY = 0;
  let targetBackgroundX = 0;
  let targetBackgroundY = 0;


  function lerp(start, end, factor) {
      return start + (end - start) * factor;
  }

  function updateParallax() {
    if (!isMouseOverCanvas) {
        currentBackgroundX = lerp(currentBackgroundX, targetBackgroundX, 0.1);
        currentBackgroundY = lerp(currentBackgroundY, targetBackgroundY, 0.1);

        const scrollOffset = window.pageYOffset * 0.02; 
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

  updateParallax();
}
  
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
  
//---------------------------------------------------INIT-ANIMATIONS------------------------------------------------------------//
const initAnimations = () => {
    const container = document.querySelector('.container');
    const laptop = document.querySelector('.laptop');
    const canvasContainer = document.querySelector('#canvas-container');
    const header = document.querySelector('.header');
    const typingBlock = document.querySelector('.typing-block');
    const typingBlock2 = document.querySelector('.typing-block-2');
    const registrationBlue = document.querySelector('.registration-blue');
    const feed = document.querySelector('.feed');
    const tryFreeButton = document.querySelector('.try-free');

    // Reset scroll position on page load
    window.scrollTo(0, 0);

    // Initial animation for container
    container.offsetHeight;
    container.style.transition = 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1.4s ease-out';
    container.style.transform = 'scale(1)';
    container.style.opacity = '1';

    const endPositions = {
        header: {x: 550, y: 350},
        typingBlock: {x: 400, y: 50},
        registration: {x: -400, y: 50},
        container: {x: 200, y: 550},
        feed: {x: 400, y: 600}
    };

    const scrollRanges = {
        header: { start: 0, end: 1000 },
        typingBlock: { start: 200, end: 1200 },
        registration: { start: 300, end: 1400 },
        container: { start: 1100, end: 1400 },
        feed: { start: 1800, end: 3000 }
    };

    const baseSpeed = 0.15;
    const scrollSpeed = baseSpeed * 7;

    const calculateProgress = (currentScroll, start, end) => {
        if (currentScroll < start) return 0;
        if (currentScroll > end) return 1;
        return (currentScroll - start) / (end - start);
    };

    const initializeTransitions = (element) => {
        element.style.transition = `
            transform 0.3s ease-out,
            opacity 0.3s ease-out,
            width 0.3s ease-out,
            height 0.3s ease-out,
            border-radius 0.3s ease-out,
            background-color 0.3s ease-in 0.1s,
            box-shadow 0.3s ease-in 0.1s
        `;
    
        Array.from(element.children).forEach(child => {
            child.style.transition = 'opacity 0.3s ease-out';
        });
    };
    
    const updateElement = (element, scrollPosition, range, endPos) => {
        if (!element.style.transition) {
            initializeTransitions(element);
        }
    
        const progress = calculateProgress(scrollPosition, range.start, range.end);
        const baseScroll = scrollPosition * scrollSpeed;
        const TRANSITION_POINT = 0.9672727272727273;
    if (element.classList.contains('container')) {
        console.log(progress);
    }
        if (progress < 0.999999 && progress > 0.66 ) {
            // First set opacity to 0
            element.style.opacity = '0';
            
            setTimeout(() => {
                // Apply normal styles after fade out
                element.style.backgroundColor = '';
                element.style.boxShadow = 'none';
                const scale = Math.max(0.01, 1 - progress);
                const xOffset = endPos.x * progress;
                const yOffset = baseScroll;
    
                if (element.classList.contains('registration-blue')) {
                    element.textContent = 'При регистрации дарим 30 минут!';
                }
                element.style.width = '';
                element.style.height = '';
                element.style.borderRadius = '0';
                Array.from(element.children).forEach(child => {
                    child.style.opacity = '1';
                });
                element.style.transform = `translate(${xOffset}px, ${yOffset}px) scale(${scale})`;
                
                // Fade back in
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 300);
            }, 500);
        } else if (progress === 0) {
            element.style.transform = `translateY(${baseScroll}px)`;
            if (element.classList.contains('feed')) {
                element.style.transform = `translateY(${scrollPosition * (scrollSpeed - 0.3)}px)`;
            }
            element.style.opacity = '1';
            element.style.width = '';
            element.style.height = '';
            element.style.borderRadius = '0';
            element.style.backgroundColor = '';
            element.style.boxShadow = 'none';
            
            Array.from(element.children).forEach(child => {
                child.style.opacity = '1';
            });
    
            if (element.classList.contains('registration-blue')) {
                const textSpan = element.querySelector('span');
                if (textSpan) {
                    textSpan.textContent = 'Registration';
                }
            }
        } else if (progress > 0.999) {
            // Star state
            element.style.opacity = '0';
            
            const xOffset = endPos.x;
            const yOffset = (range.start + (range.end - range.start)) * scrollSpeed + (endPos.y);
            
            setTimeout(() => {
                element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
                element.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                element.style.boxShadow = `
                    0 0 15px 2px rgba(255, 255, 255, 0.95),
                    0 0 30px 4px rgba(255, 255, 255, 0.7),
                    0 0 45px 6px rgba(255, 255, 255, 0.4)
                `;
                element.style.width = '4px';
                element.style.height = '4px';
                element.style.borderRadius = '50%';
                
                if (element.classList.contains('registration-blue')) {
                    element.textContent = '';
                }
                
                Array.from(element.children).forEach(child => {
                    child.style.opacity = '0';
                });
                
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 300);
            }, 500);
        } else {
            element.style.opacity = '0';
            element.style.backgroundColor = '';
            element.style.boxShadow = 'none';
            const scale = Math.max(0.01, 1 - progress);
            const xOffset = endPos.x * progress;
            const yOffset = baseScroll;
    
            if (element.classList.contains('registration-blue')) {
                element.textContent = 'При регистрации дарим 30 минут!';
            }
            element.style.width = '';
            element.style.height = '';
            element.style.borderRadius = '0';
            Array.from(element.children).forEach(child => {
                child.style.opacity = '1';
            });
            element.style.transform = `translate(${xOffset}px, ${yOffset}px) scale(${scale})`;
            element.style.opacity = '1';
        }
    };

    const updateParallax = (scrollPosition) => {
        updateElement(header, scrollPosition, scrollRanges.header, endPositions.header);
        updateElement(typingBlock2, scrollPosition, scrollRanges.typingBlock, endPositions.typingBlock);
        updateElement(registrationBlue, scrollPosition, scrollRanges.registration, endPositions.registration);
        updateElement(container, scrollPosition, scrollRanges.container, endPositions.container);
        updateElement(feed, scrollPosition, scrollRanges.feed, endPositions.feed);
    };


    window.addEventListener('wheel', (event) => {

            updateParallax(window.scrollY);
        });

}
//---------------------------------------------------INIT------------------------------------------------------------//
document.addEventListener('DOMContentLoaded', () => {
    initAnimations();
    bgMove();
    initPhysics();
    initTextAnimation();
});
    