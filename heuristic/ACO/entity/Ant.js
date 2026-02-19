/**
 * Ant - Standard AS (Ant System) ant-cycle algorithm for grid foraging
 *
 * Mathematical model (Dorigo et al., 1996):
 *   Transition probability:  P_j = [tau_j]^alpha * [eta_j]^beta / SUM_l([tau_l]^alpha * [eta_l]^beta)
 *   Pheromone deposit:       delta_tau = Q / L  (ant-cycle, deposit after completing path)
 *   Pheromone evaporation:   tau(t+1) = (1 - rho) * tau(t)  (handled by World)
 *
 * Foraging adaptation:
 *   - FIND_FOOD phase: follow food pheromone (tau = food_pheromone), eta = 1
 *   - CARRY_FOOD phase: follow home pheromone (tau = home_pheromone), eta = 1/d_home
 *   - Tabu list: positions already in current path are forbidden
 *   - Deposit timing: ant-cycle model - deposit Q/L on entire path upon reaching destination
 */

var World = require("./World.js");
var Position = require("./Position.js");
var Direction = require("./Direction.js");

function Ant(world) {
    this._world = world;
    this.path = [];            // current path (list of Position references)
    this.status = null;        // FIND_FOOD or CARRY_FOOD
    this.homePosition = null;  // home cell reference
    this.dom = null;

    this._init();
}

// Ant states
Ant.STATUS_FIND_FOOD = 0;   // searching for food
Ant.STATUS_CARRY_FOOD = 1;  // carrying food back to home

/**
 * Roulette wheel selection (standard stochastic universal sampling)
 * @param {number[]} probs - normalized probability array (sums to 1)
 * @returns {number} selected index
 */
Ant.rouletteWheel = function(probs) {
    var r = Math.random();
    var cumulative = 0;
    for (var i = 0; i < probs.length; i++) {
        cumulative += probs[i];
        if (r <= cumulative) {
            return i;
        }
    }
    return probs.length - 1;
};

/**
 * Initialize / reset ant to home position
 */
Ant.prototype._init = function() {
    this.path = [];
    this.status = Ant.STATUS_FIND_FOOD;
    this.homePosition = this._world.homePosition;
    this.path.push(this.homePosition);

    // Random max path length per ant to stagger resets
    var min = World.maxPathLength;
    var max = World.maxPathLengthMax;
    this._maxPath = min + Math.floor(Math.random() * (max - min + 1));

    if (!this.dom) {
        this.dom = $('<div></div>');
        $("body").append(this.dom);
        this.dom.addClass("ant");
    }
    this.dom.removeClass("green");
    this._updateDom();
};

/**
 * Update DOM position to current cell
 */
Ant.prototype._updateDom = function() {
    var pos = this.path[this.path.length - 1];
    this.dom.css({
        left: pos.x * this._world.distance,
        top: pos.y * this._world.distance
    });
};

/**
 * Get all valid (non-null, non-barrier) neighboring positions
 */
Ant.prototype._getNeighbors = function(position) {
    var neighbors = [];
    for (var i = 0; i < Direction.M.length; i++) {
        var np = position.move(Direction.M[i], this._world.map);
        if (np !== null && np.type !== Position.TYPE_BARRIER) {
            neighbors.push(np);
        }
    }
    return neighbors;
};

/**
 * Check if position is in current path (tabu list)
 */
Ant.prototype._isInPath = function(position) {
    for (var i = 0; i < this.path.length; i++) {
        if (this.path[i] === position) return true;
    }
    return false;
};

/**
 * Standard AS transition probability selection
 *
 * P_j = [tau_j]^alpha * [eta_j]^beta / SUM_l([tau_l]^alpha * [eta_l]^beta)
 *
 * - FIND_FOOD: tau = food pheromone + tau0, eta = 1
 * - CARRY_FOOD: tau = home pheromone + tau0, eta = 1 / distance_to_home
 *
 * @param {Position} current - current position
 * @returns {Position|null} selected next position
 */
