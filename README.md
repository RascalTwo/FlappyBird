[kaboom.js]: https://kaboomjs.com/

# Flappy Bird

[![Run on Repl.it](https://repl.it/badge/github/RascalTwo/FlappyBird)](https://repl.it/github/RascalTwo/FlappyBird)
[![Website](https://img.shields.io/website?url=https://flappybird--rascaltwo.repl.co/)](https://flappybird--rascaltwo.repl.co/)

The classic Flappy Bird implemented in [Kaboom.js][kaboom.js]! With dynamic random generation of both assets and pipes, the ability to share previous runs, and to compete against them!

**Link to project:** https://flappybird--rascaltwo.repl.co/

https://user-images.githubusercontent.com/9403665/128610838-e544f830-d833-42b3-b37c-2006e5ffc28f.mp4

## Usage

Your goal is to fly for as long a possible.

Crashing into the floor, pipes, or flying into spaces will cause you to stop flying.

Previous games can be saved both so you can watch them later, and play the same level again.

> Flying over snow indicates you are currently setting a high score!

- Space or Mouse click increases your height

## How It's Made:

**Tech used:** [Kaboom.js][kaboom.js], JavaScript, HTML, CSS

I started off creating the two basic screens, the menu and the actual gameplay, with the menu showing the textual information needed for playing the game and handling state IO. I went with a functional IIFE encapsulation approach over singleton classes to manage the different aspects of the gameplay, from pipe management, HUD elements, player movement, etc. After achieving my MVP I added additional features, such as the randomized infinite scrolling background, differing ground type when setting a high score, and the ability to record & replay games.

## Optimizations

There can exist rare instances that due to the scheduling nature of the engine replayed entities are not exactly where they were in the past, which can lead to previous runs both losing too early or not losing when they should, so improving the accuracy of the replay/recording system would resolve this. Additionally, there could exist togglable options for users that want to keep replaying the same level over and over, and other QOL improvements based on user preferences.

## Lessons Learned:

Being the largest project I've written using [Kaboom.js][kaboom.js] and first with a replay system, I learned not only how to fully use the animation and scheduling system.

## Examples:

This isn't the first nor last game I've written using [Kaboom.js][kaboom.js]:

**Infinite Driver:** https://github.com/RascalTwo/InfiniteDriver

**Rail Snake:** https://github.com/RascalTwo/RailSnake

## Credits

[Dong Nguyen]: https://megacrash.itch.io/flappy-bird-assets

- [Dong Nguyen][Dong Nguyen] for the assets
