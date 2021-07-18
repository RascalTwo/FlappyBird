import kaboom from "https://kaboomjs.com/lib/0.5.1/kaboom.mjs";

/** Types of ground */
const GROUND_TYPES = ['grass', 'snow'];
/** Colors of Pipes */
const PIPE_COLORS = ['red', 'yellow', 'green', 'blue'];

/** @type {import('kaboom').KaboomCtx} */
const k = kaboom({
	canvas: document.querySelector('canvas'),
	width: window.innerWidth,
	height: window.innerHeight - 25,
	clearColor: [0, 0, 0, 0.90]
});

/** localStorage-based high score */
const highScore = (() => {
	let highScore = Number(window.localStorage.getItem('high-score') || '0');
	return {
		/**
		 * Set high score to {@link score}
		 *
		 * @param {number} score
		 */
		set: (score) => {
			highScore = score;
			window.localStorage.setItem('high-score', score)
		},
		/**
		 * Get current {@link highScore}
		 *
		 * @returns {number}
		 */
		get: () => highScore
	}
})();

/**
 * Generate random float between {@link min} and {@link max}
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
 const randomBetween = (min, max) => Math.random() * (max - min) + min;

/**
 * Choose random element from {@link arr array}
 *
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
const randomFrom = arr => arr[Math.floor(randomBetween(0, arr.length))];

k.scene('gameplay', () => {
	/** Scale of all sprites */
	const SPRITE_SCALE = 3;
	/** Horizontal speed of spites */
	const X_SPEED = k.width() / 5;
	/** Scale of pipes, less then sprite scale */
	const PIPE_SCALE = SPRITE_SCALE / 2;
	/** Diameter of opening for player to fly through */
	const OPENING_DIAMETER = k.height() / 3.5;
	/** Vertical distance gained when jumping */
	const JUMP_POWER = OPENING_DIAMETER * 1.5;


	k.layers([
		'background',
		'entities',
		'ui'
	], 'entities');

	/** Score UI component */
	const score = (() => {
		let score = 0;
		/** Generate text for UI component */
		const generateText = () => `${score}/${highScore.get()}`
		/** @type {import("kaboom").GameObj & import("kaboom").PosComp & import("kaboom").TextComp & import("kaboom").LayerComp} */
		const text = k.add([
			// Top-left corner
			k.pos(k.width() / 50, k.height() / 50),
			k.text(generateText(), 32),
			k.layer('ui'),
		]);

		return {
			/** Get {@link score} */
			get: () => score,
			/** Increment {@link score} and {@link highScore} if applicable */
			increment: () => {
				score++;
				if (score > highScore.get()) highScore.set(score);
				text.text = generateText();
			}
		}
	})();

	/** Player entity */
	const player = (() => {
		/** @type {import("kaboom").GameObj & import("kaboom").SpriteComp & import("kaboom").ScaleComp & import("kaboom").OriginComp & import("kaboom").PosComp & import("kaboom").BodyComp & import("kaboom").RotateComp & import("kaboom").LayerComp} */
		const player = k.add([
			k.sprite('bird'),
			k.scale(SPRITE_SCALE),
			k.origin('center'),
			k.pos(k.width() / 5, k.height() / 2),
			k.body(),
			k.rotate(0),
			k.layer('entities')
		])
		player.play('flap');

		/** Jump by {@link JUMP_POWER} */
		const jump = () => player.jump(JUMP_POWER);
		k.keyPress('space', jump);
		k.mouseClick(jump);

		// Collision events
		const endGame = () => k.go('gameover', score.get())
		player.collides('ground', endGame);
		player.collides('pipe', endGame)

		// Rotate player when jumping/falling
		let lastY = player.pos.y;
		player.on('update', () => {
			const y = player.pos.y
			// If change is little, no angle, otherwise angle down or up
			if (Math.abs(lastY - y) < k.height() / 500) player.angle = 0
			else player.angle = (-3.14/6) * (lastY > y ? -1 : 1);
			lastY = y;

			// Disallow flying over pipes
			if (y <= 0) endGame();
		});

		return player;
	})();

	let spawnedPipes = 0;

	/** Y position of top of ground */
	const groundTopY = (() => {
		/**
		 * @typedef GroundObj
		 * @type {import("kaboom").GameObj & import("kaboom").SpriteComp & import("kaboom").ScaleComp & import("kaboom").PosComp & import("kaboom").OriginComp & import("kaboom").LayerComp & { type: string, variation: number}}
		 */
		/** @type {GroundObj[]} */
		const grounds = [];
		let typeIndex = 0;

		/**
		 * Generate next ground tile of {@link type} after {@link lastGround}
		 *
		 * @param {GroundObj | null} lastGround
		 * @param {'grass' | 'snow'} type
		 */
		const generateNextGround = (lastGround, type) => {
			// X either leftmost or after the last ground
			const x = lastGround
				? lastGround.pos.x + (lastGround.width * lastGround.scale.x)
				: 0;

			// Variation number, must be only one variation different from the current variation
			const possibleVariations = lastGround
				? [Math.max(0, lastGround.variation - 1), Math.min(3, lastGround.variation + 1)]
				: [0, 1, 2, 3];
			const variation = randomFrom(possibleVariations);

			/** @type {GroundObj} */
			const ground = k.add([
				k.sprite('ground'),
				k.scale(SPRITE_SCALE),
				k.pos(x, k.height()),
				k.origin('botleft'),
				k.layer('entities'),
				'ground',
				{ type, variation }
			])
			ground.play(`${type}${variation}`);
			grounds.push(ground);
		}

		// Fill up empty ground with all sprites
		while (true){
			const lastGround = grounds.slice(-1)[0];
			generateNextGround(lastGround, GROUND_TYPES[typeIndex]);
			if (lastGround && lastGround.pos.x > k.width()) break;
		}

		// Move grounds left, and remove/readd them when neccessary.
		k.action('ground', (ground) => {
			ground.move(-X_SPEED, 0);
			if (ground.pos.x + (ground.width * ground.scale.x) >= 0) return;
			// TODO - reuse instead of destroying and recreating
			k.destroy(grounds.shift());
			if (!typeIndex && spawnedPipes >= highScore.get()) typeIndex = 1;
			generateNextGround(grounds.slice(-1)[0], GROUND_TYPES[typeIndex]);
		});

		return grounds[0].pos.y - (grounds[0].height * grounds[0].scale.y);
	})();

	// Generate infinite backgrounds
	(() => {
		const sprite = k.sprite('background');
		[0, 1].forEach(i => k.add([
			k.sprite('background'),
			k.pos(i * k.width(), 0),
			k.origin('topleft'),
			k.scale(k.width() / sprite.width, groundTopY / sprite.height),
			k.layer('background'),
			'background'
		]));

		k.action('background', (bg) => {
			bg.move(-X_SPEED, 0);
			if (bg.pos.x < -k.width()) bg.pos.x = 1 * k.width();
		});
	})();

	(() => {
		/**
		 * @typedef PipeObj
		 * @type {import("kaboom").SpriteComp & import("kaboom").GameObj & import("kaboom").ScaleComp & import("kaboom").OriginComp & import("kaboom").PosComp & import("kaboom").LayerComp}
		 */
		/**
		 * @typedef PipeDetectorObj
		 * @type {PipeObj & { color: string, passed: boolean }}
		 */
		const { MIN_Y, MAX_Y, WIDTH } = (() => {
			const piece = k.sprite('pipe');
			const MIN_Y = piece.height * PIPE_SCALE;
			const MAX_Y = groundTopY - (piece.height * PIPE_SCALE);
			return { MIN_Y, MAX_Y, WIDTH: piece.width * PIPE_SCALE }
		})();

		/** @type {[PipeObj, PipeObj, PipeObj, PipeObj, PipeDetectorObj]} */
		const pipes = [];
		const addPipe = (color, x, y) => {
			const topY = Math.max(MIN_Y, y - OPENING_DIAMETER/2);
			const baseTop = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE, (MIN_Y + topY - (MIN_Y * 2)) * 0.05),
				k.origin('top'),
				k.pos(x, 0),
				k.layer('entities'),
				'pipe'
			]);
			baseTop.play(`${color}Middle`);

			const top = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE),
				k.origin('bot'),
				k.pos(x, topY),
				k.layer('entities'),
				'pipe'
			])
			top.play(`${color}Bottom`);


			const bottomY = Math.min(MAX_Y, y + OPENING_DIAMETER/2);
			const baseBottom = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE, (MAX_Y-bottomY) * 0.05),
				k.origin('bot'),
				k.pos(x, MAX_Y + MIN_Y),
				k.layer('entities'),
				'pipe'
			]);
			baseBottom.play(`${color}Middle`);

			const bottom = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE),
				k.origin('top'),
				k.pos(x, bottomY),
				k.layer('entities'),
				'pipe'
			])
			bottom.play(`${color}Top`);

			const detector = k.add([
				k.pos(x, y),
				k.scale(PIPE_SCALE),
				k.layer('entities'),
				'pipe',
				'pipe-detector',
				{ color, passed: false }
			])

			pipes.push([baseTop, top, baseBottom, bottom, detector]);
			spawnedPipes++;
		}

		// Move all pipes to the left
		k.action('pipe', (pipe) => {
			pipe.move(-X_SPEED, 0);
		});

		// Increment scre when passing pipes, and cleanup pipes
		k.action('pipe-detector', pipe => {
			const x = pipe.pos.x + (WIDTH * PIPE_SCALE/2);
			if (!pipe.passed && x < player.pos.x) {
				pipe.passed = true;
				score.increment()
				return;
			}
			if (pipe.passed && x < 0) pipes.shift().forEach(part => k.destroy(part));
		});

		// Spawn a pipe every 2 seconds
		k.loop(2, () => {
			// Color of last pipe, to prevent duplicate colored pipes
			const lastPipeColor = (pipes.slice(-1)[0] || [{ color: 1 }]).find(part => part.color).color;
			addPipe(
				randomFrom(PIPE_COLORS.filter(color => color !== lastPipeColor)),
				k.width() * 1.1,
				randomBetween(MIN_Y + OPENING_DIAMETER / 3, MAX_Y - OPENING_DIAMETER / 3)
			)
		})
	})();
});

