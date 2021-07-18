import kaboom from "https://kaboomjs.com/lib/0.5.1/kaboom.mjs";

const GROUND_TYPES = ['grass', 'snow'];
const PIPE_COLORS = ['red', 'yellow', 'green', 'blue'];

const CANVAS = document.querySelector('canvas');

/** @type {import('kaboom').KaboomCtx} */
const k = kaboom({
	canvas: CANVAS,
	width: window.innerWidth,
	height: window.innerHeight - 25,
	clearColor: [0, 0, 0, 0.90]
});

const highScore = (() => {
	let highScore = Number(window.localStorage.getItem('high-score') || '0');
	return {
		set: (score) => {
			highScore = score;
			window.localStorage.setItem('high-score', score)
		},
		get: () => highScore
	}
})();

/**
 * Generate random float between two numbers
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
 const randomBetween = (min, max) => Math.random() * (max - min) + min;

/**
	* Choose random element from array
	*
	* @param {any[]} arr
	* @returns {any}
	*/
const randomFrom = arr => arr[Math.floor(randomBetween(0, arr.length))];

k.scene('gameplay', () => {
	const SPRITE_SCALE = 3;
	const X_SPEED = k.width() / 5;
	const PIPE_SCALE = SPRITE_SCALE / 2;
	const OPENING_DIAMETER = k.height() / 3.5;
	const JUMP_POWER = OPENING_DIAMETER * 1.5;


	k.layers([
		'background',
		'entities',
		'ui'
	], 'entities');

	const score = (() => {
		let score = 0;
		const generateText = () => `${score}/${highScore.get()}`
		const text = k.add([
			k.pos(k.width() / 50, k.height() / 50),
			k.text(generateText(), 32),
			k.layer("ui"),
		]);

		return {
			get: () => score,
			increment: () => {
				score++;
				text.text = generateText();
				if (score > highScore.get()) highScore.set(score);
			}
		}
	})();

	const player = (() => {
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
		const jump = () => {
			player.jump(JUMP_POWER);
		}

		k.keyPress('space', () => {
			jump();
		});
		k.mouseClick(() => {
			jump();
		});

		player.collides('ground', () => {
			k.go('gameover', score.get())
		});

		player.collides('pipe', () => {
			k.go('gameover', score.get())
		})

		let lastY = player.pos.y;
		player.on('update', () => {
			const y = player.pos.y
			if (Math.abs(lastY - y) < 5) player.angle = 0
			else if (lastY < y) player.angle = -3.14/6;
			else player.angle = 3.14/6;
			lastY = y;

			if (y <= 0) k.go('gameover', score.get());
		});

		return player;
	})();

	const groundTopY = (() => {
		let nthPipe = 0;
		const grounds = [];
		const generateNextGround = (lastGround, type) => {
			const x = lastGround ? lastGround.pos.x + (lastGround.width * lastGround.scale.x) : 0
			const possibleVariations = lastGround ? [Math.max(0, lastGround.variation - 1), Math.min(3, lastGround.variation + 1)] : [0, 1, 2, 3]
			grounds.push(addGround(type, randomFrom(possibleVariations), x))
		}
		const addGround = (type, variation, x) => {
			const tile = k.add([
				k.sprite('ground'),
				k.scale(SPRITE_SCALE),
				k.pos(x, k.height()),
				k.origin('botleft'),
				k.solid(),
				k.layer('entities'),
				'ground',
				{ type, variation }
			])
			tile.play(`${type}${variation}`)
			return tile;
		}
		while (true){
			const lastGround = grounds.slice(-1)[0];
			generateNextGround(lastGround, GROUND_TYPES[0]);
			if (lastGround && lastGround.pos.x > k.width()) break;
		}

		k.action('ground', (ground) => {
			ground.move(-X_SPEED, 0);
			if (ground.pos.x + (ground.width * ground.scale.x) >= 0) return;
			k.destroy(grounds.shift());
			generateNextGround(grounds.slice(-1)[0], GROUND_TYPES[0]);
		});

		return grounds[0].pos.y - (grounds[0].height * grounds[0].scale.y);
	})();

	(() => {
		const { MIN_Y, MAX_Y, WIDTH } = (() => {
			const piece = k.sprite('pipe');
			const MIN_Y = piece.height * PIPE_SCALE;
			const MAX_Y = groundTopY - (piece.height * PIPE_SCALE);
			return { MIN_Y, MAX_Y, WIDTH: piece.width * PIPE_SCALE }
		})();

		const pipes = [];

		const addPipe = (color, x, y) => {
			const topY = Math.max(MIN_Y, y - OPENING_DIAMETER/2);
			const middleTop = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE, (MIN_Y + topY - (MIN_Y * 2)) * 0.05),
				k.origin('top'),
				k.pos(x, 0),
				k.layer('entities'),
				'pipe'
			]);
			middleTop.play(`${color}Middle`);

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
			const middleBottom = k.add([
				k.sprite('pipe'),
				k.scale(PIPE_SCALE, (MAX_Y-bottomY) * 0.05),
				k.origin('bot'),
				k.pos(x, MAX_Y + MIN_Y),
				k.layer('entities'),
				'pipe'
			]);
			middleBottom.play(`${color}Middle`);

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

			pipes.push([middleTop, top, middleBottom, bottom, detector]);
		}

		k.action('pipe', (pipe) => {
			pipe.move(-X_SPEED, 0);
		});

		k.action('pipe-detector', pipe => {
			const x = pipe.pos.x + (WIDTH * PIPE_SCALE/2);
			if (!pipe.passed && x < player.pos.x) {
				pipe.passed = true;
				score.increment()
				return;
			}
			if (!pipe.passed || x >= 0) return;
			pipes.shift().forEach(part => k.destroy(part));
			const lastPipeColor = pipes.slice(-1)[0].find(part => part.color).color;
			addPipe(randomFrom(PIPE_COLORS.filter(color => color !== lastPipeColor)), k.width()*1.25, randomBetween(MIN_Y + OPENING_DIAMETER/3, MAX_Y - OPENING_DIAMETER/3))
		});

		[1, 1.3333333333333333, 1.6666666666666666, 2].forEach((dist, i) => {
			addPipe(PIPE_COLORS[i % PIPE_COLORS.length], k.width() * dist, randomBetween(MIN_Y + OPENING_DIAMETER/3, MAX_Y - OPENING_DIAMETER/3))
		});
	})();
});

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
		k.loadSprite('bird', 'assets/Player/bird1.png', {
			sliceX: 4,
			sliceY: 1,
			anims: {
				flap: {
					from: 0,
					to: 3
				}
			}
		}),
		k.loadSprite('background', 'assets/Background/Background3.png'),
		k.loadSprite('pipe', 'assets/Tileset/pipes.png', {
			sliceX: 4,
			sliceY: 3,
			anims: [PIPE_COLORS].map(colors => [colors, colors, colors].flat()).flat().reduce((obj, color, i) => {
				const part = ['Top', 'Middle', 'Bottom'][Math.floor(i / 4)];
				obj[`${color}${part}`] = { from: i, to: i }
				return obj
			}, {})
		}),
		k.loadSprite('ground', 'assets/Tileset/ground.png', {
			sliceX: 8,
			sliceY: 1,
			anims: [GROUND_TYPES].map(type => [type, type, type, type].flat()).flat().sort().reduce((obj, type, i) => {
				obj[`${type}${i % 4}`] = { from: i, to: i }
				return obj;
			}, {})
		}),
	]);
	k.start('gameplay');
})().catch(console.error);
