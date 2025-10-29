import React, { useState, useEffect, useRef } from 'react';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -10;
const MOVE_SPEED = 5;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const DEVIL_BASE_WIDTH = 40;
const DEVIL_BASE_HEIGHT = 50;
const DEVIL_WIDTH = 25;
const DEVIL_HEIGHT = 25;
const DEVIL_SCALE_X = DEVIL_WIDTH / DEVIL_BASE_WIDTH;
const DEVIL_SCALE_Y = DEVIL_HEIGHT / DEVIL_BASE_HEIGHT;
const SUPER_JUMP_STRENGTH = -3;

const createMovingPlatformState = (definitions = []) =>
  definitions.map((platform) => ({
    ...platform,
    x: platform.startX,
    y: platform.startY,
    deltaX: 0,
    progress: 0,
    activated: false,
    preActivated: false,
    isMoving: true,
    direction: platform.direction ?? 'positive',
    variant: platform.variant ?? 'floating',
    carryPlayer: platform.carryPlayer ?? false,
    bounceStrength: platform.bounceStrength,
  }));

const createJumpPadState = (definitions = []) =>
  definitions.map((pad) => {
    const startX = pad.startX ?? pad.x ?? pad.minX ?? 0;
    return {
      ...pad,
      startX,
      x: startX,
      direction: pad.initialDirection ?? 1,
    };
  });

const createMovingSpikeState = (definitions = []) =>
  definitions.map((spike) => {
    const axis = spike.axis ?? 'vertical';
    const startX = spike.startX ?? spike.x ?? 0;
    const startY = spike.startY ?? spike.y ?? 0;
    const travelDistance = spike.travelDistance ?? 0;
    const travelDistanceDown = spike.travelDistanceDown ?? travelDistance;

    const minX = axis === 'horizontal'
      ? spike.minX ?? startX - travelDistance
      : startX;
    const maxX = axis === 'horizontal'
      ? spike.maxX ?? startX + travelDistance
      : startX;
    const minY = axis === 'vertical'
      ? spike.minY ?? startY - travelDistance
      : startY;
    const maxY = axis === 'vertical'
      ? spike.maxY ?? startY + travelDistanceDown
      : startY;

    return {
      ...spike,
      axis,
      startX,
      startY,
      x: startX,
      y: startY,
      minX,
      maxX,
      minY,
      maxY,
      direction: spike.initialDirection ?? -1,
      activated: spike.triggerOnStart ?? false,
      cooldown: 0,
    };
  });

const prepareStaticPlatforms = (level) =>
  (level.platforms ?? []).map((platform) => ({
    ...platform,
    isMoving: false,
    breakable: platform.breakable
      ? { ...platform.breakable, triggered: false }
      : undefined,
  }));

