let data = null;

// IMAGE HANDLING START
const imageFolder = 'resources/';
const imageList = [];
for (let i = 1; i <= 115; i++) {
    imageList.push(`image${i}.jpg`);
}

function changeBackground() {
    const randomIndex = Math.floor(Math.random() * imageList.length);
    const newBackground = `url(${imageFolder + imageList[randomIndex]})`;
    document.querySelector('html').style.background = newBackground;
}

function onGenerateButtonClick() {
    const benchPress = parseInt(document.getElementById('benchPressInput').value);
    const squat = parseInt(document.getElementById('squatInput').value);
    const deadlift = parseInt(document.getElementById('deadliftInput').value);
    const overheadPress = parseInt(document.getElementById('overheadPressInput').value);

    if (isNaN(benchPress) || isNaN(squat) || isNaN(deadlift) || isNaN(overheadPress)) {
        alert("Please enter valid numbers for all lifts.");
        return;
    }

    // Range validation
    if (benchPress <= 0 || squat <= 0 || deadlift <= 0 || overheadPress <= 0) {
        alert("All lift values must be greater than zero.");
        return;
    }

    if (benchPress > 999 || squat > 999 || deadlift > 999 || overheadPress > 999) {
        alert("Please enter realistic values (under 1000 lbs).");
        return;
    }

    data = {
        benchPress: benchPress,
        squat: squat,
        deadlift: deadlift,
        overheadPress: overheadPress
    };

    updateTables();
}

