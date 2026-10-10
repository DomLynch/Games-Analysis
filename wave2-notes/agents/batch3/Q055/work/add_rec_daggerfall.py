import sys
D="/mnt/frankendom-donors/daggerfall-unity/"
L=D+"Assets/Scripts/Game/Items/LootTables.cs"
rows=[
("daggerfall-unity","loot is generated from a per-key chance matrix (GetMatrix)",L,"110","public static LootChanceMatrix GetMatrix(string key)"),
("daggerfall-unity","unknown key falls back to matrix 0 (empty)",L,"118","return DefaultLootTables[0];"),
("daggerfall-unity","MIT licence header in LootTables.cs",L,"4","MIT License (http://www.opensource.org/licenses/mit-license.php)"),
("daggerfall-unity","main roll function signature",L,"176","public static DaggerfallUnityItem[] GenerateRandomLoot("),
("daggerfall-unity","gold is an inclusive random range scaled by PC level",L,"194","int goldCount = Random.Range(matrix.MinGold, matrix.MaxGold + 1) * playerEntity.Level;"),
("daggerfall-unity","weapon roll starts at matrix.WP (not level-scaled)",L,"201","chance = matrix.WP;"),
("daggerfall-unity","weapon repeat roll uses Dice100 success roll",L,"202","while (Dice100.SuccessRoll((int)chance))"),
("daggerfall-unity","each repeat halves the chance",L,"205","chance *= 0.5f;"),
("daggerfall-unity","ingredient group C1 is multiplied by PC level",L,"217","RandomIngredient(matrix.C1 * playerEntity.Level, ItemGroups.CreatureIngredients1, items);"),
("daggerfall-unity","ingredient group C3 is not level-scaled",L,"219","RandomIngredient(matrix.C3, ItemGroups.CreatureIngredients3, items);"),
("daggerfall-unity","plant group P1 is multiplied by PC level",L,"220","RandomIngredient(matrix.P1 * playerEntity.Level"),
("daggerfall-unity","shared ingredient helper repeats with halving",L,"264","while (Dice100.SuccessRoll((int)chance))"),
("daggerfall-unity","Random.InitState reseed uses a fresh list hash",L,"191","Random.InitState(items.GetHashCode());"),
("daggerfall-unity","Dice100 success is Random.Range(0,100) < chance",D+"Assets/Scripts/Game/Utility/Dice100.cs","17","return Random.Range(0, 100) < chanceSuccess;"),
("daggerfall-unity","generator is entered from DaggerfallLoot.GenerateItems",D+"Assets/Scripts/Internal/DaggerfallLoot.cs","80","LootTables.GenerateRandomLoot(matrix, GameManager.Instance.PlayerEntity);"),
("daggerfall-unity","enemy entity rolls its loot table at setup",D+"Assets/Scripts/Game/Entities/EnemyEntity.cs","330","DaggerfallLoot.GenerateItems(mobileEnemy.LootTableKey, items);"),
("daggerfall-unity","enemy map chance is a per-enemy field",D+"Assets/Scripts/Game/Entities/EnemyEntity.cs","389","DaggerfallLoot.RandomlyAddMap(mobileEnemy.MapChance, items);"),
("daggerfall-unity","potion added with fixed chance 3 when a table key exists",D+"Assets/Scripts/Game/Entities/EnemyEntity.cs","394","DaggerfallLoot.RandomlyAddPotion(3, items);"),
("daggerfall-unity","corpse container receives the entity inventory on death",D+"Assets/Scripts/Game/EnemyDeath.cs","123","loot.Items.TransferAll(entityBehaviour.Entity.Items);"),
("daggerfall-unity","death completes on the next Update tick, not inside the event",D+"Assets/Scripts/Game/EnemyDeath.cs","167","performDeath = true;"),
("daggerfall-unity","setup component creates the enemy entity",D+"Assets/Scripts/Game/SetupDemoEnemy.cs","156","EnemyEntity entity = new EnemyEntity(entityBehaviour);"),
("daggerfall-unity","setup component calls SetEnemyCareer for monster ids",D+"Assets/Scripts/Game/SetupDemoEnemy.cs","166","entity.SetEnemyCareer(mobileEnemy, entityBehaviour.EntityType);"),
("daggerfall-unity","LootTableKey is a field on the enemy record",D+"Assets/Scripts/DaggerfallUnityStructs.cs","210","public string LootTableKey;"),
("daggerfall-unity","per-enemy keys are assigned in the enemy catalogue",D+"Assets/Scripts/Utility/EnemyBasics.cs","519","LootTableKey = \"C\","),
("daggerfall-unity","licence file names MIT and the copyright holder",D+"LICENSE","3","Copyright (c) 2009-2023 Daggerfall Workshop"),
]
with open(sys.argv[1],'a') as f:
    for r in rows:
        assert '\t' not in ''.join(r)
        f.write('\t'.join(r)+'\n')
print('ok',len(rows))
