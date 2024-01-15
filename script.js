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
            console.log('API Response:', data); // Log the response data

            if (data.foods && data.foods.length > 0) {
                var searchResults = data.foods.map(food => {
                    // Find the index of the "Energy" nutrient in the foodNutrients array
                    var energyIndex = food.foodNutrients.findIndex(nutrient => nutrient.nutrientName.toLowerCase().includes('energy'));

                    // Use the found index or provide a default value if not found
                    var energyValue = energyIndex !== -1 ? food.foodNutrients[energyIndex].value : 'N/A';

                    // Updated the onclick event to call the selectFood function
                    return `<div onclick="selectFood(${food.fdcId})">${food.description} - ${energyValue} calories</div>`;
                });

                document.getElementById('searchResults').innerHTML = 'Search Results:<br>' + searchResults.join('<br>');
            } else {
                var baseTDEE = calculateTDEEByActivityLevel(parseInt(document.getElementById('age').value), document.getElementById('activityLevel').value);
                var remainingCalories = baseTDEE;
                document.getElementById('searchResults').innerHTML = `No results found for the given query. You still need ${remainingCalories.toFixed(2)} calories for the day.`;
            }

            // Open the food details modal when search results are displayed
            openFoodDetailsModal();
        })
        .catch(error => {
            console.error('Error fetching data from the food search API:', error);
        });
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

            // Store the selected food data
            selectedFoodData = foodData;

            // Find the calories and other relevant details dynamically
            var caloriesInfo = findNutrientInfo(selectedFoodData);

            // Display the selected food details in the foodDetails div
            var foodDetailsHTML = `
            <h2>${foodData.description}</h2>
                <p>${caloriesInfo.label}: ${caloriesInfo.value} ${caloriesInfo.unit}</p>
                <!-- Add more details as needed -->
                <label for="portionSize">Portion Size(per100g):</label>
                <input type="text" id="portionSize" placeholder="Enter portion size">
                <button onclick="addFoodToConsumption()">Add to Consumption</button>
            `;
            document.getElementById('foodDetails').innerHTML = foodDetailsHTML;

            // Show the food details modal
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

    // Check if foodNutrients is present and has at least one element
    if (foodData.foodNutrients && foodData.foodNutrients.length > 0) {
        // Loop through foodNutrients to find the nutrient with the desired label ('Energy')
        for (var nutrient of foodData.foodNutrients) {
            console.log('Checking Nutrient:', nutrient);

            // Check for the correct nutrient (considering variations in name and case)
            if (nutrient.nutrient.number == "208") {
                console.log('Found Matching Nutrient:', nutrient);
                nutrientInfo.label=nutrient.nutrient.name;
                // Update the value and unit with the correct properties
                nutrientInfo.value = nutrient.amount;
                nutrientInfo.unit = nutrient.nutrient.unitName;
                break; // Exit the loop once the nutrient is found
            }
        }
    }

    console.log('Final Nutrient Info:', nutrientInfo);
    return nutrientInfo;
}





// Function to calculate calories based on portion size
function calculateCaloriesForPortionSize(portion, calories) {
    if (portion.gramWeight) {
        // Assuming 'calories' are per 100 grams, adjust based on portion size
        return (calories * portion.amount) ;
    } else {
        return calories; // No portion size information, keep the original value
    }
}
 // Add this line outside any function to initialize the variable
 var totalConsumedCalories = 0; 

 
var consumedFoods = []; // Assuming you have this array defined globally


function addFoodToConsumption() {
    if (selectedFoodData) {
        var nutrientInfo = findNutrientInfo(selectedFoodData);
        var consumedCalories = parseFloat(nutrientInfo.value) || 0;
        
        // Access the portion size from selectedFoodData (update this according to your actual data structure)
        var portionSize = parseFloat(document.getElementById('portionSize').value) || 1;

        // Calculate total consumed calories with portion size
        var totalCaloriesWithPortion = calculateCaloriesForPortionSize({amount: portionSize}, consumedCalories);

        // Update the total consumed calories
        totalConsumedCalories += totalCaloriesWithPortion;

        // Push the selected food data into the consumedFoods array with portion size
        consumedFoods.push({
            description: selectedFoodData.description,
            calories: totalCaloriesWithPortion,
            portionSize: portionSize
        });

        // Display the total consumed calories directly in the HTML
        updateTotalCalories();

        // Display the consumed foods
        displayConsumedFoods();

        // Calculate and display remaining calories
        compareCalories();

        // Close the food details modal
        closeFoodDetailsModal();
    }
}


function openFoodDetailsModal() {
    document.getElementById('foodDetailsModal').style.display = 'block';
}

// Function to close the food details modal
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
    document.getElementById('foodCalories').value = totalConsumedCalories.toFixed(2);
}
function displayConsumedFoods() {
    var consumedFoodsListElement = document.getElementById('consumedFoodsList');

    // Clear the existing content
    consumedFoodsListElement.innerHTML = '';

    // Loop through the consumedFoods array and create a list of consumed foods
    for (var i = 0; i < consumedFoods.length; i++) {
        var foodItem = consumedFoods[i];

        // Create a list item for each consumed food
        var listItem = document.createElement('li');
        listItem.textContent = `${foodItem.description} - ${foodItem.calories*foodItem.portionSize} calories (Portion Size: ${foodItem.portionSize})`;

        // Append the list item to the consumedFoodsListElement
        consumedFoodsListElement.appendChild(listItem);
    }
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

  