function calculateBMI() {
    var weight = parseFloat(document.getElementById('weight').value);
    var height = parseFloat(document.getElementById('height').value);

    var bmi = weight / ((height / 100) ** 2);

    document.getElementById('bmiResult').innerHTML = 'Your BMI: ' + bmi.toFixed(2);
}

function calculateTDEE() {
    var age = parseInt(document.getElementById('age').value);
    var weight = parseInt(document.getElementById('weight').value);
    var height = parseInt(document.getElementById('height').value);
    var activityLevel = document.getElementById('activityLevel').value;

    var tdee = calculateTDEEByActivityLevel(weight,height,age, activityLevel);

    document.getElementById('tdeeResult').innerHTML = 'Your TDEE: ' + tdee + ' calories';
    updateRemainingCalories();

    document.getElementById('activityLevel').addEventListener('change', function() {
        // Calculate TDEE again when activity level changes
        calculateTDEE();
    });
}

function calculateTDEEByActivityLevel(weight,height,age, activityLevel) {
    var baseTDEE = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);

    switch (activityLevel) {
        case 'sedentary':
            return baseTDEE * 1.2;
        case 'lightlyActive':
            return baseTDEE * 1.375;
        case 'moderatelyActive':
            return baseTDEE * 1.55;
        case 'veryActive':
            return baseTDEE * 1.725;
        case 'extraActive':
            return baseTDEE * 1.9;
        default:
            return baseTDEE;
    }
}

