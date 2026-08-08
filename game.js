// Game configuration
const CONFIG = {
    MAP_WIDTH: 2000,
    MAP_HEIGHT: 2000,
    PLAYER_SIZE: 20,
    ENEMY_SIZE: 20,
    BULLET_SIZE: 5,
    FIRE_RATE: 200,
    BULLET_SPEED: 8,
    PLAYER_SPEED: 5,
    ENEMY_SPEED: 3,
    ENEMY_FIRE_RATE: 500,
    LOOT_SIZE: 15,
    ZONE_SHRINK_INTERVAL: 30000,
    ZONE_DAMAGE: 1,
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
let gameState = {
    running: false,
    gameOver: false,
    score: 0,
    kills: 0,
    survived: 0,
    enemiesKilled: 0,
};

let cameraX = 0;
let cameraY = 0;

// Player object
let player = {
    x: CONFIG.MAP_WIDTH / 2,
    y: CONFIG.MAP_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    shield: 0,
    maxShield: 100,
    lastShot: 0,
    width: CONFIG.PLAYER_SIZE,
    height: CONFIG.PLAYER_SIZE,
    inventory: [],
};

let enemies = [];
let bullets = [];
let loot = [];
let particles = [];
let gameZone = {
    x: CONFIG.MAP_WIDTH / 2,
    y: CONFIG.MAP_HEIGHT / 2,
    radius: 800,
    shrinkRate: 0.99,
    lastShrink: Date.now(),
};

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + cameraX;
    const mouseY = e.clientY - rect.top + cameraY;
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

canvas.addEventListener('click', () => {
    shoot();
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    buildStructure();
});

// Game initialization
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameState.running = true;
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.kills = 0;
    player.health = 100;
    player.ammo = 30;
    player.shield = 0;
    player.inventory = [];
    player.x = CONFIG.MAP_WIDTH / 2;
    player.y = CONFIG.MAP_HEIGHT / 2;
    enemies = [];
    bullets = [];
    loot = [];
    particles = [];
    gameZone.radius = 800;
    spawnEnemies(15);
    spawnLoot(30);
    gameLoop();
}

function spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400 + Math.random() * 800;
        const enemy = {
            x: player.x + Math.cos(angle) * distance,
            y: player.y + Math.sin(angle) * distance,
            vx: 0,
            vy: 0,
            angle: 0,
            health: 50,
            maxHealth: 50,
            ammo: 50,
            lastShot: 0,
            width: CONFIG.ENEMY_SIZE,
            height: CONFIG.ENEMY_SIZE,
            ai: {
                targetX: player.x,
                targetY: player.y,
                aggressiveness: Math.random() * 0.5 + 0.5,
            },
        };
        enemies.push(enemy);
    }
}

function spawnLoot(count) {
    for (let i = 0; i < count; i++) {
        const lootItem = {
            x: Math.random() * CONFIG.MAP_WIDTH,
            y: Math.random() * CONFIG.MAP_HEIGHT,
            type: ['ammo', 'health', 'shield'][Math.floor(Math.random() * 3)],
            amount: Math.random() * 30 + 20,
            radius: CONFIG.LOOT_SIZE,
        };
        loot.push(lootItem);
    }
}

function shoot() {
    if (!gameState.running) return;
    const now = Date.now();
    if (now - player.lastShot > CONFIG.FIRE_RATE && player.ammo > 0) {
        player.lastShot = now;
        player.ammo--;

        const bullet = {
            x: player.x + Math.cos(player.angle) * 15,
            y: player.y + Math.sin(player.angle) * 15,
            vx: Math.cos(player.angle) * CONFIG.BULLET_SPEED,
            vy: Math.sin(player.angle) * CONFIG.BULLET_SPEED,
            owner: 'player',
            damage: 25,
        };
        bullets.push(bullet);

        // Create muzzle flash particle
        for (let i = 0; i < 3; i++) {
            particles.push({
                x: bullet.x,
                y: bullet.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.3,
                maxLife: 0.3,
                color: '#ffaa00',
                size: 3,
            });
        }
    }
}

function buildStructure() {
    // Build a wall at player position
    if (gameState.running && player.ammo >= 5) {
        player.ammo -= 5;
        particles.push({
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            life: 0.5,
            maxLife: 0.5,
            color: '#6666ff',
            size: 20,
            isStructure: true,
        });
    }
}

