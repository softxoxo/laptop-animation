async function initPhysics() {
	// Wait for all images to load
	const imgElements = Array.from(document.querySelectorAll('.svg-sprites img'));
	await Promise.all(imgElements.map(img => {
		return new Promise((resolve) => {
			if (img.complete) resolve();
			img.onload = () => resolve();
			img.onerror = () => resolve(); // Skip failed loads
		});
	}));

	// Module aliases
	const Engine = Matter.Engine,
		Render = Matter.Render,
		Runner = Matter.Runner,
		Bodies = Matter.Bodies,
		Composite = Matter.Composite,
		Mouse = Matter.Mouse,
		MouseConstraint = Matter.MouseConstraint,
		Body = Matter.Body;

	// Create engine with reduced gravity
	const engine = Engine.create({
		gravity: {
			x: 0,
			y: 0.5
		}
	});
	const world = engine.world;

	// Create renderer
	const container = document.getElementById('canvas-container');
	const render = Render.create({
		element: container,
		engine: engine,
		options: {
			width: container.clientWidth,
			height: container.clientHeight,
			wireframes: false,
			background: 'transparent',
			pixelRatio: window.devicePixelRatio
		}
	});

	// Wall options
	const wallOptions = {
		isStatic: true,
		render: {
			visible: false
		},
		friction: 0,
		restitution: 0.7
	};

	// Create walls
	const ground = Bodies.rectangle(container.clientWidth / 2, container.clientHeight + 30, container.clientWidth, 60, wallOptions);
	const leftWall = Bodies.rectangle(-30, container.clientHeight / 2, 60, container.clientHeight, wallOptions);
	const rightWall = Bodies.rectangle(container.clientWidth + 30, container.clientHeight / 2, 60, container.clientHeight, wallOptions);

	// Create bodies for each SVG
	const bodies = imgElements.map((img, index) => {
		// Get natural dimensions of the image
		const width = img.naturalWidth || img.width;
		const height = img.naturalHeight || img.height;

		return Bodies.rectangle(
			50 + Math.random() * (container.clientWidth - 100),
			-100 - (index * 100),
			width,
			height,
			{
				render: {
					sprite: {
						texture: img.src,
						xScale: 1,
						yScale: 1
					}
				},
				restitution: 0.7,
				friction: 0.01,
				frictionAir: 0.005,
				density: 0.002, // Adjusted for better physics with actual sizes
				slop: 0,
				chamfer: { radius: 2 }
			}
		);
	});

	// Add mouse control
	const mouse = Mouse.create(render.canvas);
	const mouseConstraint = MouseConstraint.create(engine, {
		mouse: mouse,
		constraint: {
			stiffness: 0.1,
			render: {
				visible: false
			}
		}
	});

	// Add all bodies to the world
	Composite.add(world, [ground, leftWall, rightWall, ...bodies, mouseConstraint]);

	// Smooth mouse repulsion
	let lastMousePos = { x: 0, y: 0 };
	render.canvas.addEventListener('mousemove', (event) => {
		const mousePosition = {
			x: event.offsetX,
			y: event.offsetY
		};

		const mouseVelocity = {
			x: mousePosition.x - lastMousePos.x,
			y: mousePosition.y - lastMousePos.y
		};

		bodies.forEach(body => {
			const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mousePosition));
			if (distance < 100) {
				const force = Matter.Vector.mult(
					Matter.Vector.normalise(Matter.Vector.sub(body.position, mousePosition)),
					0.05 * (1 - distance/100) * Math.min(3, Math.sqrt(mouseVelocity.x * mouseVelocity.x + mouseVelocity.y * mouseVelocity.y))
				);
				Body.applyForce(body, body.position, force);
			}
		});

		lastMousePos = mousePosition;
	});

	// Responsive handling
	window.addEventListener('resize', () => {
		render.canvas.width = container.clientWidth;
		render.canvas.height = container.clientHeight;
		Matter.Body.setPosition(ground, { 
			x: container.clientWidth / 2,
			y: container.clientHeight + 30
		});
		Matter.Body.setPosition(rightWall, {
			x: container.clientWidth + 30,
			y: container.clientHeight / 2
		});
	});

	// Run the engine
	const runner = Runner.create({
		isFixed: true,
		delta: 1000/60
	});
	Runner.run(runner, engine);
	Render.run(render);

	// Reset fallen objects
	setInterval(() => {
		bodies.forEach(body => {
			if (body.position.y > container.clientHeight + 100) {
				Body.setPosition(body, {
					x: 50 + Math.random() * (container.clientWidth - 100),
					y: -100
				});
				Body.setVelocity(body, { x: 0, y: 0 });
				Body.setAngularVelocity(body, 0);
			}
		});
	}, 1000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPhysics);