const levels = [
  {
    name: 'Infernal Gate',
    hint: 'Hit the ground jump pad before the spikes and stay alert for crumbling ledges above!',
    startPosition: { x: 50, y: 50 },
    door: { x: 760, y: 150, width: 30, height: 50 },
    jumpPads: [
      {
        id: 'infernal-launch',
        startX: 120,
        minX: 120,
        maxX: 120,
        width: 40,
        height: 20,
        y: 330,
        speed: 0,
        strength: -15,
      },
    ],
    platforms: [
      { x: 0, y: 350, width: 170, height: 50, variant: 'ground' },
      {
        x: 170,
        y: 200,
        width: 280,
        height: 20,
        variant: 'floating',
        breakable: {
          type: 'split',
          leftWidth: 70,
          rightWidth: 160,
          gap: 60,
          autoTriggerRange: 70,
        },
      },
      {
        x: 450,
        y: 200,
        width: 350,
        height: 20,
        variant: 'floating',
        breakable: {
          type: 'shrinkFront',
          remainingWidth: 210,
          minimumWidth: 120,
          autoTriggerRange: 60,
        },
      },
      { x: 630, y: 350, width: 170, height: 50, variant: 'ground' },
    ],
    spikes: [
      { x: 170, y: 328, width: 280, height: 22 },
      { x: 450, y: 328, width: 180, height: 22 },
    ],
    movingSpikes: [],
  },
  {
    name: 'Molten Ferry',
    hint: 'Approach the ferry platform, hop on, and ride it across the lava pit.',
    startPosition: { x: 40, y: 240 },
    door: { x: 720, y: 180, width: 30, height: 50 },
    jumpPads: [],
    platforms: [
      { x: 0, y: 350, width: 170, height: 50, variant: 'ground' },
      { x: 640, y: 350, width: 160, height: 50, variant: 'ground' },
      { x: 640, y: 230, width: 140, height: 20, variant: 'floating' },
    ],
    movingPlatforms: [
      {
        id: 'lava-ferry',
        startX: 220,
        startY: 260,
        width: 80,
        height: 20,
        travelDistance: 300,
        speed: 2.2,
        activationRange: 140,
        carryPlayer: true,
        bounceStrength: -12,
      },
    ],
    spikes: [
      { x: 170, y: 328, width: 420, height: 22 },
    ],
    movingSpikes: [],
  },
  {
    name: 'Obsidian Peaks',
    hint: 'The second ledge splits under your feet - clear the gap before it collapses!',
    startPosition: { x: 30, y: 80 },
    door: { x: 700, y: 90, width: 30, height: 50 },
    jumpPads: [],
    platforms: [
      { x: 0, y: 350, width: 130, height: 50, variant: 'ground' },
      {
        x: 140,
        y: 260,
        width: 120,
        height: 20,
        variant: 'floating',
        breakable: { type: 'split', leftWidth: 40, rightWidth: 40, gap: 40 },
      },
      {
        x: 300,
        y: 220,
        width: 130,
        height: 20,
        variant: 'floating',
        breakable: { type: 'shrinkFront', remainingWidth: 80, minimumWidth: 40 },
      },
      { x: 460, y: 180, width: 140, height: 20, variant: 'floating' },
      { x: 640, y: 140, width: 140, height: 20, variant: 'floating' },
      { x: 670, y: 350, width: 130, height: 50, variant: 'ground' },
    ],
    spikes: [
      { x: 130, y: 328, width: 110, height: 22 },
      { x: 280, y: 328, width: 140, height: 22 },
      { x: 460, y: 328, width: 160, height: 22 },
    ],
    movingSpikes: [],
  },
  {
    name: "Hell's Gauntlet",
    hint: 'Chain bounce ferry rides, collapsing stones, and a shrinking perch to reach the door.',
    startPosition: { x: 36, y: 240 },
    door: { x: 740, y: 60, width: 30, height: 50 },
    jumpPads: [],
    platforms: [
      { x: 0, y: 350, width: 110, height: 50, variant: 'ground' },
      { x: 270, y: 230, width: 38, height: 14, variant: 'floating', breakable: { type: 'vanish', autoTriggerRange: 28 } },
      { x: 330, y: 190, width: 40, height: 14, variant: 'floating', breakable: { type: 'vanish', autoTriggerRange: 30 } },
      { x: 388, y: 240, width: 180, height: 18, variant: 'floating', breakable: { type: 'split', leftWidth: 55, rightWidth: 55, gap: 70, autoTriggerRange: 80 } },
      { x: 724, y: 132, width: 56, height: 14, variant: 'floating', breakable: { type: 'vanish', autoTriggerRange: 22 } },
      { x: 760, y: 350, width: 120, height: 50, variant: 'ground' },
    ],
    movingPlatforms: [
      { id: 'gauntlet-ferry', startX: 130, startY: 300, width: 110, height: 16, travelDistance: 420, speed: 4.5, activationRange: 20, carryPlayer: true, bounceStrength: -16 },
      { id: 'spike-rail', startX: 350, startY: 280, width: 70, height: 12, travelDistance: 220, speed: 3.6, activationRange: 150, carryPlayer: false, bounceStrength: -11 },
      { id: 'final-hop', startX: 560, startY: 170, width: 60, height: 12, travelDistance: 150, speed: 4.8, activationRange: 80, carryPlayer: true, bounceStrength: -14 },
    ],
    spikes: [
      { x: 110, y: 328, width: 50, height: 22 },
      { x: 168, y: 328, width: 40, height: 22 },
      { x: 228, y: 328, width: 40, height: 22 },
      { x: 288, y: 328, width: 48, height: 22 },
      { x: 348, y: 328, width: 160, height: 22 },
      { x: 512, y: 328, width: 120, height: 22 },
      { x: 648, y: 328, width: 90, height: 22 },
    ],
    movingSpikes: [],
  },
  {
    name: 'Blazing Return',
    hint: 'Ride each moving launch pad as it glides forward, then spring off before it snaps back.',
    startPosition: { x: 40, y: 260 },
    door: { x: 720, y: 160, width: 30, height: 50 },
    jumpPads: [
      { id: 'return-pad-1', startX: 200, minX: 160, maxX: 240, width: 40, height: 18, y: 300, speed: 1.6, strength: -10 },
      { id: 'return-pad-2', startX: 300, minX: 260, maxX: 340, width: 40, height: 18, y: 280, speed: 1.6, strength: -10 },
      { id: 'return-pad-3', startX: 400, minX: 360, maxX: 440, width: 40, height: 18, y: 260, speed: 1.6, strength: -10 },
      { id: 'return-pad-4', startX: 500, minX: 460, maxX: 540, width: 40, height: 18, y: 240, speed: 1.6, strength: -10 },
    ],
    platforms: [
      { x: 0, y: 350, width: 150, height: 50, variant: 'ground' },
      { x: 40, y: 290, width: 90, height: 18, variant: 'floating' },
      { x: 640, y: 350, width: 160, height: 50, variant: 'ground' },
      { x: 640, y: 220, width: 160, height: 20, variant: 'floating' },
    ],
    movingPlatforms: [],
    spikes: [
      { x: 140, y: 328, width: 500, height: 22 },
    ],
    movingSpikes: [],
  },
  {
    name: 'Spike Ballet',
  hint: 'Five spike clusters guard the bridge—two dart sideways when you leap, so plan each jump!',
    startPosition: { x: 690, y: 280 },
    door: { x: 60, y: 260, width: 30, height: 50 },
    jumpPads: [],
    platforms: [
      { x: 0, y: 350, width: 800, height: 50, variant: 'ground' },
      { x: 40, y: 270, width: 120, height: 18, variant: 'floating' },
      { x: 640, y: 270, width: 120, height: 18, variant: 'floating' },
    ],
    movingPlatforms: [],
    spikes: [
      { x: 100, y: 328, width: 60, height: 22 },
      { x: 360, y: 328, width: 60, height: 22 },
      { x: 620, y: 328, width: 60, height: 22 },
    ],
    movingSpikes: [
      { id: 'popper-1', axis: 'horizontal', startX: 190, startY: 328, width: 60, height: 22, minX: 190, maxX: 280, speed: 2.4, triggerOnJump: true, activationRange: 200, initialDirection: 1 },
      { id: 'popper-2', axis: 'horizontal', startX: 430, startY: 328, width: 60, height: 22, minX: 430, maxX: 520, speed: 2.4, triggerOnJump: true, activationRange: 200, initialDirection: 1 },
    ],
  },

];