function update() {
    if (!gameState.running) return;

    // Update player position
    player.vx = 0;
    player.vy = 0;

    if (keys['w'] || keys['arrowup']) player.vy -= CONFIG.PLAYER_SPEED;
    if (keys['s'] || keys['arrowdown']) player.vy += CONFIG.PLAYER_SPEED;
    if (keys['a'] || keys['arrowleft']) player.vx -= CONFIG.PLAYER_SPEED;
    if (keys['d'] || keys['arrowright']) player.vx += CONFIG.PLAYER_SPEED;

    player.x += player.vx;
    player.y += player.vy;

    // Keep player in map bounds
    player.x = Math.max(0, Math.min(player.x, CONFIG.MAP_WIDTH));
    player.y = Math.max(0, Math.min(player.y, CONFIG.MAP_HEIGHT));

    // Update camera
    cameraX = player.x - canvas.width / 2;
    cameraY = player.y - canvas.height / 2;

    // Update zone
    const now = Date.now();
    if (now - gameZone.lastShrink > CONFIG.ZONE_SHRINK_INTERVAL) {
        gameZone.lastShrink = now;
        gameZone.radius *= gameZone.shrinkRate;
    }

    // Check if player is outside zone
    const distToZoneCenter = Math.sqrt(
        Math.pow(player.x - gameZone.x, 2) + Math.pow(player.y - gameZone.y, 2)
    );
    if (distToZoneCenter > gameZone.radius) {
        player.health -= CONFIG.ZONE_DAMAGE;
    }

    // Update enemies
    enemies.forEach((enemy, index) => {
        // AI: Chase player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            enemy.vx = (dx / distance) * CONFIG.ENEMY_SPEED * enemy.ai.aggressiveness;
            enemy.vy = (dy / distance) * CONFIG.ENEMY_SPEED * enemy.ai.aggressiveness;
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        enemy.angle = Math.atan2(dy, dx);

        // AI: Shoot at player
        const now = Date.now();
        if (now - enemy.lastShot > CONFIG.ENEMY_FIRE_RATE && enemy.ammo > 0 && distance < 500) {
            enemy.lastShot = now;
            enemy.ammo--;

            const bullet = {
                x: enemy.x + Math.cos(enemy.angle) * 10,
                y: enemy.y + Math.sin(enemy.angle) * 10,
                vx: Math.cos(enemy.angle) * CONFIG.BULLET_SPEED,
                vy: Math.sin(enemy.angle) * CONFIG.BULLET_SPEED,
                owner: 'enemy',
                damage: 10,
            };
            bullets.push(bullet);
        }

        // Check if enemy is in zone
        const distToZone = Math.sqrt(Math.pow(enemy.x - gameZone.x, 2) + Math.pow(enemy.y - gameZone.y, 2));
        if (distToZone > gameZone.radius) {
            enemy.health -= CONFIG.ZONE_DAMAGE * 2;
        }

        // Remove dead enemies
        if (enemy.health <= 0) {
            enemies.splice(index, 1);
            gameState.kills++;
            gameState.score += 100;

            // Drop loot on enemy death
            loot.push({
                x: enemy.x,
                y: enemy.y,
                type: 'ammo',
                amount: 30,
                radius: CONFIG.LOOT_SIZE,
            });

            // Death particle effect
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 0.8,
                    maxLife: 0.8,
                    color: '#ff0000',
                    size: 4,
                });
            }
        }
    });

    // Update bullets
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Check bounds
        if (bullet.x < 0 || bullet.x > CONFIG.MAP_WIDTH || bullet.y < 0 || bullet.y > CONFIG.MAP_HEIGHT) {
            bullets.splice(index, 1);
            return;
        }

        // Check collision with player
        if (bullet.owner === 'enemy') {
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < CONFIG.PLAYER_SIZE) {
                player.health -= bullet.damage;
                bullets.splice(index, 1);
                return;
            }
        }

        // Check collision with enemies
        if (bullet.owner === 'player') {
            enemies.forEach((enemy) => {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < CONFIG.ENEMY_SIZE) {
                    enemy.health -= bullet.damage;
                    bullets.splice(index, 1);
                }
            });
        }
    });

    // Update loot collection
    loot.forEach((item, index) => {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 40) {
            switch (item.type) {
                case 'ammo':
                    player.ammo = Math.min(player.ammo + item.amount, player.maxAmmo);
                    break;
                case 'health':
                    player.health = Math.min(player.health + item.amount, player.maxHealth);
                    break;
                case 'shield':
                    player.shield = Math.min(player.shield + item.amount, player.maxShield);
                    break;
            }
            loot.splice(index, 1);
            gameState.score += 10;
        }
    });

    // Update particles
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 1 / 60;

        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });

    // Check game over
    if (player.health <= 0) {
        endGame();
    }

    // Spawn new enemies if all defeated
    if (enemies.length === 0) {
        spawnEnemies(Math.min(20, 10 + gameState.kills));
    }

    // Update survived time
    gameState.survived = Math.floor((Date.now() - gameStartTime) / 1000);
}

