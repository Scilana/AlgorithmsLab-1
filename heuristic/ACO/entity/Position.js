/**
 * Position - Grid cell with dual pheromone support
 * Standard AS model: multiplicative evaporation tau = (1 - rho) * tau
 */

function Position(world, x, y, fp, hp, type) {
    this._world = world;
    this.x = x;
    this.y = y;
    this.pheromone = [];
    this.type = type;
    this.dom;

    this.pheromone[Position.P_TYPE_FOOD] = (fp != null) ? fp : 0;
    this.pheromone[Position.P_TYPE_HOME] = (hp != null) ? hp : 0;

    if (this.type == null) {
        this.type = Position.TYPE_NORMAL;
    }
    this._init();
}

// Cell types
Position.TYPE_HOME = 2;
Position.TYPE_FOOD = 1;
Position.TYPE_NORMAL = 0;
Position.TYPE_BARRIER = -1;

// Pheromone types
Position.P_TYPE_FOOD = 1001;
Position.P_TYPE_HOME = 1002;

Position.prototype._init = function() {
    this.dom = $('<div></div>');
    this.dom.css({
        left: this.x * 20,
        top: this.y * 20
    });
    $("body").append(this.dom);
    this.dom.addClass("normal");
    var that = this;
    $(this.dom).click(function() {
        console.log(
            "Cell (" + that.x + "," + that.y + ")",
            "food_tau=" + that.pheromone[Position.P_TYPE_FOOD].toFixed(3),
            "home_tau=" + that.pheromone[Position.P_TYPE_HOME].toFixed(3)
        );
        that._world.clickPosition(that);
    });
};

/**
 * Get pheromone value of given type
 */
Position.prototype.getP = function(pType) {
    return this.pheromone[pType];
};

/**
 * Move in a direction on the map grid
 */
Position.prototype.move = function(direction, map, deep) {
    if (deep == null) { deep = 1; }
    var x = this.x + direction[0] * deep;
    var y = this.y + direction[1] * deep;
    if (x < 0 || y < 0 || x >= map.length || y >= map[0].length) {
        return null;
    }
    return map[x][y];
};

/**
 * Standard AS multiplicative evaporation: tau = (1 - rho) * tau
 * Applied to both pheromone types
 * @param {number} rho - evaporation rate (0 < rho < 1)
 */
Position.prototype.evaporatePheromone = function(rho) {
    if (this.type === Position.TYPE_NORMAL) {
        this.pheromone[Position.P_TYPE_FOOD] *= (1 - rho);
        this.pheromone[Position.P_TYPE_HOME] *= (1 - rho);
        // Clamp to avoid floating point noise
        if (this.pheromone[Position.P_TYPE_FOOD] < 1e-10) {
            this.pheromone[Position.P_TYPE_FOOD] = 0;
        }
        if (this.pheromone[Position.P_TYPE_HOME] < 1e-10) {
            this.pheromone[Position.P_TYPE_HOME] = 0;
        }
    }
};

/**
 * Add pheromone (ant-cycle deposit: called after ant completes a path)
 * @param {number} amount - delta tau = Q / L
 * @param {number} pType - pheromone type (P_TYPE_FOOD or P_TYPE_HOME)
 */
Position.prototype.addPheromone = function(amount, pType) {
    if (this.type === Position.TYPE_NORMAL) {
        this.pheromone[pType] += amount;
    }
};

/**
 * Render pheromone intensity as opacity on DOM
 */
Position.prototype.showPheromone = function(maxVal, showType) {
    if (this.type === Position.TYPE_NORMAL) {
        var p = this.pheromone[showType];
        var a = (maxVal > 0) ? (p / maxVal) : 0;
        if (a > 1) { a = 1; }
        if (a < 0) { a = 0; }
        this.dom.addClass("pheromone");
        this.dom.css({ "opacity": a });
    }
};

// --- Type change methods (for UI food/barrier placement) ---

Position.prototype.changeType = function(type) {
    if (this.type === Position.TYPE_BARRIER) { this.dom.removeClass("barrier"); }
    if (this.type === Position.TYPE_HOME) { this.dom.removeClass("home"); }
    if (this.type === Position.TYPE_FOOD) { this.dom.removeClass("food"); }
    this.type = type;
    this.dom.removeClass("pheromone");
    this.dom.css({ "opacity": 1 });
    if (type === Position.TYPE_BARRIER) {
        this.pheromone[Position.P_TYPE_FOOD] = 0;
        this.pheromone[Position.P_TYPE_HOME] = 0;
        this.showBarrier();
    }
    if (type === Position.TYPE_FOOD) {
        this.pheromone[Position.P_TYPE_FOOD] = Number.MAX_VALUE;
        this.pheromone[Position.P_TYPE_HOME] = 0;
        this.showFood();
    }
};

Position.prototype.showBarrier = function() {
    if (this.type === Position.TYPE_BARRIER) { this.dom.addClass("barrier"); }
};

Position.prototype.showFood = function() {
    if (this.type === Position.TYPE_FOOD) { this.dom.addClass("food"); }
};

Position.prototype.showHome = function() {
    if (this.type === Position.TYPE_HOME) { this.dom.addClass("home"); }
};

module.exports = Position;
