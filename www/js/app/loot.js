define(['app/eventmanager', 'app/entity/loot/treasurechest', 'app/gamestate', 'app/gamecontent'], 
		function(E, TreasureChest, GameState, Content) {
	
	var probabilities = {
		rare: 0.10,
		uncommon: 0.35,
		common: 1
	};
	
	function rollForLoot(Monster) {
		// %15 chance for normal monster, %5 for every tile after that.
		var chance = Monster.options.tiles * 0.05;
		var roll = Math.random();
		if(Monster.forceLoot || roll < chance) {
			// Drop loot!
			var treasure = new TreasureChest({forceLoot: Monster.getLoot()});
			treasure.p(Monster.p());
			E.trigger('newEntity', [treasure]);
		}
	}
	
	function getLoot(treasure, debugMultiplier) {
		var lootName = null;
		var gemDropRate = 0.05;
		if(GameState.dayNumber > (20 / debugMultiplier)) gemDropRate *= 2;
		if(GameState.dayNumber > (40 / debugMultiplier)) gemDropRate *= 4;
		if(treasure.options.forceLoot) {
			lootName = treasure.options.forceLoot;
		} else if(GameState.gem < 4 && Math.random() < gemDropRate * debugMultiplier) {
			lootName = "shard";
		} else {
			var r = Math.random();
			var lootPool = null;
			for(var rarity in probabilities) {
				if(r < probabilities[rarity]) {
					lootPool = Content.lootPools[rarity];
					break;
				}
			}
			var poolSize = 0;
			for(poolSize in lootPool) {}
			poolSize++; // Correct for array 0-indexing
			
			r = Math.random();
			for(i in lootPool) {
				lootName = lootPool[i];
				if(r < (i + 1) / poolSize) {
					break;
				}
			}
		}
		
		E.trigger("lootGained", [lootName, treasure]);
		if(lootName == "shard") {
			// Shards are special. Maybe abstract this later...
			var num = GameState.gem || 0;
			GameState.gem = ++num > 4 ? 4 : num;
			E.trigger("updateGem");
		} else {
			GameState.count('LOOT', 1);
			var num = GameState.items[lootName] || 0;
			num++;
			var max = Content.LootType[lootName].large ? 1 : 3;
			num = num < max ? num : max;
			GameState.items[lootName] = num;
			E.trigger("updateLoot", [lootName, num]);
		}
	}
	
	return {
		init: function() {
			E.bind("monsterKilled", rollForLoot, this);
			E.bind("pickupLoot", getLoot, this);
		},
		
		useItem: function(lootName) {
			var num = GameState.items[lootName];
			if(num > 0 && require('app/world').canMove()) {
				num--;
				GameState.items[lootName] = num;
				E.trigger('updateLoot', [lootName, num]);
				Content.LootType[lootName].onUse();
			}
		}
	};
});