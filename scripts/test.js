const config = {
    currentArmyDps: 29780,
    clickPercent: 0.35,
    clickFixed: 57,
    bossEnergy: 2550000,
    battleDuration: 30,
    maxClicks: 82,
    upgradeCreatureDPS: 219,
    armySize: 8
};

function calculateRequirements(cfg) {
    const targetTotalDps = cfg.bossEnergy / cfg.battleDuration;
    
    const requiredArmyDps = (cfg.bossEnergy - (cfg.clickFixed * cfg.maxClicks)) / 
                            (cfg.battleDuration + (cfg.clickPercent * cfg.maxClicks));
    
    const increaseNeeded = requiredArmyDps - cfg.currentArmyDps;
    const totalUpgrades = Math.ceil(increaseNeeded / cfg.upgradeCreatureDPS);
    const upgradesPerCreature = Math.ceil(totalUpgrades / cfg.armySize);

    return {
        targetTotalDps: targetTotalDps.toFixed(2),
        requiredArmyDps: requiredArmyDps.toFixed(2),
        increaseNeeded: increaseNeeded.toFixed(2),
        totalUpgrades: totalUpgrades,
        upgradesPerCreature: upgradesPerCreature
    };
}

const results = calculateRequirements(config);

console.log("--- BATTLE SIMULATION RESULTS ---");
console.log(`Target Total DPS: ${results.targetTotalDps}`);
console.log(`Required Army DPS: ${results.requiredArmyDps}`);
console.log(`Army DPS Increase Needed: ${results.increaseNeeded}`);
console.log(`Total Upgrades Needed: ${results.totalUpgrades}`);
console.log(`Upgrades Per Creature: ${results.upgradesPerCreature}`);