export default function DevilPlatformer() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(0);
  const [position, setPosition] = useState({ ...levels[0].startPosition });
  const [gameState, setGameState] = useState('playing'); // playing, won, dead
  const [showMessage, setShowMessage] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const velocityRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({});
  const isJumpingRef = useRef(false);
  const impactSoundRef = useRef(null);
  const doorSoundRef = useRef(null);
  const jumpPadsRef = useRef(createJumpPadState(levels[0].jumpPads ?? []));
  const movingSpikesRef = useRef(createMovingSpikeState(levels[0].movingSpikes ?? []));
  const jumpTriggeredRef = useRef(false);
  const jumpTriggerXRef = useRef(0);
  const deathMessageTimeoutRef = useRef();
  const staticPlatformsRef = useRef(prepareStaticPlatforms(levels[0]));
  const movingPlatformsRef = useRef(createMovingPlatformState(levels[0].movingPlatforms ?? []));
  const positionRef = useRef({ ...levels[0].startPosition });

  const level = levels[levelIndex];

  // Initialize impact sound
  useEffect(() => {
    impactSoundRef.current = new Audio('/impact-sound.mp3');
    impactSoundRef.current.volume = 0.7;
    impactSoundRef.current.preload = 'auto';
    
    doorSoundRef.current = new Audio('/closed-door.mp3');
    doorSoundRef.current.volume = 0.8;
    doorSoundRef.current.preload = 'auto';
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;
      
      if ((e.key === ' ' || e.key === 'ArrowUp') && !isJumpingRef.current) {
        velocityRef.current.y = JUMP_STRENGTH;
        isJumpingRef.current = true;
        jumpTriggeredRef.current = true;
        jumpTriggerXRef.current = positionRef.current.x;
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (deathMessageTimeoutRef.current) {
        clearTimeout(deathMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    movingPlatformsRef.current = createMovingPlatformState(level.movingPlatforms ?? []);
    staticPlatformsRef.current = prepareStaticPlatforms(level);
    movingSpikesRef.current = createMovingSpikeState(level.movingSpikes ?? []);
    setPosition({ ...level.startPosition });
    positionRef.current = { ...level.startPosition };
    velocityRef.current = { x: 0, y: 0 };
    isJumpingRef.current = false;
    keysRef.current = {};
    jumpPadsRef.current = createJumpPadState(level.jumpPads ?? []);
    jumpTriggeredRef.current = false;
    setGameState('playing');
    setShowMessage(false);
    setIsShaking(false);
    if (deathMessageTimeoutRef.current) {
      clearTimeout(deathMessageTimeoutRef.current);
      deathMessageTimeoutRef.current = undefined;
    }
  }, [level]);

  // Collision and environment helpers
  const isPlayerAlignedWithPlatform = (player, platform) => {
    const epsilon = 4;
    return (
      player.x + DEVIL_WIDTH > platform.x &&
      player.x < platform.x + platform.width &&
      Math.abs(player.y + DEVIL_HEIGHT - platform.y) <= epsilon
    );
  };

  const checkPlatformCollision = (x, y) => {
    const staticPlatforms = staticPlatformsRef.current ?? [];
    for (let i = 0; i < staticPlatforms.length; i += 1) {
      const platform = staticPlatforms[i];
      const platformTop = platform.y;
      const collisionWindow = Math.min(platform.height, 20);
      if (
        x + DEVIL_WIDTH > platform.x &&
        x < platform.x + platform.width &&
        y + DEVIL_HEIGHT >= platformTop &&
        y + DEVIL_HEIGHT <= platformTop + collisionWindow &&
        velocityRef.current.y >= 0
      ) {
        return { top: platformTop, platform, index: i, kind: 'static' };
      }
    }

    for (let platform of movingPlatformsRef.current ?? []) {
      const platformTop = platform.y;
      const collisionWindow = Math.min(platform.height, 20);
      if (
        x + DEVIL_WIDTH > platform.x &&
        x < platform.x + platform.width &&
        y + DEVIL_HEIGHT >= platformTop &&
        y + DEVIL_HEIGHT <= platformTop + collisionWindow &&
        velocityRef.current.y >= 0
      ) {
        return { top: platformTop, platform, kind: 'moving' };
      }
    }

    return null;
  };

  const checkSpikeCollision = (x, y) => {
    for (let spike of level.spikes ?? []) {
      if (
        x + DEVIL_WIDTH - 5 > spike.x &&
        x + 5 < spike.x + spike.width &&
        y + DEVIL_HEIGHT - 3 > spike.y &&
        y + DEVIL_HEIGHT < spike.y + spike.height + 5
      ) {
        return true;
      }
    }
    for (let spike of movingSpikesRef.current ?? []) {
      if (
        x + DEVIL_WIDTH - 5 > spike.x &&
        x + 5 < spike.x + spike.width &&
        y + DEVIL_HEIGHT - 3 > spike.y &&
        y + DEVIL_HEIGHT < spike.y + spike.height + 5
      ) {
        return true;
      }
    }
    return false;
  };

  const checkJumpPadCollision = (x, y) => {
    for (let pad of jumpPadsRef.current ?? []) {
      if (
        x + DEVIL_WIDTH > pad.x &&
        x < pad.x + pad.width &&
        y + DEVIL_HEIGHT >= pad.y &&
        y + DEVIL_HEIGHT <= pad.y + pad.height &&
        velocityRef.current.y >= 0
      ) {
        return pad;
      }
    }
    return null;
  };

  const checkDoorCollision = (x, y) => {
    const door = level.door;
    if (!door) return false;
    if (
      x + DEVIL_WIDTH > door.x &&
      x < door.x + door.width &&
      y + DEVIL_HEIGHT > door.y &&
      y < door.y + door.height
    ) {
      return true;
    }
    return false;
  };

  const triggerBreakablePlatform = (index, platform, playerX) => {
    if (!platform.breakable || platform.breakable.triggered) {
      return { ignoreCollision: false };
    }

    const { breakable } = platform;
    breakable.triggered = true;

    if (breakable.type === 'split') {
      const requestedGap = breakable.gap ?? 40;
      const minimumSegment = breakable.minimumSegment ?? 20;
      const maxGap = Math.max(0, Math.min(requestedGap, platform.width - minimumSegment * 2));
      const usableSpan = Math.max(platform.width - maxGap, minimumSegment * 2);

      let leftWidth = breakable.leftWidth ?? Math.floor(usableSpan / 2);
      let rightWidth = breakable.rightWidth ?? usableSpan - leftWidth;

      if (leftWidth < minimumSegment) leftWidth = minimumSegment;
      if (rightWidth < minimumSegment) rightWidth = minimumSegment;

      const currentSpan = leftWidth + rightWidth;
      if (currentSpan > usableSpan) {
        const scale = usableSpan / currentSpan;
        leftWidth = Math.max(minimumSegment, Math.floor(leftWidth * scale));
        rightWidth = Math.max(minimumSegment, usableSpan - leftWidth);
      }

      const gap = platform.width - (leftWidth + rightWidth);
      const gapStart = platform.x + leftWidth;
      const gapEnd = gapStart + gap;

      const playerLeft = playerX;
      const playerRight = playerX + DEVIL_WIDTH;
      const shouldDropPlayer = gap > 0 && playerRight > gapStart && playerLeft < gapEnd;

      const leftPlatform = {
        ...platform,
        width: leftWidth,
        breakable: undefined,
      };

      const rightPlatform = {
        ...platform,
        x: platform.x + leftWidth + gap,
        width: rightWidth,
        breakable: undefined,
      };

      const updatedPlatforms = [...(staticPlatformsRef.current ?? [])];
      updatedPlatforms.splice(index, 1, leftPlatform, rightPlatform);
      staticPlatformsRef.current = updatedPlatforms;
      return { ignoreCollision: shouldDropPlayer };
    }

    if (breakable.type === 'shrinkFront') {
      const minimumWidth = breakable.minimumWidth ?? 20;
      const requestedWidth = breakable.remainingWidth ?? platform.width / 2;
      const newWidth = Math.max(minimumWidth, Math.min(requestedWidth, platform.width));
      const removedWidth = platform.width - newWidth;
      const newX = platform.x + removedWidth;

      const playerCenter = playerX + DEVIL_WIDTH / 2;
      const shouldDropPlayer = playerCenter < newX;

      const updatedPlatform = {
        ...platform,
        x: newX,
        width: newWidth,
        breakable: undefined,
      };

      const updatedPlatforms = [...(staticPlatformsRef.current ?? [])];
      updatedPlatforms.splice(index, 1, updatedPlatform);
      staticPlatformsRef.current = updatedPlatforms;
      return { ignoreCollision: shouldDropPlayer };
    }

    if (breakable.type === 'vanish') {
      const updatedPlatforms = [...(staticPlatformsRef.current ?? [])];
      updatedPlatforms.splice(index, 1);
      staticPlatformsRef.current = updatedPlatforms;
      return { ignoreCollision: true };
    }

    return { ignoreCollision: false };
  };

  const processAutoTriggerBreakables = (playerX) => {
    const platforms = staticPlatformsRef.current ?? [];
    for (let i = 0; i < platforms.length; i += 1) {
      const platform = platforms[i];
      const breakable = platform.breakable;
      if (!breakable || breakable.triggered || breakable.autoTriggerRange === undefined) {
        continue;
      }

      const platformCenter = platform.x + platform.width / 2;
      const playerCenter = playerX + DEVIL_WIDTH / 2;
      if (Math.abs(playerCenter - platformCenter) <= breakable.autoTriggerRange) {
        triggerBreakablePlatform(i, platform, playerX);
        return;
      }
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      processAutoTriggerBreakables(positionRef.current.x);

      const player = positionRef.current;
      const jumpTriggered = jumpTriggeredRef.current;
      if (jumpTriggered) {
        if (movingSpikesRef.current.length) {
          const triggerCenter = (jumpTriggerXRef.current ?? player.x) + DEVIL_WIDTH / 2;
          movingSpikesRef.current.forEach((spike) => {
            if (spike.activated || !spike.triggerOnJump) {
              return;
            }
            const spikeCenter = spike.x + spike.width / 2;
            if (
              spike.activationRange === undefined ||
              Math.abs(triggerCenter - spikeCenter) <= spike.activationRange
            ) {
              spike.activated = true;
              spike.direction = spike.initialDirection ?? -1;
            }
          });
        }
        jumpTriggeredRef.current = false;
      }

      if (movingPlatformsRef.current.length) {
        movingPlatformsRef.current.forEach((platform) => {
          platform.deltaX = 0;

          if (!platform.preActivated && platform.activationRange !== undefined) {
            const platformCenter = platform.x + platform.width / 2;
            const playerCenter = player.x + DEVIL_WIDTH / 2;
            if (Math.abs(playerCenter - platformCenter) <= platform.activationRange) {
              platform.preActivated = true;
            }
          }

          const playerStanding = isPlayerAlignedWithPlatform(player, platform);
          if ((platform.preActivated || platform.activationRange === undefined) && playerStanding) {
            platform.activated = true;
          }

          if (platform.activated) {
            const maxTravel = platform.travelDistance ?? 0;
            if (maxTravel > 0 && platform.progress < maxTravel) {
              const directionMultiplier = platform.direction === 'negative' ? -1 : 1;
              const nextProgress = Math.min(platform.progress + platform.speed, maxTravel);
              const nextX = platform.startX + directionMultiplier * nextProgress;
              platform.deltaX = nextX - platform.x;
              platform.x = nextX;
              platform.progress = nextProgress;
            } else {
              platform.deltaX = 0;
            }
          }
        });
      }

      if (movingSpikesRef.current.length) {
        movingSpikesRef.current.forEach((spike) => {
          if (!spike.activated) {
            return;
          }
          const speed = spike.speed ?? 0;
          if (!speed) {
            return;
          }
          if (spike.axis === 'horizontal') {
            spike.x += speed * spike.direction;
            if (spike.direction < 0 && spike.x <= spike.minX) {
              spike.x = spike.minX;
              spike.direction = 1;
            } else if (spike.direction > 0 && spike.x >= spike.maxX) {
              spike.x = spike.maxX;
              spike.direction = -1;
            }
          } else {
            spike.y += speed * spike.direction;
            if (spike.direction < 0 && spike.y <= spike.minY) {
              spike.y = spike.minY;
              spike.direction = 1;
            } else if (spike.direction > 0 && spike.y >= spike.maxY) {
              spike.y = spike.maxY;
              spike.direction = -1;
            }
          }
        });
      }

      if (jumpPadsRef.current.length) {
        jumpPadsRef.current.forEach((pad) => {
          if (!pad.speed || pad.minX === undefined || pad.maxX === undefined) {
            return;
          }
          pad.x += pad.speed * pad.direction;
          if (pad.x <= pad.minX) {
            pad.x = pad.minX;
            pad.direction = 1;
          } else if (pad.x >= pad.maxX) {
            pad.x = pad.maxX;
            pad.direction = -1;
          }
        });
      }

      let newVelX = 0;
      if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
        newVelX = -MOVE_SPEED;
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
        newVelX = MOVE_SPEED;
      }
      velocityRef.current.x = newVelX;

      velocityRef.current.y += GRAVITY;

      setPosition((prev) => {
        let newX = prev.x + velocityRef.current.x;
        let newY = prev.y + velocityRef.current.y;

        if (newX < 0) newX = 0;
        if (newX > CANVAS_WIDTH - DEVIL_WIDTH) newX = CANVAS_WIDTH - DEVIL_WIDTH;

        const platformCollision = checkPlatformCollision(newX, newY);
        if (platformCollision) {
          let ignoreCollision = false;
          let landedOnMovingBounce = false;
          if (
            platformCollision.kind === 'static' &&
            platformCollision.platform.breakable &&
            !platformCollision.platform.breakable.triggered
          ) {
            const result = triggerBreakablePlatform(
              platformCollision.index,
              platformCollision.platform,
              newX,
            );
            ignoreCollision = result?.ignoreCollision ?? false;
          }

          if (!ignoreCollision) {
            newY = platformCollision.top - DEVIL_HEIGHT;
            velocityRef.current.y = 0;
            isJumpingRef.current = false;
            if (platformCollision.platform.isMoving && platformCollision.platform.bounceStrength) {
              landedOnMovingBounce = true;
            }
            if (platformCollision.platform.isMoving && platformCollision.platform.carryPlayer) {
              newX += platformCollision.platform.deltaX ?? 0;
              if (newX < 0) newX = 0;
              if (newX > CANVAS_WIDTH - DEVIL_WIDTH) newX = CANVAS_WIDTH - DEVIL_WIDTH;
            }
            if (landedOnMovingBounce) {
              velocityRef.current.y = platformCollision.platform.bounceStrength;
              isJumpingRef.current = true;
            }
          }
        }

        const collidedJumpPad = checkJumpPadCollision(newX, newY);
        if (collidedJumpPad) {
          const padStrength = collidedJumpPad.strength ?? SUPER_JUMP_STRENGTH;
          velocityRef.current.y = padStrength;
          isJumpingRef.current = true;
        }

        if (checkSpikeCollision(newX, newY)) {
          // Play impact sound
          if (impactSoundRef.current) {
            impactSoundRef.current.currentTime = 0;
            impactSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
          }
          setGameState('dead');
          setShowMessage(true);
          setIsShaking(true);
          if (deathMessageTimeoutRef.current) {
            clearTimeout(deathMessageTimeoutRef.current);
          }
          deathMessageTimeoutRef.current = setTimeout(() => {
            setShowMessage(false);
            setIsShaking(false);
            deathMessageTimeoutRef.current = undefined;
          }, 2000);
          return prev;
        }

        if (checkDoorCollision(newX, newY)) {
          // Play door sound
          if (doorSoundRef.current) {
            doorSoundRef.current.currentTime = 0;
            doorSoundRef.current.play().catch(e => console.log('Door audio play failed:', e));
          }
          setGameState('won');
          setShowMessage(true);
          setMaxUnlockedLevel((current) => {
            const unlocked = Math.min(levelIndex + 1, levels.length - 1);
            return current < unlocked ? unlocked : current;
          });
          return prev;
        }

        if (newY > CANVAS_HEIGHT) {
          setGameState('dead');
          setShowMessage(true);
          setIsShaking(true);
          if (deathMessageTimeoutRef.current) {
            clearTimeout(deathMessageTimeoutRef.current);
          }
          deathMessageTimeoutRef.current = setTimeout(() => {
            setShowMessage(false);
            setIsShaking(false);
            deathMessageTimeoutRef.current = undefined;
          }, 2000);
          return prev;
        }

        const updatedPosition = { x: newX, y: newY };
        positionRef.current = updatedPosition;
        return updatedPosition;
      });
    };

    const interval = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(interval);
  }, [gameState, level, levelIndex]);

  const resetGame = () => {
    movingPlatformsRef.current = createMovingPlatformState(level.movingPlatforms ?? []);
    staticPlatformsRef.current = prepareStaticPlatforms(level);
    movingSpikesRef.current = createMovingSpikeState(level.movingSpikes ?? []);
    setPosition({ ...level.startPosition });
    positionRef.current = { ...level.startPosition };
    velocityRef.current = { x: 0, y: 0 };
    isJumpingRef.current = false;
    keysRef.current = {};
    jumpPadsRef.current = createJumpPadState(level.jumpPads ?? []);
    jumpTriggeredRef.current = false;
    setGameState('playing');
    setShowMessage(false);
    setIsShaking(false);
    if (deathMessageTimeoutRef.current) {
      clearTimeout(deathMessageTimeoutRef.current);
      deathMessageTimeoutRef.current = undefined;
    }
  };

  const goToPreviousLevel = () => {
    setLevelIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToNextLevel = () => {
    setLevelIndex((prev) => Math.min(prev + 1, maxUnlockedLevel, levels.length - 1));
  };

  const previousDisabled = levelIndex === 0;
  const nextDisabled = levelIndex >= maxUnlockedLevel || levelIndex >= levels.length - 1;
  const isLastLevel = levelIndex === levels.length - 1;
  const hasJumpPads = (level.jumpPads?.length ?? 0) > 0;
  const instructionsMessage = level.hint ?? (hasJumpPads
    ? 'Reach the blue door and use the moving jump pads for a super boost!'
    : 'Reach the blue door with careful jumps - no jump pads to help this time!');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black via-red-950 to-red-900 p-8 relative overflow-hidden">
      {/* Hellish background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-radial from-red-600/30 via-transparent to-black/50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-repeat opacity-10" 
             style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ff4444' fill-opacity='0.3'%3E%3Cpath d='M20 20l10-10v20l-10-10zm-10 0L0 10v20l10-10z'/%3E%3C/g%3E%3C/svg%3E")`}}>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 flex gap-2 z-30">
        <button
          onClick={goToPreviousLevel}
          disabled={previousDisabled}
          className={`w-12 h-12 border-2 border-red-600 flex items-center justify-center text-red-200 text-xl font-bold hell-glow transition-all duration-200 ${previousDisabled ? 'bg-black/60 opacity-40 cursor-not-allowed' : 'bg-red-900/80 hover:bg-red-800/90 hover:scale-105'}`}
          style={{fontFamily: 'Metal Mania, cursive'}}
          aria-label="Previous level"
        >
          ◀
        </button>
        <button
          onClick={resetGame}
          className="w-12 h-12 bg-red-900/80 border-2 border-red-600 flex items-center justify-center text-red-200 text-xl font-bold hell-glow hover:bg-red-800/90 hover:scale-105 transition-all duration-200"
          style={{fontFamily: 'Metal Mania, cursive'}}
          aria-label="Restart level"
        >
          ↻
        </button>
        <button
          onClick={goToNextLevel}
          disabled={nextDisabled}
          className={`w-12 h-12 border-2 border-red-600 flex items-center justify-center text-red-200 text-xl font-bold hell-glow transition-all duration-200 ${nextDisabled ? 'bg-black/60 opacity-40 cursor-not-allowed' : 'bg-red-900/80 hover:bg-red-800/90 hover:scale-105'}`}
          style={{fontFamily: 'Metal Mania, cursive'}}
          aria-label="Next level"
        >
          ▶
        </button>
      </div>

      <div className="absolute top-4 right-4 bg-black/80 text-red-200 text-sm font-bold px-4 py-2 rounded-lg border-2 border-red-600 hell-glow z-30" style={{fontFamily: 'Creepster, cursive'}}>
        <div className="fire-glow">LEVEL {levelIndex + 1}/{levels.length}</div>
        <div className="text-xs text-red-300 mt-1">{level.name}</div>
      </div>

      <div
        className={`relative bg-gradient-to-b from-orange-600 via-red-500 to-red-800 rounded-lg overflow-hidden shadow-2xl border-4 border-red-900 z-20 ${isShaking ? 'screen-shake' : ''}`}
        style={{ 
          width: `${CANVAS_WIDTH}px`, 
          height: `${CANVAS_HEIGHT}px`,
          boxShadow: '0 0 50px rgba(139, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.5)'
        }}
      >
  {(staticPlatformsRef.current ?? []).map((platform, idx) => (
          <div
            key={`platform-${idx}`}
            className={`absolute ${platform.variant === 'ground' ? 'bg-orange-600' : 'bg-orange-500 border-2 border-orange-700'}`}
            style={{
              left: `${platform.x}px`,
              top: `${platform.y}px`,
              width: `${platform.width}px`,
              height: `${platform.height}px`,
            }}
          />
        ))}

        {movingPlatformsRef.current.map((platform, idx) => (
          <div
            key={`moving-${platform.id ?? idx}`}
            className="absolute bg-orange-500 border-2 border-orange-700 z-10"
            style={{
              left: `${platform.x}px`,
              top: `${platform.y}px`,
              width: `${platform.width}px`,
              height: `${platform.height}px`,
            }}
          />
        ))}
        {(level.spikes ?? []).map((spike, idx) => (
          <div
            key={`spike-${idx}`}
            className="absolute z-20"
            style={{
              left: `${spike.x}px`,
              top: `${spike.y}px`,
              width: `${spike.width}px`,
              height: `${spike.height}px`,
            }}
          >
            <div className="flex h-full">
              {Array.from({ length: Math.floor(spike.width / 20) }).map((_, i) => (
                <svg key={i} width="20" height="22" viewBox="0 0 20 22" className="flex-shrink-0">
                  <polygon points="10,0 20,22 0,22" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" />
                </svg>
              ))}
            </div>
          </div>
        ))}

        {(movingSpikesRef.current ?? []).map((spike, idx) => (
          <div
            key={`moving-spike-${spike.id ?? idx}`}
            className="absolute z-20"
            style={{
              left: `${spike.x}px`,
              top: `${spike.y}px`,
              width: `${spike.width}px`,
              height: `${spike.height}px`,
            }}
          >
            <div className="flex h-full">
              {Array.from({ length: Math.floor(spike.width / 20) }).map((_, i) => (
                <svg key={i} width="20" height="22" viewBox="0 0 20 22" className="flex-shrink-0">
                  <polygon points="10,0 20,22 0,22" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" />
                </svg>
              ))}
            </div>
          </div>
        ))}

        {jumpPadsRef.current.map((pad, idx) => (
          <div
            key={`jump-pad-${pad.id ?? idx}`}
            className="absolute"
            style={{
              left: `${pad.x}px`,
              top: `${pad.y}px`,
              width: `${pad.width}px`,
              height: `${pad.height}px`,
            }}
          >
            <div className="w-full h-full bg-yellow-600 border-2 border-yellow-800 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-orange-800"></div>
                <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-orange-800 ml-1"></div>
              </div>
            </div>
          </div>
        ))}

        {level.door && (
          <div
            className="absolute bg-blue-500 border-4 border-blue-700 rounded-t-lg"
            style={{
              left: `${level.door.x}px`,
              top: `${level.door.y}px`,
              width: `${level.door.width}px`,
              height: `${level.door.height}px`,
            }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-300 rounded-full"></div>
          </div>
        )}

        <div
          className="absolute transition-none z-10"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${DEVIL_WIDTH}px`,
            height: `${DEVIL_HEIGHT}px`,
          }}
        >
          <div
            className="relative"
            style={{
              width: `${DEVIL_BASE_WIDTH}px`,
              height: `${DEVIL_BASE_HEIGHT}px`,
              transform: `scale(${DEVIL_SCALE_X}, ${DEVIL_SCALE_Y})`,
              transformOrigin: 'top left',
            }}
          >
            <div className="relative w-full h-full">
              <div className="absolute -top-1 left-1 w-2 h-3 bg-red-900 transform -rotate-12 rounded-t-full"></div>
              <div className="absolute -top-1 right-1 w-2 h-3 bg-red-900 transform rotate-12 rounded-t-full"></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-600 rounded-full border-2 border-red-800">
                <div className="absolute top-2 left-1 w-1.5 h-2 bg-yellow-400 rounded-full"></div>
                <div className="absolute top-2 right-1 w-1.5 h-2 bg-yellow-400 rounded-full"></div>
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 border-b-2 border-black rounded-b-full"></div>
              </div>
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-6 h-10 bg-red-700 rounded-lg border-2 border-red-900"></div>
              <div className="absolute top-8 -right-1 w-1.5 h-8 bg-red-700 rounded-full transform rotate-45 origin-top"></div>
              <div className="absolute bottom-0 left-2 w-2 h-6 bg-red-800 rounded-b-lg"></div>
              <div className="absolute bottom-0 right-2 w-2 h-6 bg-red-800 rounded-b-lg"></div>
            </div>
          </div>
        </div>

        {showMessage && gameState === 'dead' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-gradient-to-br from-red-900 to-black text-red-200 px-12 py-8 rounded-lg text-4xl font-bold border-4 border-red-600 hell-glow transform rotate-1">
              <div className="fire-glow text-center" style={{fontFamily: 'Nosifer, cursive'}}>
                💀 SOUL CLAIMED! 💀
              </div>
              <div className="text-lg mt-4 text-center text-red-300" style={{fontFamily: 'Creepster, cursive'}}>
                The abyss awaits... Press ↻ to rise again
              </div>
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-gradient-to-br from-orange-600 to-red-900 text-red-200 px-12 py-8 rounded-lg text-3xl font-bold border-4 border-orange-500 hell-glow text-center transform -rotate-1">
              <div className="fire-glow" style={{fontFamily: 'Creepster, cursive'}}>
                {isLastLevel ? '🔥 HELL CONQUERED! 🔥' : `🎯 STAGE ${levelIndex + 1} CLEARED! 🎯`}
              </div>
              <div className="text-base mt-4 text-orange-200" style={{fontFamily: 'Metal Mania, cursive'}}>
                {isLastLevel ? 'The devil reigns supreme! Press ◀ to revisit or ↻ to replay.' : 'The inferno beckons... Press ▶ for next torment or ↻ to replay.'}
              </div>
              {!isLastLevel && (
                <button
                  onClick={goToNextLevel}
                  disabled={nextDisabled}
                  className={`mt-4 px-6 py-2 rounded-lg font-bold border-2 transition-all duration-200 ${nextDisabled ? 'bg-black/60 border-red-800 text-red-600 cursor-not-allowed opacity-60' : 'bg-red-800 border-orange-500 text-orange-200 hover:bg-red-700 hover:scale-105 hell-glow'}`}
                  style={{fontFamily: 'Metal Mania, cursive'}}
                >
                  DESCEND DEEPER ▶
                </button>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 bg-black/80 text-red-200 text-xs px-3 py-2 rounded-lg border border-red-600 hell-glow" 
             style={{fontFamily: 'Metal Mania, cursive'}}>
          ← → MOVE | SPACE LEAP
        </div>
      </div>

      <div className="mt-6 text-red-200 text-base max-w-lg text-center bg-black/60 px-6 py-3 rounded-lg border border-red-600 hell-glow z-20" 
           style={{fontFamily: 'Creepster, cursive'}}>
        <div className="fire-glow">{instructionsMessage}</div>
      </div>
    </div>
  );
}