function searchFoods() {
    var apiKey = 'C6QJgZhPBb622y15kWRwzVoSOR6eTsNmzWjZcQcu';
    var apiEndpoint = 'https://api.nal.usda.gov/fdc/v1/foods/search';

    var query = document.getElementById('searchInput').value;

    fetch(`${apiEndpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response:', data); 

            if (data.foods && data.foods.length > 0) {
                var searchResults = data.foods.map(food => {
                    var energyIndex = food.foodNutrients.findIndex(nutrient => nutrient.nutrientName.toLowerCase().includes('energy'));
                    var energyValue = energyIndex !== -1 ? food.foodNutrients[energyIndex].value : 'N/A';

                    return `<div onclick="selectFood(${food.fdcId})">${food.description}</div>`;
                });

                document.getElementById('searchResults').innerHTML = 'Search Results:<br>' + searchResults.join('<br>');
            } else {
                var baseTDEE = calculateTDEEByActivityLevel(parseInt(document.getElementById('age').value), document.getElementById('activityLevel').value);
                var remainingCalories = baseTDEE;
                document.getElementById('searchResults').innerHTML = `No results found for the given query. You still need ${remainingCalories.toFixed(2)} calories for the day.`;
            }
            openFoodDetailsModal();
            
        })
        .catch(error => {
            console.error('Error fetching data from the food search API:', error);
        });
        updateRemainingCalories();
}

function selectFood(fdcId) {
    var apiKey = 'C6QJgZhPBb622y15kWRwzVoSOR6eTsNmzWjZcQcu';
    var apiEndpoint = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`;

    fetch(`${apiEndpoint}?api_key=${apiKey}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(foodData => {
            console.log('Selected Food Details:', foodData);
            selectedFoodData = foodData;
            var caloriesInfo = findNutrientInfo(selectedFoodData);
            var foodDetailsHTML = `
            <h2>${foodData.description}</h2>
                <p>${caloriesInfo.label}: ${caloriesInfo.value} ${caloriesInfo.unit}</p>
                <!-- Add more details as needed -->
                <label for="portionSize">Portion Size(per100g):</label>
                <input type="text" id="portionSize" placeholder="Enter portion size">
                <button onclick="addFoodToConsumption()">Add to Consumption</button>
            `;
            document.getElementById('foodDetails').innerHTML = foodDetailsHTML;

            
            document.getElementById('foodDetailsModal').style.display = 'block';
            
        })
        .catch(error => {
            console.error('Error fetching food details from the API:', error);
        });
}


function findNutrientInfo(foodData) {
    var nutrientInfo = {
        label: 'N/A',
        value: 'N/A',
        unit: 'N/A'
    };

    
    if (foodData.foodNutrients && foodData.foodNutrients.length > 0) {
        for (var nutrient of foodData.foodNutrients) {
            console.log('Checking Nutrient:', nutrient);

            if (nutrient.nutrient.number == "208") {
                console.log('Found Matching Nutrient:', nutrient);
                nutrientInfo.label=nutrient.nutrient.name;
                nutrientInfo.value = nutrient.amount;
                nutrientInfo.unit = nutrient.nutrient.unitName;
                break; 
            }
        }
    }

    console.log('Final Nutrient Info:', nutrientInfo);
    return nutrientInfo;
}






function calculateCaloriesForPortionSize(portion, calories) {
    if (portion.gramWeight) {
        return (calories * portion.amount) ;
    } else {
        return calories; 
    }
}
 
 var totalConsumedCalories = 0; 

 
var consumedFoods = []; 


function addFoodToConsumption() {
    if (selectedFoodData) {
        var nutrientInfo = findNutrientInfo(selectedFoodData);
        var consumedCalories = parseFloat(nutrientInfo.value) || 0;
        var portionSize = parseFloat(document.getElementById('portionSize').value) || 1;
        var totalCaloriesWithPortion = calculateCaloriesForPortionSize({amount: portionSize}, consumedCalories);
        var existingFoodIndex = consumedFoods.findIndex(food => food.description === selectedFoodData.description);

        if (existingFoodIndex !== -1) {
            consumedFoods[existingFoodIndex].calories += totalCaloriesWithPortion;
            consumedFoods[existingFoodIndex].portionSize += portionSize;
        } else {
            consumedFoods.push({
                description: selectedFoodData.description,
                calories: totalCaloriesWithPortion,
                portionSize: portionSize
            });
        }

        totalConsumedCalories += totalCaloriesWithPortion * portionSize;

        // Update the total consumed calories display
        updateTotalCalories();

        // Update the consumed foods display
        displayConsumedFoods();
         
        updateRemainingCalories();

        // Calculate and display remaining calories
        compareCalories();

        // Update the chart with new data
        updateCaloriesChart();

        // Close the food details modal
        closeFoodDetailsModal();

    }
}



function openFoodDetailsModal() {
    document.getElementById('foodDetailsModal').style.display = 'block';
}

function closeFoodDetailsModal() {
    document.getElementById('foodDetailsModal').style.display = 'none';
}
function compareCalories(baseTDEE) {
    var remainingCaloriesElement = document.getElementById('remainingCalories');

    if (remainingCaloriesElement !== null) {
        var remainingCalories = baseTDEE - totalConsumedCalories;

        remainingCaloriesElement.innerHTML = 'Remaining Calories: ' + remainingCalories.toFixed(2);
    } else {
        console.error('The element with ID "remainingCalories" not found.');
    }
}

function updateTotalCalories() {
    var totalCalories = consumedFoods.reduce(function(total, food) {
        return total + (food.calories * food.portionSize);
    }, 0);

    document.getElementById('foodCalories').value = totalCalories.toFixed(2);
}


function displayConsumedFoods() {
    var consumedFoodsListElement = document.getElementById('consumedFoodsList');
    consumedFoodsListElement.innerHTML = '';

    for (var i = 0; i < consumedFoods.length; i++) {
        var foodItem = consumedFoods[i];
        var listItem = document.createElement('li');

        
        var listItemContainer = document.createElement('div');
        listItemContainer.classList.add('food-item-container');

        
        listItem.textContent = `${foodItem.description} - ${foodItem.calories * foodItem.portionSize} calories (Portion Size: ${foodItem.portionSize})`;

        
        var deleteButton = document.createElement('button');
        deleteButton.textContent = '-';
        deleteButton.classList.add('delete-button');

        
        deleteButton.addEventListener('click', createDeleteHandler(i));

        listItemContainer.appendChild(listItem);
        listItemContainer.appendChild(deleteButton);

        
        consumedFoodsListElement.appendChild(listItemContainer);
    }
}


function createDeleteHandler(index) {
    return function() {
        // Calculate the calories of the deleted item
        var deletedItemCalories = consumedFoods[index].calories * consumedFoods[index].portionSize;
        
        // Remove the food item from the consumedFoods array
        consumedFoods.splice(index, 1);
        
        // Update the display of consumed foods
        displayConsumedFoods();
        
        // Recalculate total consumed calories
        totalConsumedCalories -= deletedItemCalories;
        
        // Update the total consumed calories display
        updateTotalCalories();
        
        // Calculate and display remaining calories
        compareCalories();
        
        // Update the chart with new data
        updateCaloriesChart();
    };
}


function compareCalories(baseTDEE) {
    var remainingCaloriesElement = document.getElementById('remainingCalories');

    if (remainingCaloriesElement !== null) {
        baseTDEE = baseTDEE || 0;

        var remainingCalories = baseTDEE - totalConsumedCalories;
        
        remainingCaloriesElement.innerHTML = 'Remaining Calories: ' + remainingCalories.toFixed(2);
    } else {
        console.error('The element with ID "remainingCalories" not found.');
    }
}


updateCaloriesChart();

var color = d3.scaleOrdinal(d3.schemeCategory10);

function updateCaloriesChart() {
    var svg = d3.select("#caloriesChart");
    svg.selectAll("*").remove();

    var width = +svg.attr("width");
    var height = +svg.attr("height");
    var radius = Math.min(width, height) / 2;

    var g = svg.append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var data = consumedFoods.map(function (d) {
        return {
            description: d.description,
            calories: d.calories * d.portionSize
        };
    });

    var color = d3.scaleOrdinal()
        .domain(data.map(function(d) { return d.description; }))
        .range(["#4CAF50", "#FFC107", "#2196F3", "#FF5722", "#9C27B0", "#795548", "#00BCD4", "#FFEB3B", "#9E9E9E", "#FF9800"]);

    var pie = d3.pie()
        .value(function (d) { return d.calories; })
        .sort(null);

    var arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    var arcs = g.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", function (d) { return color(d.data.description); });

    arcs.append("text")
        .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; })
        .attr("dy", "0.35em")
        .text(function (d) { return d.data.description; });
}
function updateRemainingCalories() {
    var baseTDEE = parseFloat(document.getElementById('tdeeResult').innerText.split(' ')[2]);
    compareCalories(baseTDEE);
}