let gameStartTime = 0;

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game world
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Draw zone
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gameZone.x, gameZone.y, gameZone.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw loot
    loot.forEach((item) => {
        ctx.fillStyle = item.type === 'ammo' ? '#ffaa00' : item.type === 'health' ? '#00ff00' : '#6666ff';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw enemies
    enemies.forEach((enemy) => {
        // Enemy body
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);

        // Enemy direction indicator
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 20, enemy.y + Math.sin(enemy.angle) * 20);
        ctx.stroke();

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - 15, enemy.y - 30, 30, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x - 15, enemy.y - 30, 30 * (enemy.health / enemy.maxHealth), 5);
    });

    // Draw player
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);

    // Player direction indicator
    ctx.strokeStyle = '#00aa00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 25, player.y + Math.sin(player.angle) * 25);
    ctx.stroke();

    // Draw bullets
    bullets.forEach((bullet) => {
        ctx.fillStyle = bullet.owner === 'player' ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, CONFIG.BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw particles
    particles.forEach((particle) => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    ctx.restore();

    // Draw HUD
    updateHUD();

    // Draw minimap
    drawMinimap();
}

function updateHUD() {
    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.max(0, Math.floor(player.health))}/100`;

    // Ammo counter
    document.getElementById('ammo-count').textContent = player.ammo;

    // Inventory
    const inventoryList = document.getElementById('items-list');
    inventoryList.innerHTML = `
        <div class="inventory-item">Ammo: ${player.ammo}/${player.maxAmmo}</div>
        <div class="inventory-item">Shield: ${Math.floor(player.shield)}/${player.maxShield}</div>
        <div class="inventory-item">Kills: ${gameState.kills}</div>
        <div class="inventory-item">Score: ${gameState.score}</div>
    `;
}

function drawMinimap() {
    const minimapCanvas = document.querySelector('#minimap canvas') || createMinimapCanvas();
    const minimapCtx = minimapCanvas.getContext('2d');

    const scale = 150 / CONFIG.MAP_WIDTH;

    minimapCtx.fillStyle = '#1a1a1a';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Draw zone on minimap
    minimapCtx.strokeStyle = 'rgba(255, 100, 0, 0.8)';
    minimapCtx.beginPath();
    minimapCtx.arc(gameZone.x * scale, gameZone.y * scale, gameZone.radius * scale, 0, Math.PI * 2);
    minimapCtx.stroke();

    // Draw player on minimap
    minimapCtx.fillStyle = '#00ff00';
    minimapCtx.fillRect(player.x * scale - 2, player.y * scale - 2, 4, 4);

    // Draw enemies on minimap
    minimapCtx.fillStyle = '#ff4444';
    enemies.forEach((enemy) => {
        minimapCtx.fillRect(enemy.x * scale - 2, enemy.y * scale - 2, 4, 4);
    });
}

function createMinimapCanvas() {
    const minimap = document.getElementById('minimap');
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    minimap.appendChild(canvas);
    return canvas;
}

function endGame() {
    gameState.running = false;
    gameState.gameOver = true;

    const gameOverScreen = document.getElementById('game-over-screen');
    const statsText = document.getElementById('game-stats');
    statsText.textContent = `Kills: ${gameState.kills} | Score: ${gameState.score} | Survived: ${gameState.survived}s`;
    gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    update();
    draw();

    if (gameState.running) {
        requestAnimationFrame(gameLoop);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Start screen
window.addEventListener('load', () => {
    gameStartTime = Date.now();
    document.getElementById('start-screen').classList.remove('hidden');
});