//-------------------------------------------------------TEXT ANIMATION--------------------------------------------------//
const phrases = [
    "транскрибация",
    "перевод",
    "конвертация",
    "преобразование",
    "транскрипция",
	"расшифровка"
  ];
  
  const typingElement = document.getElementById('typing-text');
  const cursorElement = document.getElementById('cursor');
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  
  function typePhrase() {
    const currentPhrase = phrases[phraseIndex];
    
    if (!isDeleting && charIndex <= currentPhrase.length) {
      typingElement.textContent = currentPhrase.substring(0, charIndex);
      charIndex++;
      if (charIndex > currentPhrase.length) {
        setTimeout(() => {
          isDeleting = true;
          typePhrase();
        }, 10000); // Wait for 10 seconds before deleting
      } else {
        setTimeout(typePhrase, 100); // Typing speed
      }
    } else if (isDeleting && charIndex > 0) {
      typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      setTimeout(typePhrase, 50); // Deleting speed
    } else {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      charIndex = 0;
      setTimeout(typePhrase, 500); // Pause before typing next phrase
    }
  }
  
  // Cursor blinking effect
  function blinkCursor() {
    cursorElement.style.visibility = (cursorElement.style.visibility === 'visible') ? 'hidden' : 'visible';
  }
  
  setInterval(blinkCursor, 530); // Blink every 530ms for a more natural feel
  
  // Start the animation
  typePhrase();


  //----------------------------UPGRADE-ANIMATION ---------------------------------//
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
document.addEventListener('DOMContentLoaded', () => {
    initPhysics();
    initUpgradeAnimation();
});


//---------------------------------------FEED-ANIMTAION--------------------------//
document.addEventListener('DOMContentLoaded', () => {
	const feed = document.querySelector('.feed');
	const items = Array.from(feed.getElementsByTagName('img'));
	const itemHeight = 200; // Height of each item
	const spacing = -200; // No gap between items
	
	// Position items initially
	items.forEach((item, index) => {
		item.style.top = `${index * (itemHeight + spacing)}px`;
	});

	// Calculate total scroll range
	const totalHeight = items.length * (itemHeight + spacing);
	feed.style.height = `${totalHeight}px`;

	// Scroll handler
	window.addEventListener('scroll', () => {
		const scrollPosition = window.scrollY - feed.offsetTop;
		const viewportCenter = window.innerHeight / 2;
		
		items.forEach((item, index) => {
			// Calculate the ideal position for this item
			const itemScrollPosition = index * (itemHeight + spacing);
			
			// Calculate how far this item is from the center of the viewport
			const difference = scrollPosition - itemScrollPosition;
			
			if (difference > -window.innerHeight && difference < window.innerHeight) {
				// Only scale down items above the current main item
				const rect = item.getBoundingClientRect();
				const windowHeight = window.innerHeight;
				const elementTop = rect.top;
				const viewportPosition = elementTop / windowHeight;
            
            // Base transforms that create the ladder effect
            const scale = 1 + (viewportPosition * 0.2);
				
				// Calculate vertical movement
				const move = Math.min(0, difference * 0.3);
				
				// Apply transformations
				item.style.transform = `
					translateY(${-move}px)
					scale(${scale})
					rotateX(15deg)
				`;
				
				// Adjust opacity for items above the current one
				const opacity = difference > 0 
					? Math.max(0.7, 1 - (difference / window.innerHeight) * 0.3)
					: 1;
				item.style.opacity = opacity;
			}
		});
	});

	// Trigger initial positioning
	window.dispatchEvent(new Event('scroll'));
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