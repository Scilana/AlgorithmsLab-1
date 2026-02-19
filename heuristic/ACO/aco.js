/**
 * Standard Ant System (AS) Foraging Simulation
 * Based on: Dorigo, Maniezzo & Colorni (1996)
 * "Ant System: Optimization by a Colony of Cooperating Agents"
 *
 * Ant-cycle model adapted for grid-based foraging:
 *   - Transition probability: P_j = [tau_j]^alpha * [eta_j]^beta / SUM(...)
 *   - Pheromone evaporation:  tau(t+1) = (1 - rho) * tau(t)
 *   - Pheromone deposit:      delta_tau = Q / L  (after completing path)
 */
require("./lib/zepto.js");
require("./lib/grid.js");

var Ant = require("./entity/Ant.js");
var World = require("./entity/World.js");
var Position = require("./entity/Position.js");

(function() {

    function initGridBg() {
        var canvas = document.getElementById('gridBg');
        var ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        var opts = {
            distance: 20,
            lineWidth: 0.5,
            gridColor: "#fff",
            caption: false
        };
        new Grid(opts).draw(ctx);
    }

    function start() {
        var world;
        var antList = [];
        var isRun = false;
        var isSimulationStarted = false;
        var isSettingsApplied = false;

        function _run() {
            if (!isRun) {
                isRun = true;

                if (world && isSettingsApplied && isSimulationStarted) {
                    // Spawn ants up to configured count
                    while (antList.length < World.ANT_NUMBER) {
                        antList.push(new Ant(world));
                    }

                    // Multiple ant steps per tick to match evaporation timescale
                    // This is critical: without it, pheromone evaporates before
                    // ants can complete paths and the feedback loop never forms
                    for (var step = 0; step < World.stepsPerTick; step++) {
                        for (var i = 0; i < antList.length; i++) {
                            antList[i].move();
                        }
                    }

                    // Evaporate once per tick (after all steps), then render
                    world.evaporateAndRender();
                }

                isRun = false;
            }

            setTimeout(function() {
                _run();
            }, 100);
        }
        _run();

        // --- UI Event Handlers ---

        // Enter button: close welcome, show settings
        $("#enter").click(function() {
            $("#welcome").hide();
            $("#settingsPanel").show();
        });

        // Apply settings button
        $("#setBtn").click(function() {
            // Read AS parameters from UI
            World.alpha        = parseFloat($("#paramAlpha").val()) || 1;
            World.beta         = parseFloat($("#paramBeta").val()) || 2;
            World.rho          = parseFloat($("#paramRho").val()) || 0.02;
            World.Q            = parseFloat($("#paramQ").val()) || 100;
            World.tau0         = parseFloat($("#paramTau0").val()) || 0.01;
            World.ANT_NUMBER   = parseInt($("#paramAntNumber").val()) || 50;
            World.maxPathLength = parseInt($("#paramMaxSteps").val()) || 1500;
            World.maxPathLengthMax = parseInt($("#paramMaxStepsMax").val()) || 2000;
            World.stepsPerTick = parseInt($("#paramStepsPerTick").val()) || 5;

            // Pheromone visualization type
            var showType = $("#paramShowType").val();
            World.showPheromoneType = (showType === "home")
                ? Position.P_TYPE_HOME
                : Position.P_TYPE_FOOD;

            // Initialize world (after parameters are set)
            world = new World(window.innerWidth, window.innerHeight, 20);
            window.world = world;

            // Log parameters
            console.log("=== AS Parameters ===");
            console.log("alpha =", World.alpha);
            console.log("beta  =", World.beta);
            console.log("rho   =", World.rho);
            console.log("Q     =", World.Q);
            console.log("tau0  =", World.tau0);
            console.log("m     =", World.ANT_NUMBER);
            console.log("maxL  =", World.maxPathLength, "~", World.maxPathLengthMax);
            console.log("steps/tick =", World.stepsPerTick);

            // Hide settings, show start button
            $("#settingsPanel").hide();
            $("#startBtn").show();
            isSettingsApplied = true;
        });

        // Start simulation button
        $("#startBtn").click(function() {
            if (!isSettingsApplied) {
                alert("Please set parameters first!");
                return;
            }
            isSimulationStarted = true;
            $(this).hide();
        });
    }

    initGridBg();
    start();

})();