Ant.prototype._selectNext = function(current) {
    var neighbors = this._getNeighbors(current);
    if (neighbors.length === 0) return null;

    // --- Tabu filtering (AS tabu list: don't revisit path positions) ---
    var allowed = [];
    for (var i = 0; i < neighbors.length; i++) {
        if (!this._isInPath(neighbors[i])) {
            allowed.push(neighbors[i]);
        }
    }
    // Deadlock escape: if all neighbors are tabu, allow all
    if (allowed.length === 0) {
        allowed = neighbors;
    }

    // --- Compute transition probabilities ---
    var alpha = World.alpha;
    var beta = World.beta;
    var tau0 = World.tau0;
    var values = [];
    var sum = 0;

    for (var i = 0; i < allowed.length; i++) {
        var tau, eta;

        if (this.status === Ant.STATUS_FIND_FOOD) {
            // Follow food pheromone to find food
            tau = allowed[i].getP(Position.P_TYPE_FOOD) + tau0;
            // No heuristic for food search (food location unknown)
            eta = 1;
        } else {
            // Follow home pheromone to return home
            tau = allowed[i].getP(Position.P_TYPE_HOME) + tau0;
            // Heuristic: inverse distance to home (visibility, like 1/d_ij in AS)
            var dx = allowed[i].x - this.homePosition.x;
            var dy = allowed[i].y - this.homePosition.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            eta = (dist > 0) ? (1.0 / dist) : 100;
        }

        // Standard AS formula: [tau]^alpha * [eta]^beta
        var val = Math.pow(tau, alpha) * Math.pow(eta, beta);
        values.push(val);
        sum += val;
    }

    // Normalize to probability distribution
    if (sum > 0) {
        for (var i = 0; i < values.length; i++) {
            values[i] /= sum;
        }
    } else {
        // Uniform random (fallback)
        for (var i = 0; i < values.length; i++) {
            values[i] = 1.0 / values.length;
        }
    }

    var idx = Ant.rouletteWheel(values);
    return allowed[idx];
};

/**
 * Ant-cycle pheromone deposit: deposit Q/L on entire path
 * Called AFTER ant completes a full path (home->food or food->home)
 *
 * @param {number} pType - pheromone type to deposit
 *   FIND_FOOD deposits P_TYPE_FOOD (guides others to food)
 *   CARRY_FOOD deposits P_TYPE_HOME (guides others to home)
 */
Ant.prototype._depositPheromone = function(pType) {
    var L = this.path.length;
    if (L <= 1) return;

    var deltaTau = World.Q / L;

    for (var i = 0; i < L; i++) {
        this.path[i].addPheromone(deltaTau, pType);
        // Register cell for rendering
        this._world.addCheckList(this.path[i]);
    }
};

/**
 * One step of ant movement (called each tick)
 */
Ant.prototype.move = function() {
    var current = this.path[this.path.length - 1];
    var next = this._selectNext(current);

    // No valid move: reset
    if (!next) {
        this._init();
        return;
    }

    // --- State transitions ---

    if (next.type === Position.TYPE_FOOD && this.status === Ant.STATUS_FIND_FOOD) {
        // Found food! Complete home->food path
        this.path.push(next);
        // Ant-cycle deposit: food pheromone on entire path (guides others to food)
        this._depositPheromone(Position.P_TYPE_FOOD);
        // Switch to carry mode, start new path from food
        this.status = Ant.STATUS_CARRY_FOOD;
        this.path = [next];
        this.dom.addClass("green");

    } else if (next.type === Position.TYPE_HOME && this.status === Ant.STATUS_CARRY_FOOD) {
        // Returned home with food! Complete food->home path
        this.path.push(next);
        // Ant-cycle deposit: home pheromone on entire path (guides others home)
        this._depositPheromone(Position.P_TYPE_HOME);
        // Reset: start new foraging trip
        this._init();

    } else {
        // Normal movement
        this.path.push(next);
        this._world.addCheckList(next);
    }

    // Path length limit: prevent infinite wandering (per-ant random threshold)
    if (this.path.length > this._maxPath) {
        this._init();
        return;
    }

    this._updateDom();
};

module.exports = Ant;