// Gameover scene, just show the current and high score, allowing the
// game to be resumed with click/space input
k.scene('gameover', (score) => {
	k.add([
		k.text(`Current Score: ${score.toString().padStart(3, '0')}\nHigh Score   : ${highScore.get().toString().padStart(3, '0')}`, k.width() / 50),
		k.pos(k.width()/2, k.height()/2),
		k.origin('center')
	]);
	k.mouseClick(() => k.go('gameplay'))
	k.keyDown('space', () => k.go('gameplay'))
});


(async () => {
	await Promise.all([
		k.loadSprite('bird', `assets/Player/bird${Math.floor(randomBetween(1, 4))}.png`, {
			sliceX: 4,
			sliceY: 1,
			anims: {
				flap: {
					from: 0,
					to: 3
				}
			}
		}),
		k.loadSprite('background', `assets/Background/Background${Math.floor(randomBetween(1, 6))}.png`),
		k.loadSprite('pipe', 'assets/Tileset/pipes.png', {
			sliceX: 4,
			sliceY: 3,
			anims: [PIPE_COLORS]
				.map(colors => [colors, colors, colors].flat())
				.flat()
				.reduce((obj, color, i) => ({
					...obj,
					[`${color}${['Top', 'Middle', 'Bottom'][Math.floor(i / 4)]}`]: { from: i, to: i }
				}), {})
		}),
		k.loadSprite('ground', 'assets/Tileset/ground.png', {
			sliceX: 8,
			sliceY: 1,
			anims: [GROUND_TYPES]
				.map(type => [type, type, type, type].flat())
				.flat()
				.sort()
				.reduce((obj, type, i) => ({
					...obj,
					[`${type}${i % 4}`]: { from: i, to: i }
				}), {})
		}),
	]);
	k.start('gameplay');
})().catch(console.error);
