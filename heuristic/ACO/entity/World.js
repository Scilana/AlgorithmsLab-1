/**
 * World - Grid environment with standard AS (Ant System) parameters
 * Based on: Dorigo, Maniezzo & Colorni (1996) "Ant System: Optimization
 * by a Colony of Cooperating Agents"
 */

var Position = require("./Position.js");

function World(width, height, distance) {
    this.map = [];
    this.width = width;
    this.height = height;
    this.distance = distance;
    this.checkList = [];       // cells that have been visited (for rendering)
    this.selectedPosition = null;
    this.xl = parseInt(width / distance);
    this.yl = parseInt(height / distance);
    this.homePosition = null;  // reference to home cell

    this._init();
}

// ========== Standard AS Parameters ==========

// Transition probability: P_j = [tau_j]^alpha * [eta_j]^beta / SUM(...)
World.alpha = 1;               // pheromone importance exponent (alpha >= 0)
World.beta = 2;                // heuristic importance exponent (beta >= 0)

// Pheromone update: tau(t+1) = (1 - rho) * tau(t) + delta_tau
World.rho = 0.02;             // evaporation rate (0 < rho < 1)

// Pheromone deposit: delta_tau = Q / L
World.Q = 100;                // pheromone deposit constant

// Base pheromone: small constant added to prevent zero probability
// Must be small relative to deposit (Q/L) to maintain signal contrast
World.tau0 = 0.01;            // initial / base pheromone level

// Simulation parameters
World.ANT_NUMBER = 50;        // number of ants (m)
World.maxPathLength = 500;    // max steps before ant resets
World.stepsPerTick = 5;       // ant steps per simulation tick

// Visualization
World.showPheromoneType = Position.P_TYPE_FOOD; // which pheromone to display

World.prototype._init = function() {
    // Build grid
    for (var i = 0; i < this.xl; i++) {
        this.map[i] = [];
        for (var j = 0; j < this.yl; j++) {
            this.map[i][j] = new Position(this, i, j);
        }
    }

    // Place home at center
    var homeX = parseInt(this.xl / 2);
    var homeY = parseInt(this.yl / 2);
    this.map[homeX][homeY] = new Position(this, homeX, homeY, 0, Number.MAX_VALUE, Position.TYPE_HOME);
    this.map[homeX][homeY].showHome();
    this.homePosition = this.map[homeX][homeY];

    // UI: click-to-place food/barrier
    var that = this;
    $("#selectPlane").click(function() {
        $("#innerSelectPlane").removeClass("scaleOutAnim");
        $("#selectPlane").css({ display: "none" });
    });
    $("#innerSelectPlane .food").click(function() {
        if (that.selectedPosition != null) {
            that.selectedPosition.changeType(Position.TYPE_FOOD);
        }
    });
    $("#innerSelectPlane .barrier").click(function() {
        if (that.selectedPosition != null) {
            that.selectedPosition.changeType(Position.TYPE_BARRIER);
        }
    });
};

/**
 * Show position selection popup
 */
World.prototype.clickPosition = function(position) {
    this.selectedPosition = position;
    var height = 30;
    var width = 60;
    var left = 0;
    var top = 0;
    if (position.y * 20 > height * 1.5) {
        top = position.y * 20 - height;
    } else {
        top = position.y * 20 + height;
    }
    if (position.x * 20 > width / 2) {
        left = position.x * 20 - width / 2 + 10;
    } else if ((this.xl - position.x) * 20 < width / 2) {
        left = position.x * 20 - width;
    } else {
        left = 0;
    }
    $("#selectPlane").css({ display: "block" });
    $("#innerSelectPlane").css({ top: top, left: left });
    $("#innerSelectPlane").addClass("scaleOutAnim");
};

/**
 * Register a cell as visited (for rendering optimization)
 */
World.prototype.addCheckList = function(position) {
    var idx = this._getCheckedIndex(position);
    if (idx >= 0) {
        this.checkList.splice(idx, 1);
    }
    this.checkList.push(position);
};

World.prototype._getCheckedIndex = function(position) {
    for (var i = 0; i < this.checkList.length; i++) {
        if (position === this.checkList[i]) { return i; }
    }
    return -1;
};

/**
 * Standard AS evaporation: tau = (1 - rho) * tau
 * Applied to all visited cells, then render pheromone visualization
 */
World.prototype.evaporateAndRender = function() {
    var maxP = 0;
    for (var i = 0; i < this.checkList.length; i++) {
        var pos = this.checkList[i];
        // Evaporate
        pos.evaporatePheromone(World.rho);
        // Track max for visualization normalization
        var p = pos.getP(World.showPheromoneType);
        if (pos.type === Position.TYPE_NORMAL && p > maxP) {
            maxP = p;
        }
    }
    // Render pheromone with dynamic max normalization
    var renderMax = maxP > 0 ? maxP : 1;
    for (var i = 0; i < this.checkList.length; i++) {
        this.checkList[i].showPheromone(renderMax, World.showPheromoneType);
    }
};

module.exports = World;