function exportData() {
    if (data === null) {
        alert("No data to export. Please enter your lift values first.");
        return;
    }

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'lift_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.addEventListener('load', changeBackground);
// IMAGE HANDLING END


function loadFile(event) {
    let file = event.target.files[0];
    let reader = new FileReader();
    reader.onload = function (event) {
        try {
            data = JSON.parse(event.target.result);
            updateTables();
        } catch (e) {
            alert("Error: Invalid file format. Please choose a valid JSON file.");
        }
    };
    reader.onerror = function () {
        alert("Error: Unable to read file. Please try again.");
    };
    reader.readAsText(file);
}

function updateTables() {
    if (data === null) {
        return;
    }

    clearTableCaptions();

    populateTable("benchPressTable", data.benchPress);
    document.getElementById("benchCaption").innerHTML += " (Max: " + data.benchPress + " / ";
    document.getElementById("benchCaption").innerHTML += " Training Max: ~" + (data.benchPress * 0.9) + ")";

    populateTable("squatTable", data.squat);
    document.getElementById("squatCaption").innerHTML += " (Max: " + data.squat + " / ";
    document.getElementById("squatCaption").innerHTML += " Training Max: ~" + (data.squat * 0.9) + ")";

    populateTable("deadliftTable", data.deadlift);
    document.getElementById("deadLiftCaption").innerHTML += " (Max: " + data.deadlift + " / ";
    document.getElementById("deadLiftCaption").innerHTML += " Training Max: ~" + (data.deadlift * 0.9) + ")";

    populateTable("overheadPressTable", data.overheadPress);
    document.getElementById("overHeadPressCaption").innerHTML += " (Max: " + data.overheadPress + " / ";
    document.getElementById("overHeadPressCaption").innerHTML += " Training Max: ~" + (data.overheadPress * 0.9) + ")";
}

function clearTableCaptions() {
    document.getElementById("benchCaption").innerHTML = "Bench";
    document.getElementById("squatCaption").innerHTML = "Squat";
    document.getElementById("deadLiftCaption").innerHTML = "Deadlift";
    document.getElementById("overHeadPressCaption").innerHTML = "Overhead Press";
}

function populateTable(tableId, max) {
    let trainingMax = max * 0.9;
    // let trainingMax = max;
    let table = document.getElementById(tableId);

    table.addEventListener('click', function (event) {
        let target = event.target;
        if (target.tagName === 'TD') {
            if (target.style.backgroundColor === 'rgb(82, 110, 58)') {
                target.style.backgroundColor = '';
            } else {
                target.style.backgroundColor = 'rgb(82, 110, 58)';
            }
        }
    });
    // Clear existing rows
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    for (let week = 1; week <= 5; week++) {
        let row = table.insertRow(-1);
        let weekCell = row.insertCell(0);

        if (week != 5) {
            weekCell.innerHTML = "Week " + week;
        } else if (week == 5) {
            weekCell.innerHTML = "Hypertrophy"
        }

        if (week == 1) {
            addSet(row, trainingMax, 0.35, 5);
            addSet(row, trainingMax, 0.45, 5);
            addSet(row, trainingMax, 0.55, 3);
            addSet(row, trainingMax, 0.65, 5);
            addSet(row, trainingMax, 0.75, 5);
            addSet(row, trainingMax, 0.85, 5);
            addSet(row, trainingMax, 0.55, 10);
        } else if (week == 2) {
            addSet(row, trainingMax, 0.35, 5);
            addSet(row, trainingMax, 0.45, 5);
            addSet(row, trainingMax, 0.55, 3);
            addSet(row, trainingMax, 0.7, 3);
            addSet(row, trainingMax, 0.8, 3);
            addSet(row, trainingMax, 0.9, 3);
            addSet(row, trainingMax, 0.55, 10);
        } else if (week == 3) {
            addSet(row, trainingMax, 0.35, 5);
            addSet(row, trainingMax, 0.45, 5);
            addSet(row, trainingMax, 0.55, 3);
            addSet(row, trainingMax, 0.75, 5);
            addSet(row, trainingMax, 0.85, 3);
            addSet(row, trainingMax, 0.95, 1);
            addSet(row, trainingMax, 0.55, 10);
        } else if (week == 4) {
            addSet(row, trainingMax, 0.5, 10);
            addSet(row, trainingMax, 0.6, 10);
            addSet(row, trainingMax, 0.7, 10);
        } else if (week == 5) {
            addSet(row, trainingMax, 0.35, 5);
            addSet(row, trainingMax, 0.45, 5);
            addSet(row, trainingMax, 0.7, 10);
            addSet(row, trainingMax, 0.75, 10);
            addSet(row, trainingMax, 0.80, 10);
        }
    }
}

function addSet(row, trainingMax, percentageOfTrainingMax, reps) {
    // Generate the cell's text...
    let setCell = row.insertCell(-1);
    setCell.classList.add("cell-tooltip"); // Add a unique class to the setCell element...
    let weight = roundToNearest5(trainingMax * percentageOfTrainingMax);
    setCell.innerHTML = `(${Math.trunc(percentageOfTrainingMax * 100)}%) ${weight} x ${reps}`;

    // Build the tooltip text that appears when the cursor is
    // hovered above a table's cell.
    let barWeight = 45;
    let plates = calculatePlates((weight - barWeight) / 2);
    let tooltipText = plates.map(p => p + " lbs").join(" + ");
    setCell.setAttribute("data-title", tooltipText);
}

function roundToNearest5(x) {
    return Math.round(x / 5) * 5;
}

// To be used if an unlimited amount of 45lb plates is available...

function calculatePlates(weight) {
    let plates = [45, 35, 25, 10, 5, 2.5];
    let result = [];
    for (let i = 0; i < plates.length; i++) {
        while (weight >= plates[i]) {
            result.push(plates[i]);
            weight -= plates[i];
        }
    }
    return result;
}


/*
// To be used in our current gym setup... yikes
function calculatePlates(weight) {
    let plates = [45, 35, 25, 15, 10, 5, 2.5];
    let result = [];
    let count45 = 0;
    let count35 = 0;
    let count25 = 0;
    let count15 = 0;
    let count10 = 0;
    let count5 = 0;
    let count2_5 = 0;
    for (let i = 0; i < plates.length; i++) {
        while (weight >= plates[i]) {
            if (plates[i] === 45 && count45 === 3) {
                break;
            }
            if (plates[i] === 35 && count35 === 1) {
                break;
            }
            if (plates[i] === 25 && count25 === 1) {
                break;
            }
            if (plates[i] === 15 && count15 === 1) {
                break;
            }
            if (plates[i] === 10 && count10 === 1) {
                break;
            }
            if (plates[i] === 5 && count5 === 1) {
                break;
            }
            if (plates[i] === 2.5 && count2_5 === 1) {
                break;
            }
            result.push(plates[i]);
            weight -= plates[i];
            if (plates[i] === 45) {
                count45++;
            }
            if (plates[i] === 35) {
                count35++;
            }
            if (plates[i] === 25) {
                count25++;
            }
            if (plates[i] === 15) {
                count15++;
            }
            if (plates[i] === 10) {
                count10++;
            }
            if (plates[i] === 5) {
                count5++;
            }
            if (plates[i] === 2.5) {
                count2_5++;
            }
        }
    }
    return result;
}
*/

// Function to calculate one rep max using Epley formula...
function calculateOneRepMax(weight, reps) {
    const oneRepMax = weight * (1 + 0.0333 * reps);

    // Remove any decimal points
    return Math.trunc((oneRepMax / 5) * 5);
}

// Function to handle "Calculate One Rep Max" button click
function onCalculateButtonClick() {
    // Get user input for weight lifted and reps performed
    const weight = parseInt(document.querySelector('#weight').value);
    const reps = parseInt(document.querySelector('#reps').value);

    // Calculate one rep max
    const oneRepMax = calculateOneRepMax(weight, reps);

    // Display result in text field
    document.querySelector('#oneRepMaxFinal').textContent = oneRepMax;
}

// Calculate reps Needed to Hit Target 1RM (Epley formula)...
function onRepsNeededClick() {
    const weightEl = document.getElementById('loadedWeight');
    const targetEl = document.getElementById('target1rm');
    const outEl = document.getElementById('repsNeededOutput');
    const noteEl = document.getElementById('repsNeededNote');

    const w = Number(weightEl.value);
    const t = Number(targetEl.value);

    // Reset output
    outEl.textContent = '';
    noteEl.textContent = '';

    if (!Number.isFinite(w) || !Number.isFinite(t) || w <= 0 || t <= 0) {
        outEl.textContent = '—';
        noteEl.textContent = 'Enter positive numbers for both fields.';
        return;
    }

    // If the target is less than or equal to what's on the bar, 1 rep qualifies (Epley gives 1RM >= weight)
    if (t <= w) {
        outEl.textContent = '1';
        noteEl.textContent = 'One solid rep at this load already puts your estimated 1RM at or above target.';
        return;
    }

    // Epley inversion: 1RM = w * (1 + r/30)  =>  r = 30*(1RM/w - 1)
    const rawReps = 30 * (t / w - 1);

    // We want "equal or slightly over", so round up to the next whole rep
    let reps = Math.ceil(rawReps);

    // Guard rails
    if (reps < 1) reps = 1;
    if (reps > 20) reps = 20; // beyond ~10-12 reps, 1RM estimates get noisy; cap for sanity

    outEl.textContent = String(reps);

    // Helpful notes about reliability...
    if (reps >= 13 && reps <= 20) {
        noteEl.textContent = 'Note: estimates above ~12 reps are less reliable. Consider increasing the load if practical.';
    } else if (reps <= 3) {
        noteEl.textContent = 'Low-rep estimate—good accuracy. Warm up properly and keep technique tight.';
    }
}

// Enter to trigger calculation inside the form...
(function attachRepsNeededEnterHandler() {
    const form = document.getElementById('repsNeededSection');
    if (!form) return;
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onRepsNeededClick();
        }
    });
})();

// Enter to trigger 1RM calculation inside the Calculate 1RM section...
(function attachOneRepMaxEnterHandler() {
    const form = document.getElementById('oneRepMaxSection');
    if (!form) return;
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onCalculateButtonClick();
        }
    });
})();
