/*
 * BloomDay offline Indian food calorie helper.
 * Values are typical estimates for cooked/ready-to-eat foods unless named dry/raw.
 * They are not exact recipe analyses; oil, ghee, sugar, portion sizes and home recipes vary.
 */
(function () {
  'use strict';

  // [name, kcal/100g, default unit, grams represented by one default unit, aliases, alternate portion sizes]
  const rows = [
    // Tamil / South Indian breakfasts
    ['Idli',145,'piece',40,['idly','steamed idli']],
    ['Mini idli',145,'piece',10,['mini idly','small idli']],
    ['Plain dosa',170,'piece',90,['dosa','dosai','plain dosai']],
    ['Masala dosa',185,'piece',180,['masala dosai','potato masala dosa']],
    ['Rava dosa',190,'piece',120,['rava dosai','sooji dosa']],
    ['Ghee roast dosa',230,'piece',150,['ghee roast','nei roast dosa']],
    ['Onion dosa',175,'piece',120,['onion dosai']],
    ['Set dosa',180,'piece',80,['set dosai']],
    ['Uthappam',165,'piece',140,['uttapam','uthappam plain']],
    ['Onion uthappam',170,'piece',160,['onion uttapam']],
    ['Ragi dosa',165,'piece',90,['finger millet dosa']],
    ['Ragi idli',140,'piece',40,['ragi idly']],
    ['Adai',220,'piece',100,['adai dosa','mixed dal adai']],
    ['Pesarattu',170,'piece',100,['moong dosa','green gram dosa']],
    ['Ven pongal',150,'cup',220,['pongal','ghee pongal','khara pongal'],{serving:220}],
    ['Sakkarai pongal',185,'cup',200,['sweet pongal','chakkarai pongal'],{serving:200}],
    ['Rava upma',130,'cup',200,['upma','sooji upma','suji upma'],{serving:200}],
    ['Vegetable upma',125,'cup',200,['veg upma'],{serving:200}],
    ['Vermicelli upma',150,'cup',200,['semiya upma','sevai upma'],{serving:200}],
    ['Poha',130,'cup',200,['aval','aval upma','flattened rice upma'],{serving:200}],
    ['Puttu',180,'serving',150,['rice puttu','puttu kadala'],{cup:180,serving:150}],
    ['Appam',155,'piece',70,['aapam','palappam']],
    ['Idiyappam',150,'piece',60,['string hoppers','sevai plain','nool puttu']],
    ['Kuzhi paniyaram',190,'piece',25,['paniyaram','kuzhi appam','appe']],
    ['Medu vada',300,'piece',50,['vada','ulundu vadai','ulundhu vada','urad dal vada']],
    ['Masala vada',320,'piece',40,['paruppu vadai','dal vada','chana dal vada']],
    ['Bonda',280,'piece',60,['potato bonda','urulai bonda']],
    ['Chapati',260,'piece',40,['chapathi','roti','whole wheat roti']],
    ['Phulka',230,'piece',35,['phulka roti']],
    ['Parotta',320,'piece',100,['parotta','malabar parotta','parotta plain']],
    ['Poori',300,'piece',40,['puri','poori fried']],
    ['Naan',290,'piece',90,['plain naan']],
    ['Bread slice',265,'piece',28,['white bread','brown bread slice','sandwich bread']],
    ['Oats (dry)',389,'g',40,['oats','rolled oats','yogabar oats','yoga bar strawberry oats','strawberry oats']],
    ['Oats porridge with water',75,'cup',240,['oatmeal water','cooked oats'],{serving:240}],
    ['Oats porridge with milk',105,'cup',240,['milk oats','oatmeal with milk'],{serving:240}],
    ['Dosa batter',150,'g',100,['idli dosa batter']],
    // Rice, main meals and mixed dishes
    ['Cooked white rice',130,'cup',160,['rice','white rice','steamed rice','cooked rice','sadam','saadam','plain rice'],{serving:160}],
    ['Cooked red rice',145,'cup',160,['red rice','matta rice','kerala red rice','sivappu arisi'],{serving:160}],
    ['Cooked brown rice',123,'cup',160,['brown rice cooked'],{serving:160}],
    ['Cooked millet',120,'cup',160,['cooked millet','millet rice','thinai rice','samai rice','varagu rice'],{serving:160}],
    ['Lemon rice',165,'cup',200,['elumichai sadam','elumichai rice'],{serving:200}],
    ['Tamarind rice',175,'cup',200,['puliyodarai','puliyogare','puli sadam','tamarind rice'],{serving:200}],
    ['Curd rice',140,'cup',200,['thayir sadam','yogurt rice','tayir sadam'],{serving:200}],
    ['Tomato rice',150,'cup',200,['thakkali sadam','tomato bath'],{serving:200}],
    ['Coconut rice',190,'cup',200,['thengai sadam','coconut sadam'],{serving:200}],
    ['Sambar rice',135,'cup',220,['sambar sadam','bisibele bath','bisi bele bath'],{serving:220}],
    ['Rasam rice',125,'cup',220,['rasam sadam'],{serving:220}],
    ['Vegetable pulao',150,'serving',250,['veg pulao','vegetable pulav'],{cup:200,serving:250}],
    ['Vegetable biryani',155,'serving',300,['veg biryani','vegetable biriyani'],{cup:200,serving:300}],
    ['Chicken biryani',180,'serving',350,['chicken biriyani','biriyani chicken'],{cup:250,serving:350}],
    ['Mutton biryani',200,'serving',350,['mutton biriyani','lamb biryani'],{cup:250,serving:350}],
    ['Egg biryani',170,'serving',350,['egg biriyani'],{cup:250,serving:350}],
    ['Chicken fried rice',190,'serving',300,['chicken rice fried'],{cup:200,serving:300}],
    ['Egg fried rice',175,'serving',300,['egg rice fried'],{cup:200,serving:300}],
    // Curries, vegetables, sides
    ['Sambar',55,'cup',200,['paruppu sambar','vegetable sambar'],{serving:200}],
    ['Rasam',25,'cup',200,['tomato rasam','pepper rasam','milagu rasam'],{serving:200}],
    ['Dal (cooked)',115,'cup',200,['dal','paruppu','cooked lentils','moong dal cooked'],{serving:200}],
    ['Dal tadka',130,'cup',200,['tadka dal','dal fry'],{serving:200}],
    ['Chana masala',140,'cup',200,['chole','chole masala','chickpea curry'],{serving:200}],
    ['Rajma curry',140,'cup',200,['rajma','kidney bean curry'],{serving:200}],
    ['Sundal',150,'cup',150,['chickpea sundal','kondakadalai sundal','kadalai sundal','peas sundal'],{serving:150}],
    ['Boiled chickpeas',164,'cup',160,['chickpeas boiled','chana boiled','kondakadalai boiled'],{serving:160}],
    ['Vegetable kurma',150,'cup',200,['veg kurma','vegetable korma'],{serving:200}],
    ['Avial',110,'cup',150,['aviyal'],{serving:150}],
    ['Vegetable kootu',110,'cup',150,['kootu','poricha kootu'],{serving:150}],
    ['Keerai poriyal',105,'cup',120,['keerai','spinach poriyal','greens poriyal','keerai masiyal'],{serving:120}],
    ['Beans poriyal',90,'cup',120,['green beans poriyal','beans thoran'],{serving:120}],
    ['Cabbage poriyal',80,'cup',120,['cabbage thoran']],
    ['Carrot poriyal',90,'cup',120,['carrot thoran']],
    ['Potato masala',130,'cup',150,['urulai kilangu masala','potato curry','aloo masala'],{serving:150}],
    ['Aloo gobi',100,'cup',150,['potato cauliflower curry'],{serving:150}],
    ['Bhindi masala',110,'cup',150,['okra curry','vendakkai poriyal','ladies finger curry'],{serving:150}],
    ['Mixed vegetable curry',100,'cup',150,['vegetable curry','mixed veg sabzi'],{serving:150}],
    ['Paneer butter masala',180,'cup',200,['paneer masala','butter paneer'],{serving:200}],
    ['Paneer (plain)',265,'g',50,['paneer cubes','cottage cheese']],
    ['Tofu',145,'g',100,['plain tofu']],
    ['Soya chunks curry',130,'cup',180,['soya curry','meal maker curry','meal maker masala'],{serving:180}],
    ['Soya chunks (dry)',345,'g',25,['dry soya chunks','meal maker dry']],
    ['Plain curd',61,'cup',200,['curd','dahi','yogurt','thayir'],{serving:200}],
    ['Raita',65,'cup',150,['cucumber raita','onion raita'],{serving:150}],
    ['Coconut chutney',330,'tbsp',15,['thengai chutney','coconut chutney'],{serving:30}],
    ['Tomato chutney',80,'tbsp',15,['thakkali chutney'],{serving:30}],
    ['Mint coriander chutney',80,'tbsp',15,['green chutney','pudina chutney','coriander chutney'],{serving:30}],
    ['Indian pickle',150,'tsp',5,['pickle','oorugai','mango pickle'],{tbsp:15,serving:10}],
    // Meat, fish, eggs and protein
    ['Boiled egg',155,'piece',50,['egg boiled','hard boiled egg','muttai']],
    ['Egg omelette',190,'serving',90,['omelette','omelet','muttai omelette'],{piece:90,serving:90}],
    ['Scrambled eggs',180,'serving',100,['scrambled egg','egg bhurji'],{serving:100}],
    ['Egg white cooked',52,'piece',30,['egg white','boiled egg white']],
    ['Egg curry',150,'serving',180,['muttai curry','egg masala'],{cup:200,serving:180}],
    ['Chicken breast cooked',165,'g',100,['cooked chicken breast','grilled chicken breast']],
    ['Chicken curry',160,'serving',180,['kozhi kulambu','chicken kuzhambu','chicken gravy'],{cup:200,serving:180}],
    ['Grilled chicken',190,'serving',150,['grilled chicken pieces'],{serving:150}],
    ['Tandoori chicken',170,'serving',150,['chicken tandoori'],{serving:150}],
    ['Chicken 65',300,'serving',100,['chicken sixty five','chicken fry 65'],{serving:100}],
    ['Pepper chicken',190,'serving',150,['milagu chicken'],{cup:180,serving:150}],
    ['Fish curry',125,'serving',180,['meen kulambu','meen kuzhambu','fish kuzhambu'],{cup:200,serving:180}],
    ['Fish fry',240,'piece',100,['meen varuval','fried fish','fish varuval']],
    ['Grilled fish',140,'serving',150,['fish grilled'],{serving:150}],
    ['Prawn curry',140,'serving',180,['shrimp curry','eral curry'],{cup:200,serving:180}],
    ['Cooked prawns',99,'g',100,['prawns cooked','shrimp cooked']],
    ['Mutton curry',180,'serving',180,['aattu kari kulambu','mutton kuzhambu','lamb curry'],{cup:200,serving:180}],
    ['Fish (cooked, lean)',125,'g',100,['cooked fish','lean fish cooked']],
    // Fruit
    ['Banana',89,'piece',120,['vazhaipazham','small banana'],{serving:120}],
    ['Apple',52,'piece',180,['apple raw'],{serving:180}],
    ['Orange',47,'piece',130,['orange fruit','sathukudi'],{serving:130}],
    ['Mango',60,'piece',200,['mango slices','maambazham'],{cup:165,serving:200}],
    ['Papaya',43,'cup',140,['papaya pieces','papali'],{serving:140}],
    ['Watermelon',30,'cup',150,['watermelon pieces','tharpoosani'],{serving:150}],
    ['Guava',68,'piece',100,['goiaba','koyya pazham','guava fruit'],{serving:100}],
    ['Grapes',69,'cup',150,['grapes fruit'],{serving:150}],
    ['Pomegranate arils',83,'cup',175,['pomegranate','mathulai','anar'],{serving:175}],
    ['Pineapple',50,'cup',165,['annasi'],{serving:165}],
    ['Dates',282,'piece',8,['date fruit','pericham pazham']],
    // Snacks, nuts and sweets
    ['Roasted peanuts',585,'handful',30,['peanuts roasted','groundnuts','verkadalai'],{serving:30}],
    ['Almonds',579,'piece',1.2,['badam','almond']],
    ['Cashews',553,'handful',30,['cashew nuts','mundhiri'],{piece:1.5,serving:30}],
    ['Roasted chana',370,'handful',30,['pottukadalai','roasted gram','bhuna chana'],{serving:30}],
    ['Roasted makhana',350,'cup',15,['fox nuts','phool makhana'],{serving:25}],
    ['Murukku',480,'piece',20,['chakli','thenkuzhal']],
    ['Mixture snack',550,'handful',30,['mixture','kara boondi mixture','namkeen'],{serving:30}],
    ['Samosa',300,'piece',100,['aloo samosa','samosa fried']],
    ['Onion pakora',320,'serving',100,['pakoda','onion pakoda','vengaya pakoda'],{serving:100}],
    ['Vegetable bajji',250,'piece',60,['bajji','vazhakkai bajji','plantain bajji']],
    ['Marie biscuit',450,'piece',7,['marie gold biscuit','marie biscuit']],
    ['Digestive biscuit',480,'piece',14,['digestive biscuits']],
    ['Gulab jamun',320,'piece',50,['gulabjamun']],
    ['Laddu',450,'piece',40,['boondi laddu','besan ladoo','ladoo']],
    ['Mysore pak',500,'piece',25,['mysorepa']],
    ['Jalebi',400,'piece',40,['jilebi']],
    ['Payasam',150,'cup',200,['paal payasam','semiya payasam','kheer'],{serving:200}],
    ['Ice cream',207,'cup',100,['vanilla ice cream','icecream'],{serving:100}],
    ['Dark chocolate',550,'piece',10,['chocolate dark'],{serving:20}],
    // Drinks and common ingredients
    ['Tea with milk and sugar',45,'cup',150,['milk tea','chai','tea with sugar','paal tea','chai with milk'],{serving:150}],
    ['Tea with milk, no sugar',30,'cup',150,['milk tea no sugar','unsweetened milk tea'],{serving:150}],
    ['Black tea, no sugar',1,'cup',150,['plain tea','black tea'],{serving:150}],
    ['Coffee with milk and sugar',60,'cup',150,['filter coffee','coffee with sugar','kaapi','coffee milk sugar'],{serving:150}],
    ['Black coffee, no sugar',2,'cup',150,['black coffee','coffee without milk'],{serving:150}],
    ['Milk (toned)',60,'cup',200,['milk','cow milk','toned milk'],{serving:200}],
    ['Buttermilk',40,'cup',200,['neer mor','chaas','spiced buttermilk'],{serving:200}],
    ['Coconut water',19,'cup',200,['tender coconut water','ilaneer'],{serving:200}],
    ['Fresh lime water, no sugar',5,'cup',200,['lemon water','lime water','elumichai water'],{serving:200}],
    ['Sugar',387,'tsp',4,['white sugar','sakkarai'],{tbsp:12}],
    ['Honey',304,'tsp',7,['then','honey'],{tbsp:21}],
    ['Cooking oil',884,'tsp',5,['oil','sunflower oil','groundnut oil','cooking oil'],{tbsp:14,ml:0.92}],
    ['Ghee',900,'tsp',5,['nei','clarified butter'],{tbsp:13,ml:0.91}],
    ['Raw white rice',365,'g',50,['uncooked rice','white rice raw']],
    ['Whole wheat atta',340,'g',30,['atta','wheat flour','chapati flour']],
    ['Dry moong dal',347,'g',40,['uncooked moong dal','green gram dal dry']],
    ['Dry toor dal',335,'g',40,['raw toor dal','arhar dal dry','thuvaram paruppu dry']],
    ['Dry chana dal',360,'g',40,['uncooked chana dal','kadalai paruppu dry']]
  ];

  const basePortions = { piece: 60, cup: 240, serving: 150, tbsp: 15, tsp: 5, handful: 30, g: 1, kg: 1000, ml: 1, L: 1000 };
  const foods = rows.map(([name, kcalPer100g, defaultUnit, defaultGrams, aliases = [], alternate = {}]) => ({
    name,
    kcalPer100g,
    defaultUnit,
    defaultQuantity: defaultUnit === 'g' ? defaultGrams : 1,
    defaultGrams,
    aliases,
    portions: { ...basePortions, [defaultUnit]: defaultGrams, ...alternate },
    mlDensity: typeof alternate.ml === 'number' ? alternate.ml : 1
  }));

  function normalise(value) {
    return String(value || '').toLocaleLowerCase('en-IN')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  const exactIndex = new Map();
  foods.forEach(food => [food.name, ...food.aliases].forEach(alias => exactIndex.set(normalise(alias), food)));

  function find(value) {
    const key = normalise(value);
    if (!key) return null;
    if (exactIndex.has(key)) return exactIndex.get(key);
    // Accept common labels such as "2 idlis" or a simple quantity suffix.
    const trimmed = key.replace(/^\d+(?:\.\d+)?\s+/, '').replace(/\s+\d+(?:\.\d+)?$/, '');
    return exactIndex.get(trimmed) || null;
  }
  function estimate(name, quantity, unit) {
    const food = find(name);
    const amount = Number(quantity);
    if (!food || !Number.isFinite(amount) || amount < 0) return null;
    let grams;
    if (unit === 'g') grams = amount;
    else if (unit === 'kg') grams = amount * 1000;
    else if (unit === 'ml') grams = amount * food.mlDensity;
    else if (unit === 'L') grams = amount * 1000 * food.mlDensity;
    else grams = amount * (food.portions[unit] || basePortions[unit] || food.defaultGrams || 100);
    return { food, grams, calories: Math.max(0, Math.round(food.kcalPer100g * grams / 100)) };
  }

  window.BLOOMDAY_FOOD_LOOKUP = {
    foods,
    find,
    estimate,
    names: foods.map(food => food.name),
    sourceUrl: 'https://www.nin.res.in/ebooks/IFCT2017_16122024.pdf'
  };
})();
